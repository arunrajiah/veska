import { Resend } from 'resend';
import { randomUUID } from 'node:crypto';
import type {
  ChannelAdapter,
  ChannelConfig,
  IncomingMessage,
  OutgoingMessage,
} from '../../primitives/channel.js';

export interface EmailChannelConfig {
  resendApiKey: string;
  fromAddress: string; // e.g. "Veska <support@yourdomain.com>"
  inboundDomain?: string;
}

// Raw inbound webhook payload shape (Resend/Postmark compatible)
interface InboundEmailPayload {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  messageId?: string;
  message_id?: string;
}

// Blocks used in outbound messages
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

function renderBlocksToHtml(blocks: unknown[]): string {
  return blocks
    .map((block) => {
      const b = block as Block;
      switch (b.type) {
        case 'text':
          return `<p style="margin:0 0 12px 0;font-family:sans-serif;font-size:14px;line-height:1.5;color:#333;">${b.text}</p>`;
        case 'list':
          return `<ul style="margin:0 0 12px 0;padding-left:20px;font-family:sans-serif;font-size:14px;color:#333;">${b.items.map((i) => `<li style="margin-bottom:4px;">${i}</li>`).join('')}</ul>`;
        case 'button':
          return `<p style="margin:0 0 12px 0;"><a href="${b.url}" style="display:inline-block;padding:10px 20px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:4px;font-family:sans-serif;font-size:14px;font-weight:600;">${b.label}</a></p>`;
        default:
          return '';
      }
    })
    .join('\n');
}

export class EmailChannelAdapter implements ChannelAdapter {
  readonly name = 'email';

  private resend: Resend;

  constructor(private config: EmailChannelConfig) {
    this.resend = new Resend(config.resendApiKey);
  }

  async parseInbound(raw: unknown): Promise<IncomingMessage> {
    const payload = raw as InboundEmailPayload;

    const messageId =
      payload.messageId ?? payload.message_id ?? randomUUID();

    const toAddress = Array.isArray(payload.to) ? payload.to[0] ?? '' : payload.to;

    return {
      id: randomUUID(),
      // tenantId is resolved from the inbound webhook route context, not the payload
      tenantId: '',
      channelName: 'email',
      channelMessageId: messageId,
      senderChannelId: payload.from,
      text: payload.text ?? '',
      attachments: [],
      receivedAt: new Date(),
      raw: {
        ...payload,
        subject: payload.subject,
        html: payload.html,
        to: toAddress,
        from: payload.from,
      },
    };
  }

  formatOutbound(
    msg: OutgoingMessage,
    channelMeta: Record<string, unknown>,
  ): { to: string; from: string; subject: string; text: string; html: string } {
    const subject =
      (channelMeta['subject'] as string | undefined) ??
      'Re: your request';

    const to = (channelMeta['to'] as string | undefined) ?? '';

    let html = `<div style="font-family:sans-serif;font-size:14px;color:#333;max-width:600px;margin:0 auto;padding:20px;">`;

    if (msg.text) {
      html += `<p style="margin:0 0 12px 0;line-height:1.5;">${msg.text}</p>`;
    }

    if (msg.blocks && msg.blocks.length > 0) {
      html += renderBlocksToHtml(msg.blocks);
    }

    if (msg.magicLink) {
      html += `<p style="margin:0 0 12px 0;"><a href="${msg.magicLink.url}" style="display:inline-block;padding:10px 20px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:4px;font-weight:600;">${msg.magicLink.label}</a></p>`;
    }

    html += `</div>`;

    return {
      to,
      from: this.config.fromAddress,
      subject,
      text: msg.text,
      html,
    };
  }

  async send(
    _tenantId: string,
    recipientChannelId: string,
    msg: OutgoingMessage,
    config: ChannelConfig,
  ): Promise<void> {
    const formatted = this.formatOutbound(msg, config.metadata);

    await this.resend.emails.send({
      from: formatted.from,
      to: recipientChannelId,
      subject: formatted.subject,
      text: formatted.text,
      html: formatted.html,
    });
  }

  async connect(_config: ChannelConfig): Promise<void> {
    // No persistent connection needed for email; Resend is stateless HTTP.
  }

  async disconnect(_tenantId: string): Promise<void> {
    // No persistent connection to tear down.
  }

  async healthCheck(
    _config: ChannelConfig,
  ): Promise<{ healthy: boolean; latencyMs?: number }> {
    const start = Date.now();
    try {
      await this.resend.domains.list();
      return { healthy: true, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false };
    }
  }
}
