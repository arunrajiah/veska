import crypto from 'node:crypto';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

export interface WebhookEvent {
  event: string;
  tenantId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export class WebhookDispatcherService {
  constructor(private db: Database) {}

  async dispatch(event: WebhookEvent): Promise<void> {
    const subs = await this.db.query.webhookSubscriptions.findMany({
      where: and(
        eq(schema.webhookSubscriptions.tenantId, event.tenantId),
        eq(schema.webhookSubscriptions.enabled, true),
      ),
    });

    const matching = subs.filter(
      (s) => s.events.includes(event.event) || s.events.includes('*'),
    );

    await Promise.allSettled(
      matching.map((sub) => this.deliverToSubscriber(sub, event)),
    );
  }

  private async deliverToSubscriber(
    sub: { url: string; secret: string },
    event: WebhookEvent,
  ): Promise<void> {
    const body = JSON.stringify(event);
    const sig = crypto
      .createHmac('sha256', sub.secret)
      .update(body)
      .digest('hex');

    const res = await fetch(sub.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Veska-Signature': `sha256=${sig}`,
        'X-Veska-Event': event.event,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`Webhook delivery failed: ${res.status} ${sub.url}`);
    }
  }
}
