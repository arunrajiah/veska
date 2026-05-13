import { randomUUID } from 'node:crypto';
import type {
  ChannelAdapter,
  ChannelConfig,
  IncomingMessage,
  OutgoingMessage,
} from '../../primitives/channel.js';

// ──────────────────────────────────────────────────────────────
// WhatsApp channel config (Twilio WhatsApp API)
// ──────────────────────────────────────────────────────────────

export interface WhatsAppChannelConfig {
  accountSid: string;    // Twilio Account SID
  authToken: string;     // Twilio Auth Token
  fromNumber: string;    // WhatsApp sender: 'whatsapp:+14155238886'
}

// Raw inbound Twilio webhook payload (form-encoded, parsed to object by Hono/middleware)
interface TwilioInboundPayload {
  From: string;       // e.g. 'whatsapp:+1234567890'
  To: string;
  Body: string;
  MessageSid: string;
  NumMedia?: string;
}

// Block types mirroring what the email adapter uses internally
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

function renderBlocksToText(blocks: unknown[]): string {
  return blocks
    .map((block) => {
      const b = block as Block;
      switch (b.type) {
        case 'text':
          return b.text;
        case 'list':
          return b.items.map((item) => `• ${item}`).join('\n');
        case 'button':
          return `[${b.label}]`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
}

// ──────────────────────────────────────────────────────────────
// WhatsAppChannelAdapter
// ──────────────────────────────────────────────────────────────

export class WhatsAppChannelAdapter implements ChannelAdapter {
  readonly name = 'whatsapp';

  constructor(private config: WhatsAppChannelConfig) {}

  // ── parseInbound ─────────────────────────────────────────────

  async parseInbound(raw: unknown): Promise<IncomingMessage> {
    const payload = raw as TwilioInboundPayload;

    // Strip the 'whatsapp:' prefix to get a plain E.164 phone number
    const senderPhone = payload.From.replace(/^whatsapp:/i, '');

    return {
      id: randomUUID(),
      tenantId: '',          // resolved from webhook routing context upstream
      channelName: 'whatsapp',
      channelMessageId: payload.MessageSid,
      senderChannelId: senderPhone,
      text: payload.Body ?? '',
      attachments: [],
      receivedAt: new Date(),
      raw,
    };
  }

  // ── formatOutbound ───────────────────────────────────────────

  formatOutbound(msg: OutgoingMessage, _channelMeta: Record<string, unknown>): string {
    const parts: string[] = [];

    if (msg.text) {
      parts.push(msg.text);
    }

    if (msg.blocks && msg.blocks.length > 0) {
      const rendered = renderBlocksToText(msg.blocks);
      if (rendered) parts.push(rendered);
    }

    if (msg.magicLink) {
      parts.push(`${msg.magicLink.label}: ${msg.magicLink.url}`);
    }

    if (msg.requiresConfirmation) {
      parts.push(msg.requiresConfirmation.promptText);
      parts.push(
        `Reply "${msg.requiresConfirmation.confirmLabel}" to confirm or "${msg.requiresConfirmation.cancelLabel}" to cancel.`,
      );
    }

    return parts.join('\n\n');
  }

  // ── send ─────────────────────────────────────────────────────

  async send(
    _tenantId: string,
    recipientChannelId: string,
    msg: OutgoingMessage,
    _config: ChannelConfig,
  ): Promise<void> {
    const text = this.formatOutbound(msg, {});

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;

    const body = new URLSearchParams({
      From: this.config.fromNumber,
      To: `whatsapp:${recipientChannelId}`,
      Body: text,
    });

    const credentials = Buffer.from(
      `${this.config.accountSid}:${this.config.authToken}`,
    ).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Twilio WhatsApp send failed (${response.status}): ${errorText}`,
      );
    }
  }

  // ── connect / disconnect ─────────────────────────────────────

  async connect(_config: ChannelConfig): Promise<void> {
    // Twilio WhatsApp is stateless HTTP — no persistent connection needed.
  }

  async disconnect(_tenantId: string): Promise<void> {
    // No persistent connection to tear down.
  }

  // ── healthCheck ──────────────────────────────────────────────

  async healthCheck(
    _config: ChannelConfig,
  ): Promise<{ healthy: boolean; latencyMs?: number }> {
    const start = Date.now();

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}.json`;
    const credentials = Buffer.from(
      `${this.config.accountSid}:${this.config.authToken}`,
    ).toString('base64');

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      return { healthy: response.ok, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false };
    }
  }
}
