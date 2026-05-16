import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const notificationChannelsRouter = new Hono<{ Variables: TenantContext }>();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Remove secrets from a stored config object before returning to the client. */
function maskConfig(config: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...config };
  if ('resendApiKey' in masked) masked['resendApiKey'] = '***';
  if ('webhookSecret' in masked) masked['webhookSecret'] = '***';
  return masked;
}

// ── Channel routes ─────────────────────────────────────────────────────────────

// GET /channels — list channels for tenant (secrets masked)
notificationChannelsRouter.get('/channels', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');

    const result = await sharedDb.execute(sql`
      SELECT "id", "tenantId", "type", "name", "config", "enabled", "createdAt", "updatedAt"
      FROM "notificationChannels"
      WHERE "tenantId" = ${tenantId}
      ORDER BY "createdAt" DESC
    `);

    const rows = (result.rows as Array<{ config: Record<string, unknown>; [key: string]: unknown }>).map((row) => ({
      ...row,
      config: maskConfig(row['config'] ?? {}),
    }));

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /notification-channels/channels');
  }
});

// POST /channels — create a new channel
notificationChannelsRouter.post('/channels', async (c) => {
  try {
    const body = await c.req.json<{
      tenantId?: string;
      type: string;
      name: string;
      config?: Record<string, unknown>;
      enabled?: boolean;
    }>();

    const { tenantId: ctxTenantId } = c.get('tenantCtx');
    const tenantId = body.tenantId ?? ctxTenantId;

    if (!body.type || !body.name) {
      return c.json({ error: 'type and name are required' }, 400);
    }

    const config = body.config ?? {};
    const enabled = body.enabled ?? true;

    const result = await sharedDb.execute(sql`
      INSERT INTO "notificationChannels" ("tenantId", "type", "name", "config", "enabled")
      VALUES (${tenantId}, ${body.type}, ${body.name}, ${JSON.stringify(config)}::jsonb, ${enabled})
      RETURNING "id", "tenantId", "type", "name", "config", "enabled", "createdAt", "updatedAt"
    `);

    const row = result.rows[0] as { config: Record<string, unknown>; [key: string]: unknown } | undefined;
    if (!row) return c.json({ error: 'Failed to create channel' }, 500);

    return c.json({ ...row, config: maskConfig(row['config'] ?? {}) }, 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /notification-channels/channels');
  }
});

// PATCH /channels/:id — update name, config, enabled
notificationChannelsRouter.patch('/channels/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { tenantId } = c.get('tenantCtx');

    const body = await c.req.json<{
      name?: string;
      config?: Record<string, unknown>;
      enabled?: boolean;
    }>();

    // Fetch existing row first to verify ownership and merge config
    const existing = await sharedDb.execute(sql`
      SELECT "id", "config" FROM "notificationChannels"
      WHERE "id" = ${id} AND "tenantId" = ${tenantId}
    `);

    if (!existing.rows[0]) return c.json({ error: 'Channel not found' }, 404);

    const existingRow = existing.rows[0] as { config: Record<string, unknown> };
    const mergedConfig = body.config !== undefined
      ? { ...existingRow['config'], ...body.config }
      : existingRow['config'];

    const result = await sharedDb.execute(sql`
      UPDATE "notificationChannels"
      SET
        "name"      = COALESCE(${body.name ?? null}, "name"),
        "config"    = ${JSON.stringify(mergedConfig)}::jsonb,
        "enabled"   = COALESCE(${body.enabled ?? null}, "enabled"),
        "updatedAt" = now()
      WHERE "id" = ${id} AND "tenantId" = ${tenantId}
      RETURNING "id", "tenantId", "type", "name", "config", "enabled", "createdAt", "updatedAt"
    `);

    const row = result.rows[0] as { config: Record<string, unknown>; [key: string]: unknown } | undefined;
    if (!row) return c.json({ error: 'Channel not found' }, 404);

    return c.json({ ...row, config: maskConfig(row['config'] ?? {}) });
  } catch (err) {
    return handleRouteError(c, err, 'PATCH /notification-channels/channels/:id');
  }
});

// DELETE /channels/:id — hard delete
notificationChannelsRouter.delete('/channels/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { tenantId } = c.get('tenantCtx');

    const result = await sharedDb.execute(sql`
      DELETE FROM "notificationChannels"
      WHERE "id" = ${id} AND "tenantId" = ${tenantId}
      RETURNING "id"
    `);

    if (!result.rows[0]) return c.json({ error: 'Channel not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /notification-channels/channels/:id');
  }
});

// ── Route (event→channel mapping) routes ──────────────────────────────────────

// GET /routes — list event→channel routes for tenant
notificationChannelsRouter.get('/routes', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');

    const result = await sharedDb.execute(sql`
      SELECT r."id", r."tenantId", r."event", r."channelId", r."createdAt",
             ch."name" AS "channelName", ch."type" AS "channelType"
      FROM "notificationRoutes" r
      JOIN "notificationChannels" ch ON ch."id" = r."channelId"
      WHERE r."tenantId" = ${tenantId}
      ORDER BY r."createdAt" DESC
    `);

    return c.json(result.rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /notification-channels/routes');
  }
});

// POST /routes — upsert an event→channel route
notificationChannelsRouter.post('/routes', async (c) => {
  try {
    const body = await c.req.json<{
      tenantId?: string;
      event: string;
      channelId: string;
    }>();

    const { tenantId: ctxTenantId } = c.get('tenantCtx');
    const tenantId = body.tenantId ?? ctxTenantId;

    if (!body.event || !body.channelId) {
      return c.json({ error: 'event and channelId are required' }, 400);
    }

    // Verify channel belongs to the same tenant
    const channelCheck = await sharedDb.execute(sql`
      SELECT "id" FROM "notificationChannels"
      WHERE "id" = ${body.channelId} AND "tenantId" = ${tenantId}
    `);

    if (!channelCheck.rows[0]) return c.json({ error: 'Channel not found' }, 404);

    const result = await sharedDb.execute(sql`
      INSERT INTO "notificationRoutes" ("tenantId", "event", "channelId")
      VALUES (${tenantId}, ${body.event}, ${body.channelId})
      ON CONFLICT ("tenantId", "event", "channelId") DO UPDATE
        SET "tenantId" = EXCLUDED."tenantId"   -- no-op to satisfy RETURNING
      RETURNING "id", "tenantId", "event", "channelId", "createdAt"
    `);

    return c.json(result.rows[0], 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /notification-channels/routes');
  }
});

// DELETE /routes/:id — remove a route
notificationChannelsRouter.delete('/routes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { tenantId } = c.get('tenantCtx');

    const result = await sharedDb.execute(sql`
      DELETE FROM "notificationRoutes"
      WHERE "id" = ${id} AND "tenantId" = ${tenantId}
      RETURNING "id"
    `);

    if (!result.rows[0]) return c.json({ error: 'Route not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /notification-channels/routes/:id');
  }
});
