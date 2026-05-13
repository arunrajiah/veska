import { z } from 'zod';

// ──────────────────────────────────────────────────────────────
// Normalized inbound message (output of any channel adapter)
// ──────────────────────────────────────────────────────────────

export const IncomingMessageSchema = z.object({
  id: z.string(),
  tenantId: z.string().uuid(),
  channelName: z.string(),
  channelMessageId: z.string(),
  // Raw sender identifier on the channel (e.g. Slack user ID, email address)
  senderChannelId: z.string(),
  // Resolved identity ID (set after identity resolution)
  senderIdentityId: z.string().uuid().optional(),
  text: z.string(),
  // Structured attachments (files, images)
  attachments: z
    .array(
      z.object({
        type: z.enum(['image', 'file', 'audio']),
        url: z.string().url(),
        mimeType: z.string().optional(),
        filename: z.string().optional(),
        sizeBytes: z.number().optional(),
      }),
    )
    .default([]),
  // Thread / conversation context
  threadId: z.string().optional(),
  replyToId: z.string().optional(),
  receivedAt: z.date(),
  raw: z.unknown(),
});
export type IncomingMessage = z.infer<typeof IncomingMessageSchema>;

// ──────────────────────────────────────────────────────────────
// Outbound message (input to any channel adapter)
// ──────────────────────────────────────────────────────────────

export const OutgoingMessageSchema = z.object({
  text: z.string(),
  // Optional structured blocks (rendered as rich content where supported)
  blocks: z.array(z.unknown()).optional(),
  // Reply in the same thread if set
  threadId: z.string().optional(),
  // A magic-link CTA
  magicLink: z
    .object({
      label: z.string(),
      url: z.string().url(),
    })
    .optional(),
  // Request a confirmation reply (yes/no)
  requiresConfirmation: z
    .object({
      promptText: z.string(),
      confirmLabel: z.string().default('Yes'),
      cancelLabel: z.string().default('No'),
    })
    .optional(),
});
export type OutgoingMessage = z.infer<typeof OutgoingMessageSchema>;

// ──────────────────────────────────────────────────────────────
// Channel configuration (stored per tenant)
// ──────────────────────────────────────────────────────────────

export const ChannelConfigSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  channelName: z.string(),
  enabled: z.boolean().default(true),
  // Encrypted credentials — never stored in plain text
  credentialsRef: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ChannelConfig = z.infer<typeof ChannelConfigSchema>;

// ──────────────────────────────────────────────────────────────
// Channel adapter interface — implemented by each channel
// ──────────────────────────────────────────────────────────────

export interface ChannelAdapter {
  readonly name: string;
  parseInbound(raw: unknown): Promise<IncomingMessage>;
  formatOutbound(msg: OutgoingMessage, channelMeta: Record<string, unknown>): unknown;
  send(
    tenantId: string,
    recipientChannelId: string,
    msg: OutgoingMessage,
    config: ChannelConfig,
  ): Promise<void>;
  connect(config: ChannelConfig): Promise<void>;
  disconnect(tenantId: string): Promise<void>;
  healthCheck(config: ChannelConfig): Promise<{ healthy: boolean; latencyMs?: number }>;
}
