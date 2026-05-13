import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { schema } from '@veska/core';
import { randomBytes } from 'node:crypto';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const webhooksRouter = new Hono<{ Variables: TenantContext }>();

// List subscriptions
webhooksRouter.get('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const subs = await sharedDb.query.webhookSubscriptions.findMany({
    where: eq(schema.webhookSubscriptions.tenantId, tenantId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return c.json(subs.map(({ secret: _s, ...rest }) => rest)); // never expose secret
});

// Create subscription
webhooksRouter.post('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const { url, events } = await c.req.json<{ url: string; events: string[] }>();

  if (!url || !events?.length) {
    return c.json({ error: 'url and events are required' }, 400);
  }

  const secret = randomBytes(32).toString('hex');

  const [sub] = await sharedDb
    .insert(schema.webhookSubscriptions)
    .values({ tenantId, url, events, secret })
    .returning();

  // Return the secret once — it won't be shown again
  return c.json({ ...sub }, 201);
});

// Delete subscription
webhooksRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');

  await sharedDb
    .delete(schema.webhookSubscriptions)
    .where(
      and(
        eq(schema.webhookSubscriptions.id, id),
        eq(schema.webhookSubscriptions.tenantId, tenantId),
      ),
    );

  return c.json({ deleted: true });
});

// Update (enable/disable)
webhooksRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');
  const { enabled } = await c.req.json<{ enabled: boolean }>();

  const [updated] = await sharedDb
    .update(schema.webhookSubscriptions)
    .set({ enabled, updatedAt: new Date() })
    .where(
      and(
        eq(schema.webhookSubscriptions.id, id),
        eq(schema.webhookSubscriptions.tenantId, tenantId),
      ),
    )
    .returning();

  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json({ ...updated, secret: undefined });
});
