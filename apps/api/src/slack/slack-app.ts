import { App, type AppOptions } from '@slack/bolt';
import type { Database, LLMProvider } from '@veska/core';
import { schema, SlackChannelAdapter, resolveSlackIdentity, ActionAgent, AuditService, MagicLinkService } from '@veska/core';
import { eq, and } from 'drizzle-orm';
import type { QueueService } from '@veska/core';

// Re-export for convenience
export type { App };

export interface SlackAppManagerConfig {
  db: Database;
  queueService: QueueService;
  llm: LLMProvider;
  magicLinkService: MagicLinkService;
  auditService: AuditService;
}

/**
 * Manages one Slack App instance per tenant.
 * Each tenant has its own bot token obtained through OAuth.
 */
export class SlackAppManager {
  private apps = new Map<string, App>();
  private adapter = new SlackChannelAdapter();

  constructor(private config: SlackAppManagerConfig) {}

  /**
   * Connect a tenant's Slack workspace using stored credentials.
   */
  async connectTenant(tenantId: string): Promise<void> {
    const channelConfig = await this.config.db.query.channelConfigs.findFirst({
      where: and(
        eq(schema.channelConfigs.tenantId, tenantId),
        eq(schema.channelConfigs.channelName, 'slack'),
      ),
    });

    if (!channelConfig?.enabled) return;

    // Credentials are stored encrypted; here we assume they've been decrypted upstream
    // In production: call a vault service to decrypt credentialsRef
    const credentials = channelConfig.metadata as {
      botToken?: string;
      signingSecret?: string;
      appToken?: string;
    };

    if (!credentials.botToken || !credentials.signingSecret) return;

    const appOptions: AppOptions = {
      token: credentials.botToken,
      signingSecret: credentials.signingSecret,
      ...(credentials.appToken
        ? { socketMode: true, appToken: credentials.appToken }
        : {}),
    };

    const app = new App(appOptions);
    this.registerHandlers(app, tenantId);
    this.apps.set(tenantId, app);

    // Register the WebClient with the adapter for outbound messages
    this.adapter.setClient(tenantId, app.client as unknown as Parameters<SlackChannelAdapter['setClient']>[1]);
  }

  private registerHandlers(app: App, tenantId: string): void {
    // ── Message events ────────────────────────────────────────
    app.message(async ({ message, say }) => {
      // Ignore bot messages and message_changed subtypes
      if ('bot_id' in message && message.bot_id) return;
      if (message.subtype) return;

      try {
        const inbound = await this.adapter.parseInbound({ tenantId, event: message });

        // Resolve identity
        const identityId = await resolveSlackIdentity(this.config.db, inbound);
        inbound.senderIdentityId = identityId;

        // Enqueue for async processing (keeps Slack's 3s timeout happy)
        await this.config.queueService.enqueue('process.inbound_message', {
          tenantId,
          channelName: 'slack',
          rawMessage: { tenantId, event: message, resolvedIdentityId: identityId },
        });
      } catch (err) {
        console.error(`[Slack] Error queuing message for tenant ${tenantId}:`, err);
        await say({ text: 'Something went wrong. Please try again.' });
      }
    });

    // ── App home tab ──────────────────────────────────────────
    app.event('app_home_opened', async ({ event, client }) => {
      await client.views.publish({
        user_id: event.user,
        view: {
          type: 'home',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Welcome to Veska* :wave:\n\nSend me a message to get started. I can help you manage leads, tickets, invoices, and more.',
              },
            },
          ],
        },
      });
    });

    // ── Button actions (magic link confirmations) ─────────────
    app.action('confirm_yes', async ({ body, ack, respond }) => {
      await ack();
      const metadata = (body as { message?: { metadata?: { event_payload?: Record<string, unknown> } } })
        .message?.metadata?.event_payload;
      if (!metadata) return;

      await this.config.queueService.enqueue('process.inbound_message', {
        tenantId,
        channelName: 'slack',
        rawMessage: { tenantId, confirmationResponse: 'yes', metadata },
      });
    });

    app.action('confirm_no', async ({ ack, respond }) => {
      await ack();
      await respond({ text: 'Got it, cancelled.' });
    });

    // ── Errors ────────────────────────────────────────────────
    app.error(async (error) => {
      console.error(`[Slack] App error for tenant ${tenantId}:`, error);
    });
  }

  getApp(tenantId: string): App | undefined {
    return this.apps.get(tenantId);
  }

  getAdapter(): SlackChannelAdapter {
    return this.adapter;
  }

  async disconnectTenant(tenantId: string): Promise<void> {
    const app = this.apps.get(tenantId);
    if (app) {
      await app.stop();
      this.apps.delete(tenantId);
    }
    await this.adapter.disconnect(tenantId);
  }
}
