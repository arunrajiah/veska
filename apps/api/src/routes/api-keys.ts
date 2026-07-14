import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { randomBytes, createHash } from 'node:crypto';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const apiKeysRouter = new Hono<{ Variables: TenantContext }>();

// GET / — list all non-revoked API keys for tenant (never return keyHash)
apiKeysRouter.get('/', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');

    const result = await sharedDb.execute(sql`
      SELECT "id", "tenantId", "name", "keyPrefix",
             "scopes", "lastUsedAt", "expiresAt",
             "revokedAt", "createdAt"
      FROM "apiKeys"
      WHERE "tenantId" = ${tenantId}
        AND "revokedAt" IS NULL
      ORDER BY "createdAt" DESC
    `);

    return c.json({ keys: result.rows });
  } catch (err) {
    return handleRouteError(c, err, 'GET /api-keys');
  }
});

// POST / — create a new API key
apiKeysRouter.post('/', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const body = await c.req.json<{ name: string; scopes?: string[]; expiresAt?: string }>();

    if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400);

    const raw = 'vsk_live_' + randomBytes(16).toString('hex');
    const keyHash = createHash('sha256').update(raw).digest('hex');
    const keyPrefix = raw.slice(0, 16);
    const scopes: string[] = body.scopes ?? [];
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const result = await sharedDb.execute(sql`
      INSERT INTO "apiKeys" ("tenantId", "name", "keyHash", "keyPrefix", "scopes", "expiresAt")
      VALUES (${tenantId}, ${body.name.trim()}, ${keyHash}, ${keyPrefix}, ${scopes}, ${expiresAt})
      RETURNING "id", "name", "keyPrefix", "scopes",
                "expiresAt", "createdAt"
    `);

    const created = result.rows[0] as Record<string, unknown>;

    // Return the raw key ONCE — it will never be shown again
    return c.json({ key: raw, id: created['id'], name: created['name'], keyPrefix: created['keyPrefix'] }, 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /api-keys');
  }
});

// DELETE /:id — soft-revoke (set revokedAt = now())
apiKeysRouter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { tenantId } = c.get('tenantCtx');

    await sharedDb.execute(sql`
      UPDATE "apiKeys"
      SET "revokedAt" = now()
      WHERE "id" = ${id}::uuid
        AND "tenantId" = ${tenantId}
        AND "revokedAt" IS NULL
    `);

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /api-keys/:id');
  }
});
