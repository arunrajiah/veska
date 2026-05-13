import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { schema } from '@veska/core';
import { randomBytes, createHash } from 'node:crypto';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const apiKeysRouter = new Hono<{ Variables: TenantContext }>();

// List API keys (never expose the hash)
apiKeysRouter.get('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const keys = await sharedDb.query.apiKeys.findMany({
    where: eq(schema.apiKeys.tenantId, tenantId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return c.json(keys.map(({ keyHash: _h, ...rest }) => rest));
});

// Create a new API key
apiKeysRouter.post('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const { name, expiresAt } = await c.req.json<{ name: string; expiresAt?: string }>();

  if (!name?.trim()) return c.json({ error: 'name is required' }, 400);

  // Generate: vsk_live_<32 random bytes hex>
  const rawKey = `vsk_live_${randomBytes(32).toString('hex')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 12); // "vsk_live_XXX"

  const [key] = await sharedDb
    .insert(schema.apiKeys)
    .values({
      tenantId,
      name: name.trim(),
      keyHash,
      keyPrefix,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  // Return the raw key ONCE — it will never be shown again
  return c.json({ ...key, keyHash: undefined, rawKey }, 201);
});

// Revoke an API key
apiKeysRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');

  await sharedDb
    .delete(schema.apiKeys)
    .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.tenantId, tenantId)));

  return c.json({ revoked: true });
});
