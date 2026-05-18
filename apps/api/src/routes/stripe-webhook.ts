import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import { getStripe } from '../lib/stripe.js';

export const stripeWebhookRouter = new Hono();

// ── POST /webhooks/stripe ─────────────────────────────────────
// Authenticated by Stripe signature — must be mounted BEFORE requireSession().

stripeWebhookRouter.post('/', async (c) => {
  const sig = c.req.header('stripe-signature');
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

  if (!sig || !webhookSecret) {
    return c.json({ error: 'Missing Stripe signature or webhook secret' }, 400);
  }

  let event;
  try {
    const stripe = getStripe();
    const rawBody = await c.req.raw.arrayBuffer();
    event = stripe.webhooks.constructEvent(Buffer.from(rawBody), sig, webhookSecret);
  } catch (err) {
    return c.json({ error: `Webhook signature verification failed: ${String(err)}` }, 400);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { tenantId, invoiceId } = session.metadata ?? {};

      if (tenantId && invoiceId) {
        // Prevent double-processing
        const existing = await sharedDb.execute(sql`
          SELECT id FROM "stripeWebhookEvents"
          WHERE "stripeEventId" = ${event.id}
        `);
        if (existing.rows.length > 0) {
          return c.json({ received: true });
        }

        // Update invoice to paid
        const paymentIntent = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null);

        await sharedDb.execute(sql`
          UPDATE "entityRecords"
          SET data = data || ${JSON.stringify({
            status: 'paid',
            paidAt: new Date().toISOString(),
            stripePaymentIntentId: paymentIntent,
          })}::jsonb,
          "updatedAt" = now()
          WHERE id = ${invoiceId}
            AND "tenantId" = ${tenantId}
            AND "entityType" = 'Invoice'
        `);

        // Record the event to prevent duplicate processing
        await sharedDb.execute(sql`
          INSERT INTO "stripeWebhookEvents" ("tenantId", "stripeEventId", "type")
          VALUES (${tenantId}, ${event.id}, ${event.type})
          ON CONFLICT ("stripeEventId") DO NOTHING
        `);
      }
    }

    return c.json({ received: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});
