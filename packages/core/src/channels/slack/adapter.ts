import type { ChannelAdapter, ChannelConfig, IncomingMessage, OutgoingMessage } from '../../primitives/channel.js';
import { randomUUID } from 'node:crypto';

// Type-only imports for Slack Bolt — the actual dependency lives in apps/api
// The adapter accepts an already-configured Slack WebClient instance so
// packages/core does not need @slack/web-api as a hard dependency.

export interface SlackWebClient {
  chat: {
    postMessage(params: {
      channel: string;
      text?: string;
      blocks?: unknown[];
      thread_ts?: string;
    }): Promise<{ ts?: string }>;
  };
  users: {
    info(params: { user: string }): Promise<{
      user?: { real_name?: string; profile?: { email?: string } };
    }>;
  };
}

export interface SlackMessagePayload {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  channel: string;
  files?: Array<{
    url_private: string;
    mimetype?: string;
    name?: string;
    size?: number;
  }>;
}

export class SlackChannelAdapter implements ChannelAdapter {
  readonly name = 'slack';

  private clients = new Map<string, SlackWebClient>();

  setClient(tenantId: string, client: SlackWebClient): void {
    this.clients.set(tenantId, client);
  }

  async parseInbound(raw: unknown): Promise<IncomingMessage> {
    const payload = raw as { tenantId: string; event: SlackMessagePayload };
    const event = payload.event;

    return {
      id: randomUUID(),
      tenantId: payload.tenantId,
      channelName: 'slack',
      channelMessageId: event.ts,
      senderChannelId: event.user,
      text: event.text ?? '',
      attachments:
        event.files?.map((f) => ({
          type: 'file' as const,
          url: f.url_private,
          mimeType: f.mimetype,
          filename: f.name,
          sizeBytes: f.size,
        })) ?? [],
      threadId: event.thread_ts,
      receivedAt: new Date(parseFloat(event.ts) * 1000),
      raw,
    };
  }

  formatOutbound(msg: OutgoingMessage, _channelMeta: Record<string, unknown>): unknown {
    const blocks: unknown[] = [];

    if (msg.text) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: msg.text },
      });
    }

    if (msg.magicLink) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: msg.magicLink.label },
            url: msg.magicLink.url,
            action_id: 'magic_link_open',
          },
        ],
      });
    }

    if (msg.requiresConfirmation) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: msg.requiresConfirmation.promptText },
      });
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: msg.requiresConfirmation.confirmLabel },
            style: 'primary',
            action_id: 'confirm_yes',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: msg.requiresConfirmation.cancelLabel },
            style: 'danger',
            action_id: 'confirm_no',
          },
        ],
      });
    }

    return {
      text: msg.text,
      blocks: blocks.length > 0 ? blocks : undefined,
      thread_ts: msg.threadId,
    };
  }

  async send(
    tenantId: string,
    recipientChannelId: string,
    msg: OutgoingMessage,
    _config: ChannelConfig,
  ): Promise<void> {
    const client = this.clients.get(tenantId);
    if (!client) throw new Error(`No Slack client for tenant ${tenantId}`);

    const formatted = this.formatOutbound(msg, {}) as {
      text?: string;
      blocks?: unknown[];
      thread_ts?: string;
    };

    await client.chat.postMessage({
      channel: recipientChannelId,
      text: formatted.text,
      blocks: formatted.blocks,
      thread_ts: formatted.thread_ts,
    });
  }

  async connect(_config: ChannelConfig): Promise<void> {
    // Client is set externally via setClient() after OAuth flow completes.
    // The Slack Bolt App handles the socket/webhook connection in apps/api.
  }

  async disconnect(tenantId: string): Promise<void> {
    this.clients.delete(tenantId);
  }

  async healthCheck(config: ChannelConfig): Promise<{ healthy: boolean; latencyMs?: number }> {
    const client = this.clients.get(config.tenantId);
    if (!client) return { healthy: false };

    const start = Date.now();
    try {
      // Calling users.info with a dummy user just to check auth
      await client.users.info({ user: 'USLACKBOT' });
      return { healthy: true, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false };
    }
  }
}
