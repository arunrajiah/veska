import type { Job } from 'bullmq';
import type {
  Database,
  QueueService,
  AnthropicProvider,
  AuditService,
  MagicLinkService,
} from '@veska/core';
import {
  schema,
  SlackChannelAdapter,
  resolveSlackIdentity,
  ActionAgent,
} from '@veska/core';
import { eq } from 'drizzle-orm';
import type { InboundMessageJob } from '@veska/core';
import type { SlackAppManager } from './slack-app.js';

export function registerMessageWorker(
  queueService: QueueService,
  db: Database,
  llm: AnthropicProvider,
  auditService: AuditService,
  magicLinkService: MagicLinkService,
  slackManager: SlackAppManager,
): void {
  const actionAgent = new ActionAgent(db, llm, auditService, magicLinkService);

  queueService.registerWorker<'process.inbound_message'>(
    'process',
    async (job: Job<InboundMessageJob>) => {
      const { tenantId, channelName, rawMessage } = job.data;

      if (channelName !== 'slack') return;

      const raw = rawMessage as {
        tenantId: string;
        event?: Record<string, unknown>;
        resolvedIdentityId?: string;
        confirmationResponse?: string;
      };

      if (!raw.event) return;

      // Parse the inbound message
      const adapter = slackManager.getAdapter();
      const inbound = await adapter.parseInbound(raw);
      inbound.senderIdentityId = raw.resolvedIdentityId;

      if (!inbound.senderIdentityId) {
        inbound.senderIdentityId = await resolveSlackIdentity(db, inbound);
      }

      // Load the identity
      const identity = await db.query.identities.findFirst({
        where: eq(schema.identities.id, inbound.senderIdentityId),
      });

      if (!identity) {
        console.warn(`[Worker] No identity found for ${inbound.senderIdentityId}`);
        return;
      }

      // Run the action agent
      const result = await actionAgent.process(inbound, identity as import('@veska/core').Identity);

      // Send the response back via Slack
      const channelConfig = await db.query.channelConfigs.findFirst({
        where: eq(schema.channelConfigs.tenantId, tenantId),
      });

      if (channelConfig) {
        const slackChannelId = raw.event['channel'] as string | undefined;
        if (slackChannelId) {
          await adapter.send(tenantId, slackChannelId, result.response, channelConfig);
        }
      }
    },
    10,
  );
}
