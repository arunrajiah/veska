/**
 * Inbound channel webhook handlers — Slack and WhatsApp.
 *
 * These routes authenticate via signing secrets (not Bearer tokens), so they
 * must be mounted on the root `app` BEFORE the `requireSession()` middleware.
 * Mount them with:
 *   app.route('/api/v1/channels/inbound', inboundChannelsRouter);
 */

import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ApprovalService } from '@veska/core';
import { sharedDb } from '../shared.js';

export const inboundChannelsRouter = new Hono();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

function extractUuid(text: string): string | undefined {
  return UUID_RE.exec(text)?.[0];
}

/**
 * Route a message text to an approval action.
 * Returns the action taken (for logging) or null if no keyword matched.
 */
async function routeApprovalKeyword(
  text: string,
  decidedBy: string,
): Promise<'approved' | 'rejected' | 'help' | null> {
  const lower = text.toLowerCase();

  if (lower.includes('approve')) {
    const id = extractUuid(text);
    if (id) {
      const svc = new ApprovalService(sharedDb);
      // tenantId unknown from webhook context — look up trigger across all tenants
      await svc.decide(id, '', 'approved', decidedBy).catch((err: unknown) => {
        console.error('[inbound-channels] ApprovalService.decide error:', err);
      });
      return 'approved';
    }
  }

  if (lower.includes('reject')) {
    const id = extractUuid(text);
    if (id) {
      const svc = new ApprovalService(sharedDb);
      await svc.decide(id, '', 'rejected', decidedBy).catch((err: unknown) => {
        console.error('[inbound-channels] ApprovalService.decide error:', err);
      });
      return 'rejected';
    }
  }

  if (lower.includes('?') || lower.includes('help')) {
    return 'help';
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Slack — POST /api/v1/channels/inbound/slack
// ─────────────────────────────────────────────────────────────────────────────

inboundChannelsRouter.post('/slack', async (c) => {
  const signingSecret = process.env['SLACK_SIGNING_SECRET'];

  const rawBody = await c.req.text();

  // ── Signature verification ─────────────────────────────────────────────────
  if (signingSecret) {
    const timestamp = c.req.header('X-Slack-Request-Timestamp') ?? '';
    const slackSig = c.req.header('X-Slack-Signature') ?? '';

    // Reject stale requests (> 5 minutes) to prevent replay attacks
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
      return c.json({ error: 'Request timestamp too old' }, 400);
    }

    const baseString = `v0:${timestamp}:${rawBody}`;
    const hmac = createHmac('sha256', signingSecret).update(baseString).digest('hex');
    const expected = `v0=${hmac}`;

    try {
      const match = timingSafeEqual(
        Buffer.from(slackSig, 'utf8'),
        Buffer.from(expected, 'utf8'),
      );
      if (!match) {
        return c.json({ error: 'Invalid signature' }, 401);
      }
    } catch {
      return c.json({ error: 'Invalid signature' }, 401);
    }
  } else {
    console.warn('[inbound-channels/slack] SLACK_SIGNING_SECRET not set — skipping signature verification');
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  // ── URL verification challenge (Slack sends this when you first configure) ──
  if (payload['type'] === 'url_verification') {
    return c.json({ challenge: payload['challenge'] });
  }

  // ── Respond 200 immediately — Slack requires < 3 s ────────────────────────
  // Process the event asynchronously after the response is flushed.
  const event = payload['event'] as Record<string, unknown> | undefined;

  void (async () => {
    if (!event) return;
    if (event['type'] !== 'message') return;
    // Ignore bot messages to avoid loops
    if (event['bot_id'] !== undefined) return;

    const text = String(event['text'] ?? '');
    const user = String(event['user'] ?? 'unknown');
    const channel = String(event['channel'] ?? '');

    const action = await routeApprovalKeyword(text, user);

    if (action === 'help') {
      // Reply via Slack Web API
      const botToken = process.env['SLACK_BOT_TOKEN'];
      if (botToken && channel) {
        const helpText =
          'Hi! I can help you with approvals.\n' +
          '• To *approve* a request: `approve <request-id>`\n' +
          '• To *reject* a request: `reject <request-id>`';
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${botToken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({ channel, text: helpText }),
        }).catch((err: unknown) => {
          console.error('[inbound-channels/slack] Failed to post help reply:', err);
        });
      }
    } else if (action) {
      console.info(`[inbound-channels/slack] Processed "${action}" from user ${user}`);
    }
  })();

  return c.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp (Twilio) — POST /api/v1/channels/inbound/whatsapp
// ─────────────────────────────────────────────────────────────────────────────

inboundChannelsRouter.post('/whatsapp', async (c) => {
  const authToken = process.env['TWILIO_AUTH_TOKEN'];
  const accountSid = process.env['TWILIO_ACCOUNT_SID'] ?? '';

  // ── Signature verification (Twilio HMAC-SHA1) ─────────────────────────────
  if (authToken) {
    const twilioSig = c.req.header('X-Twilio-Signature') ?? '';
    const requestUrl = c.req.url;

    // Parse body first so we can include form params in HMAC
    const formData = await c.req.parseBody();

    // Twilio signature = HMAC-SHA1 of URL + sorted form params concatenated
    const sortedKeys = Object.keys(formData).sort();
    let sigBase = requestUrl;
    for (const key of sortedKeys) {
      sigBase += key + String(formData[key] ?? '');
    }

    const hmac = createHmac('sha1', authToken).update(sigBase).digest('base64');

    try {
      const match = timingSafeEqual(
        Buffer.from(twilioSig, 'utf8'),
        Buffer.from(hmac, 'utf8'),
      );
      if (!match) {
        // Respond with TwiML so Twilio doesn't retry
        return c.text('<Response/>', 403, { 'Content-Type': 'text/xml' });
      }
    } catch {
      return c.text('<Response/>', 403, { 'Content-Type': 'text/xml' });
    }

    // Process with already-parsed body
    void processWhatsAppBody(formData as Record<string, string>, accountSid);
  } else {
    console.warn('[inbound-channels/whatsapp] TWILIO_AUTH_TOKEN not set — skipping signature verification');
    // Still parse and process
    const formData = await c.req.parseBody();
    void processWhatsAppBody(formData as Record<string, string>, accountSid);
  }

  // Twilio expects TwiML or empty 200
  return c.text('<Response/>', 200, { 'Content-Type': 'text/xml' });
});

async function processWhatsAppBody(
  body: Record<string, string>,
  _accountSid: string,
): Promise<void> {
  const text = body['Body'] ?? '';
  const from = body['From'] ?? 'unknown';

  const action = await routeApprovalKeyword(text, from);

  if (action === 'help') {
    // Send help reply via Twilio REST API
    const authToken = process.env['TWILIO_AUTH_TOKEN'];
    const accountSid = process.env['TWILIO_ACCOUNT_SID'];
    const fromNumber = body['To'] ?? process.env['TWILIO_WHATSAPP_FROM'] ?? '';

    if (authToken && accountSid && fromNumber) {
      const helpMsg =
        'Hi! I can help with approvals.\n' +
        '• To approve: "approve <request-id>"\n' +
        '• To reject: "reject <request-id>"';

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const params = new URLSearchParams({
        From: fromNumber,
        To: from,
        Body: helpMsg,
      });

      await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }).catch((err: unknown) => {
        console.error('[inbound-channels/whatsapp] Failed to send help reply:', err);
      });
    }
  } else if (action) {
    console.info(`[inbound-channels/whatsapp] Processed "${action}" from ${from}`);
  }
}
