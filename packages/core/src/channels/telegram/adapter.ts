import { randomUUID } from 'node:crypto';
import type {
  ChannelAdapter,
  ChannelConfig,
  IncomingMessage,
  OutgoingMessage,
} from '../../primitives/channel.js';

// ──────────────────────────────────────────────────────────────
// Telegram channel config
// ──────────────────────────────────────────────────────────────

export interface TelegramChannelConfig {
  botToken: string;
  webhookSecret?: string; // optional X-Telegram-Bot-Api-Secret-Token header value
}

// Raw inbound Telegram Update payload
interface TelegramUpdate {
  update_id: number;
  message: {
    message_id: number;
    from: {
      id: number;
      username?: string;
      first_name: string;
    };
    chat: {
      id: number;
    };
    text?: string;
    date: number;
  };
}

// Block types for outbound rendering
interface TextBlock {
  type: 'text';
  text: string;
}

interface ListBlock {
  type: 'list';
  items: string[];
}

interface ButtonBlock {
  type: 'button';
  label: string;
  url: string;
}

type Block = TextBlock | ListBlock | ButtonBlock;

// Telegram sendMessage API body
interface TelegramSendMessageBody {
  chat_id: number;
  text: string;
  parse_mode: 'MarkdownV2';
}

// ──────────────────────────────────────────────────────────────
// MarkdownV2 helpers
// ──────────────────────────────────────────────────────────────

/**
 * Escape special characters for Telegram MarkdownV2.
 * https://core.telegram.org/bots/api#markdownv2-style
 */
function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (ch) => `\\${ch}`);
}

function renderBlocksToMarkdownV2(blocks: unknown[]): string {
  return blocks
    .map((block) => {
      const b = block as Block;
      switch (b.type) {
        case 'text':
          return escapeMarkdownV2(b.text);
        case 'list':
          return b.items.map((item) => `• ${escapeMarkdownV2(item)}`).join('\n');
        case 'button':
          // Inline link: [label](url)
          return `[${escapeMarkdownV2(b.label)}](${b.url})`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
}

// ──────────────────────────────────────────────────────────────
// TelegramChannelAdapter
// ──────────────────────────────────────────────────────────────

export class TelegramChannelAdapter implements ChannelAdapter {
  readonly name = 'telegram';

  constructor(private config: TelegramChannelConfig) {}

  // ── parseInbound ─────────────────────────────────────────────

  async parseInbound(raw: unknown): Promise<IncomingMessage> {
    const update = raw as TelegramUpdate;
    const { message, update_id } = update;

    // Embed Telegram-specific context into raw so downstream handlers can access it
    const enrichedRaw = {
      ...(raw as object),
      metadata: {
        chatId: message.chat.id,
        username: message.from.username,
        updateId: update_id,
      },
    };

    return {
      id: randomUUID(),
      tenantId: '', // resolved from webhook routing context upstream
      channelName: 'telegram',
      channelMessageId: String(message.message_id),
      senderChannelId: String(message.from.id),
      text: message.text ?? '',
      attachments: [],
      receivedAt: new Date(message.date * 1000),
      raw: enrichedRaw,
    };
  }

  // ── formatOutbound ───────────────────────────────────────────

  formatOutbound(
    msg: OutgoingMessage,
    channelMeta: Record<string, unknown>,
  ): TelegramSendMessageBody {
    const parts: string[] = [];

    if (msg.text) {
      parts.push(escapeMarkdownV2(msg.text));
    }

    if (msg.blocks && msg.blocks.length > 0) {
      const rendered = renderBlocksToMarkdownV2(msg.blocks);
      if (rendered) parts.push(rendered);
    }

    if (msg.magicLink) {
      parts.push(
        `[${escapeMarkdownV2(msg.magicLink.label)}](${msg.magicLink.url})`,
      );
    }

    if (msg.requiresConfirmation) {
      parts.push(escapeMarkdownV2(msg.requiresConfirmation.promptText));
      parts.push(
        escapeMarkdownV2(
          `Reply "${msg.requiresConfirmation.confirmLabel}" to confirm or "${msg.requiresConfirmation.cancelLabel}" to cancel.`,
        ),
      );
    }

    const chatId = channelMeta['chatId'] as number;

    return {
      chat_id: chatId,
      text: parts.join('\n\n'),
      parse_mode: 'MarkdownV2',
    };
  }

  // ── send ─────────────────────────────────────────────────────

  async send(
    _tenantId: string,
    _recipientChannelId: string,
    msg: OutgoingMessage,
    config: ChannelConfig,
  ): Promise<void> {
    const chatId = config.metadata['chatId'] as number;
    const body = this.formatOutbound(msg, { chatId });

    const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Telegram sendMessage failed (${response.status}): ${errorText}`,
      );
    }
  }

  // ── connect / disconnect ─────────────────────────────────────

  async connect(_config: ChannelConfig): Promise<void> {
    // Telegram Bot API is stateless HTTP — no persistent connection needed.
  }

  async disconnect(_tenantId: string): Promise<void> {
    // No persistent connection to tear down.
  }

  // ── healthCheck ──────────────────────────────────────────────

  async healthCheck(
    _config: ChannelConfig,
  ): Promise<{ healthy: boolean; latencyMs?: number }> {
    const start = Date.now();

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/getMe`;
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        return { healthy: false, latencyMs: Date.now() - start };
      }

      const data = (await response.json()) as { ok: boolean };
      return { healthy: data.ok === true, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false };
    }
  }
}
