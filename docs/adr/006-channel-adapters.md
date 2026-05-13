# ADR 006 — Channel Adapter Libraries

**Status:** Accepted  
**Date:** 2026-05-13

## Decision

- **Slack:** `@slack/bolt` (official Slack SDK)
- **WhatsApp:** Meta's WhatsApp Business Cloud API via `axios`/`fetch` (no official Node SDK; we wrap it)
- **Email:** `imapflow` (IMAP inbound) + `nodemailer` (SMTP outbound); Postmark/Resend as managed alternatives behind a `MailProvider` interface
- **Telegram:** `grammy` (modern, TypeScript-first Telegram bot framework)
- **Discord:** deferred to community contribution

## Rationale

- `@slack/bolt` is the official, maintained SDK with OAuth, event subscriptions, and interactive components built in. No alternative is worth the maintenance cost.
- WhatsApp has no canonical Node SDK; a thin wrapper around the Cloud API webhooks is the correct approach and gives us full control.
- `imapflow` is the most actively maintained IMAP client for Node.js (replaces the abandoned `node-imap`). `nodemailer` is the de-facto standard for SMTP.
- `grammy` beats `node-telegram-bot-api` in TypeScript coverage and plugin ecosystem.

## Channel Adapter Contract

Every channel implements `ChannelAdapter`:

```typescript
interface ChannelAdapter {
  name: string;
  parseInbound(raw: unknown): Promise<IncomingMessage>;
  formatOutbound(msg: OutgoingMessage): unknown;
  send(tenantId: string, channelRef: string, msg: OutgoingMessage): Promise<void>;
  connect(config: ChannelConfig): Promise<void>;
  disconnect(): Promise<void>;
}
```

## Consequences

- Each channel adapter lives in `packages/core/src/channels/{name}/`.
- Slack is the reference implementation and must be fully working before other channels are started.
- Channel adapters must not import application-layer code — they depend only on the message schema types.
