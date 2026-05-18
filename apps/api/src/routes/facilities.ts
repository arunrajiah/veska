import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const facilitiesRouter = new Hono<{ Variables: TenantContext }>();

// ── Schemas ───────────────────────────────────────────────────

const RequestCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  roomId: z.string().optional().nullable(),
  type: z.enum(['repair', 'cleaning', 'hvac', 'electrical', 'plumbing', 'other']).default('repair'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  requestedBy: z.string().min(1),
});

const RequestUpdateSchema = RequestCreateSchema.partial();

const StatusUpdateSchema = z.object({
  status: z.enum(['open', 'in-progress', 'completed', 'cancelled']),
  assignedTo: z.string().optional().nullable(),
});

// ── Summary (before /:id) ─────────────────────────────────────

facilitiesRouter.get('/summary', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');

    const [statusRows, typeRows, priorityRows, completionRows] = await Promise.all([
      sharedDb.execute(sql`
        SELECT status, COUNT(*) AS count
        FROM "facilityRequests"
        WHERE "tenantId" = ${tenantId}
        GROUP BY status
      `),
      sharedDb.execute(sql`
        SELECT type, COUNT(*) AS count
        FROM "facilityRequests"
        WHERE "tenantId" = ${tenantId}
        GROUP BY type
      `),
      sharedDb.execute(sql`
        SELECT priority, COUNT(*) AS count
        FROM "facilityRequests"
        WHERE "tenantId" = ${tenantId}
          AND status = 'open'
        GROUP BY priority
      `),
      sharedDb.execute(sql`
        SELECT
          ROUND(
            AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt")) / 3600)::numeric,
            2
          ) AS "avgCompletionHours"
        FROM "facilityRequests"
        WHERE "tenantId" = ${tenantId}
          AND status = 'completed'
          AND "completedAt" IS NOT NULL
      `),
    ]);

    type StatusRow = { status: string; count: string };
    type TypeRow = { type: string; count: string };
    type PriorityRow = { priority: string; count: string };
    type CompletionRow = { avgCompletionHours: string | null };

    const byStatus = (statusRows as unknown as StatusRow[]).reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = Number(r.count);
      return acc;
    }, {});

    const byType = (typeRows as unknown as TypeRow[]).reduce<Record<string, number>>((acc, r) => {
      acc[r.type] = Number(r.count);
      return acc;
    }, {});

    const openByPriority = (priorityRows as unknown as PriorityRow[]).reduce<Record<string, number>>((acc, r) => {
      acc[r.priority] = Number(r.count);
      return acc;
    }, {});

    const compRow = (completionRows as unknown as CompletionRow[])[0];

    return c.json({
      byStatus,
      byType,
      openByPriority,
      avgCompletionHours: compRow?.avgCompletionHours != null ? Number(compRow.avgCompletionHours) : null,
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /facilities/summary');
  }
});

// ── List requests ─────────────────────────────────────────────

facilitiesRouter.get('/requests', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { status, type, priority, roomId } = c.req.query();

    const rows = await sharedDb.execute(sql`
      SELECT * FROM "facilityRequests"
      WHERE "tenantId" = ${tenantId}
        AND (${status ? sql`status = ${status}` : sql`TRUE`})
        AND (${type ? sql`type = ${type}` : sql`TRUE`})
        AND (${priority ? sql`priority = ${priority}` : sql`TRUE`})
        AND (${roomId ? sql`"roomId" = ${roomId}` : sql`TRUE`})
      ORDER BY "createdAt" DESC
    `);

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /facilities/requests');
  }
});

// POST /facilities/requests
facilitiesRouter.post('/requests', zValidator('json', RequestCreateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    // Auto-number FAC-<padded>
    const countRows = await sharedDb.execute(sql`
      SELECT COUNT(*) AS cnt FROM "facilityRequests" WHERE "tenantId" = ${tenantId}
    `);
    const cnt = Number((countRows as unknown as Record<string, unknown>[])[0]?.['cnt'] ?? 0);
    const number = `FAC-${String(cnt + 1).padStart(4, '0')}`;

    const rows = await sharedDb.execute(sql`
      INSERT INTO "facilityRequests" (
        "tenantId", number, title, description, location, "roomId",
        type, priority, status, "requestedBy"
      ) VALUES (
        ${tenantId},
        ${number},
        ${body.title},
        ${body.description ?? null},
        ${body.location ?? null},
        ${body.roomId ?? null},
        ${body.type},
        ${body.priority},
        'open',
        ${body.requestedBy}
      )
      RETURNING *
    `);

    return c.json((rows as unknown as unknown[])[0], 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /facilities/requests');
  }
});

// GET /facilities/requests/:id
facilitiesRouter.get('/requests/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const rows = await sharedDb.execute(sql`
      SELECT * FROM "facilityRequests"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      LIMIT 1
    `);

    if ((rows as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);
    return c.json((rows as unknown as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'GET /facilities/requests/:id');
  }
});

// PUT /facilities/requests/:id
facilitiesRouter.put('/requests/:id', zValidator('json', RequestUpdateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const check = await sharedDb.execute(sql`
      SELECT id FROM "facilityRequests" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if ((check as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    const parts: ReturnType<typeof sql>[] = [sql`"updatedAt" = now()`];

    if (body.title !== undefined) parts.push(sql`title = ${body.title}`);
    if (body.description !== undefined) parts.push(sql`description = ${body.description}`);
    if (body.location !== undefined) parts.push(sql`location = ${body.location}`);
    if (body.roomId !== undefined) parts.push(sql`"roomId" = ${body.roomId}`);
    if (body.type !== undefined) parts.push(sql`type = ${body.type}`);
    if (body.priority !== undefined) parts.push(sql`priority = ${body.priority}`);
    if (body.requestedBy !== undefined) parts.push(sql`"requestedBy" = ${body.requestedBy}`);

    const setClauses = parts.reduce((acc, p) => sql`${acc}, ${p}`);

    const rows = await sharedDb.execute(sql`
      UPDATE "facilityRequests"
      SET ${setClauses}
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    return c.json((rows as unknown as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /facilities/requests/:id');
  }
});

// PUT /facilities/requests/:id/status
facilitiesRouter.put('/requests/:id/status', zValidator('json', StatusUpdateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const check = await sharedDb.execute(sql`
      SELECT id FROM "facilityRequests" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if ((check as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    const rows = await sharedDb.execute(sql`
      UPDATE "facilityRequests"
      SET
        status       = ${body.status},
        "assignedTo" = COALESCE(${body.assignedTo ?? null}, "assignedTo"),
        "completedAt" = CASE
          WHEN ${body.status} = 'completed' AND "completedAt" IS NULL THEN now()
          ELSE "completedAt"
        END,
        "updatedAt"  = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    return c.json((rows as unknown as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /facilities/requests/:id/status');
  }
});
