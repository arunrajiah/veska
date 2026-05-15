import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import { broadcast } from './sse.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const notificationsRouter = new Hono<{ Variables: TenantContext }>();

// ── GET /notifications/unread-count (static — before /:id) ───

notificationsRouter.get('/unread-count', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const userId = c.req.query('userId');
    if (!userId) return c.json({ error: 'userId query param required' }, 400);

    const rows = await sharedDb.execute(sql`
      SELECT COUNT(*) AS cnt
      FROM "notifications"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${userId}
        AND "isRead" = false
    `);

    const count = Number((rows as unknown as { cnt: string }[])[0]?.cnt ?? 0);
    return c.json({ count });
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── POST /notifications/read-all (static — before /:id) ──────

notificationsRouter.post('/read-all', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const userId = c.req.query('userId');
    if (!userId) return c.json({ error: 'userId query param required' }, 400);

    await sharedDb.execute(sql`
      UPDATE "notifications"
      SET "isRead" = true, "readAt" = now()
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${userId}
        AND "isRead" = false
    `);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── GET /notifications ────────────────────────────────────────

notificationsRouter.get('/', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const userId = c.req.query('userId');
    const unreadOnly = c.req.query('unreadOnly') === 'true';
    const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);

    if (!userId) return c.json({ error: 'userId query param required' }, 400);

    const rows = await sharedDb.execute(sql`
      SELECT *
      FROM "notifications"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${userId}
        ${unreadOnly ? sql`AND "isRead" = false` : sql``}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `);

    return c.json(rows);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── POST /notifications ───────────────────────────────────────

const createNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['info', 'success', 'warning', 'error', 'ai_insight', 'anomaly', 'approval']).optional().default('info'),
  title: z.string().min(1),
  body: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actionUrl: z.string().optional(),
});

notificationsRouter.post('/', zValidator('json', createNotificationSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const result = await sharedDb.execute(sql`
      INSERT INTO "notifications" (
        "tenantId", "userId", type, title, body,
        "entityType", "entityId", "actionUrl"
      ) VALUES (
        ${tenantId},
        ${body.userId},
        ${body.type},
        ${body.title},
        ${body.body ?? null},
        ${body.entityType ?? null},
        ${body.entityId ?? null},
        ${body.actionUrl ?? null}
      )
      RETURNING *
    `);

    const row = (result as unknown as Record<string, unknown>[])[0];

    // Broadcast to SSE subscribers
    broadcast(tenantId, { type: 'notification', payload: { id: row?.['id'], ...body } });

    return c.json(row, 201);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── POST /notifications/:id/read ──────────────────────────────

notificationsRouter.post('/:id/read', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const result = await sharedDb.execute(sql`
      UPDATE "notifications"
      SET "isRead" = true, "readAt" = now()
      WHERE id = ${id}
        AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    const row = (result as unknown[])[0];
    if (!row) return c.json({ error: 'Notification not found' }, 404);

    return c.json(row);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// ── DELETE /notifications/:id ─────────────────────────────────

notificationsRouter.delete('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const result = await sharedDb.execute(sql`
      DELETE FROM "notifications"
      WHERE id = ${id}
        AND "tenantId" = ${tenantId}
      RETURNING id
    `);

    const row = (result as unknown[])[0];
    if (!row) return c.json({ error: 'Notification not found' }, 404);

    return c.json({ deleted: true });
  } catch (error) {
    return c.json({ error }, 500);
  }
});
