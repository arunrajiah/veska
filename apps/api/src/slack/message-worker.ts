import type { Job } from 'bullmq';
import type {
  Database,
  QueueService,
  LLMProvider,
  AuditService,
  MagicLinkService,
} from '@veska/core';
import {
  schema,
  SlackChannelAdapter,
  resolveSlackIdentity,
  ActionAgent,
  EmailChannelAdapter,
  resolveEmailIdentity,
  WhatsAppChannelAdapter,
  resolveWhatsAppIdentity,
  TelegramChannelAdapter,
  resolveTelegramIdentity,
  type EmailChannelConfig,
  type WhatsAppChannelConfig,
  type TelegramChannelConfig,
} from '@veska/core';
import { and, eq } from 'drizzle-orm';
import type { InboundMessageJob } from '@veska/core';
import type { SlackAppManager } from './slack-app.js';

export function registerMessageWorker(
  queueService: QueueService,
  db: Database,
  llm: LLMProvider,
  auditService: AuditService,
  magicLinkService: MagicLinkService,
  slackManager: SlackAppManager,
): void {
  const actionAgent = new ActionAgent(db, llm, auditService, magicLinkService);

  queueService.registerWorker<'process.inbound_message'>(
    'process',
    async (job: Job<InboundMessageJob>) => {
      const { tenantId, channelName, rawMessage } = job.data;

      // ── Slack ──────────────────────────────────────────────────
      if (channelName === 'slack') {
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
            await adapter.send(tenantId, slackChannelId, result.response, channelConfig as import('@veska/core').ChannelConfig);
          }
        }
        return;
      }

      // ── Email ──────────────────────────────────────────────────
      if (channelName === 'email') {
        const channelConfig = await db.query.channelConfigs.findFirst({
          where: and(
            eq(schema.channelConfigs.tenantId, tenantId),
            eq(schema.channelConfigs.channelName, channelName),
          ),
        });

        if (!channelConfig) {
          console.warn(`[Worker] No channel config found for tenant=${tenantId} channel=email`);
          return;
        }

        const adapter = new EmailChannelAdapter(
          JSON.parse(channelConfig.credentialsRef) as EmailChannelConfig,
        );
        const inbound = await adapter.parseInbound(rawMessage);

        const emailIdentity = await resolveEmailIdentity(db, inbound.tenantId, inbound.senderChannelId);
        inbound.senderIdentityId = emailIdentity.id;

        const identity = await db.query.identities.findFirst({
          where: eq(schema.identities.id, emailIdentity.id),
        });

        if (!identity) {
          console.warn(`[Worker] No identity found for ${emailIdentity.id}`);
          return;
        }

        const result = await actionAgent.process(inbound, identity as import('@veska/core').Identity);

        await adapter.send(tenantId, inbound.senderChannelId, result.response, channelConfig as import('@veska/core').ChannelConfig);
        return;
      }

      // ── WhatsApp ───────────────────────────────────────────────
      if (channelName === 'whatsapp') {
        const channelConfig = await db.query.channelConfigs.findFirst({
          where: and(
            eq(schema.channelConfigs.tenantId, tenantId),
            eq(schema.channelConfigs.channelName, channelName),
          ),
        });

        if (!channelConfig) {
          console.warn(`[Worker] No channel config found for tenant=${tenantId} channel=whatsapp`);
          return;
        }

        const adapter = new WhatsAppChannelAdapter(
          JSON.parse(channelConfig.credentialsRef) as WhatsAppChannelConfig,
        );
        const inbound = await adapter.parseInbound(rawMessage);

        const whatsappIdentity = await resolveWhatsAppIdentity(db, inbound.tenantId, inbound.senderChannelId);
        inbound.senderIdentityId = whatsappIdentity.id;

        const identity = await db.query.identities.findFirst({
          where: eq(schema.identities.id, whatsappIdentity.id),
        });

        if (!identity) {
          console.warn(`[Worker] No identity found for ${whatsappIdentity.id}`);
          return;
        }

        const result = await actionAgent.process(inbound, identity as import('@veska/core').Identity);

        await adapter.send(tenantId, inbound.senderChannelId, result.response, channelConfig as import('@veska/core').ChannelConfig);
        return;
      }

      // ── Telegram ───────────────────────────────────────────────
      if (channelName === 'telegram') {
        const channelConfig = await db.query.channelConfigs.findFirst({
          where: and(
            eq(schema.channelConfigs.tenantId, tenantId),
            eq(schema.channelConfigs.channelName, channelName),
          ),
        });

        if (!channelConfig) {
          console.warn(`[Worker] No channel config found for tenant=${tenantId} channel=telegram`);
          return;
        }

        const adapter = new TelegramChannelAdapter(
          JSON.parse(channelConfig.credentialsRef) as TelegramChannelConfig,
        );
        const inbound = await adapter.parseInbound(rawMessage);

        const telegramIdentity = await resolveTelegramIdentity(db, inbound.tenantId, inbound.senderChannelId);
        inbound.senderIdentityId = telegramIdentity.id;

        const identity = await db.query.identities.findFirst({
          where: eq(schema.identities.id, telegramIdentity.id),
        });

        if (!identity) {
          console.warn(`[Worker] No identity found for ${telegramIdentity.id}`);
          return;
        }

        const result = await actionAgent.process(inbound, identity as import('@veska/core').Identity);

        await adapter.send(tenantId, inbound.senderChannelId, result.response, channelConfig as import('@veska/core').ChannelConfig);
        return;
      }

      console.warn(`[Worker] Unhandled channel: ${channelName}`);
    },
    10,
  );
}
