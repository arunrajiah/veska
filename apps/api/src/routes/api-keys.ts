import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { randomBytes, createHash } from 'node:crypto';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const apiKeysRouter = new Hono<{ Variables: TenantContext }>();

// GET / — list all non-revoked API keys for tenant (never return keyHash)
apiKeysRouter.get('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const result = await sharedDb.execute(sql`
    SELECT "id", "tenant_id" AS "tenantId", "name", "key_prefix" AS "keyPrefix",
           "scopes", "last_used_at" AS "lastUsedAt", "expires_at" AS "expiresAt",
           "revoked_at" AS "revokedAt", "created_at" AS "createdAt"
    FROM "api_keys"
    WHERE "tenant_id" = ${tenantId}
      AND "revoked_at" IS NULL
    ORDER BY "created_at" DESC
  `);

  return c.json({ keys: result.rows });
});

// POST / — create a new API key
apiKeysRouter.post('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{ name: string; scopes?: string[]; expiresAt?: string }>();

  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400);

  const raw = 'vsk_live_' + randomBytes(16).toString('hex');
  const keyHash = createHash('sha256').update(raw).digest('hex');
  const keyPrefix = raw.slice(0, 16);
  const scopes: string[] = body.scopes ?? [];
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  const result = await sharedDb.execute(sql`
    INSERT INTO "api_keys" ("tenant_id", "name", "key_hash", "key_prefix", "scopes", "expires_at")
    VALUES (${tenantId}, ${body.name.trim()}, ${keyHash}, ${keyPrefix}, ${scopes}, ${expiresAt})
    RETURNING "id", "name", "key_prefix" AS "keyPrefix", "scopes",
              "expires_at" AS "expiresAt", "created_at" AS "createdAt"
  `);

  const created = result.rows[0] as Record<string, unknown>;

  // Return the raw key ONCE — it will never be shown again
  return c.json({ key: raw, id: created['id'], name: created['name'], keyPrefix: created['keyPrefix'] }, 201);
});

// DELETE /:id — soft-revoke (set revokedAt = now())
apiKeysRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');

  await sharedDb.execute(sql`
    UPDATE "api_keys"
    SET "revoked_at" = now()
    WHERE "id" = ${id}::uuid
      AND "tenant_id" = ${tenantId}
      AND "revoked_at" IS NULL
  `);

  return c.json({ success: true });
});
