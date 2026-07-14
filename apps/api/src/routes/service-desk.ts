import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const serviceDeskRouter = new Hono<{ Variables: TenantContext }>();

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['in-progress', 'waiting', 'closed'],
  'in-progress': ['waiting', 'resolved', 'closed'],
  waiting: ['in-progress', 'resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
};

// ── Summary (before /:id) ──────────────────────────────────────

serviceDeskRouter.get('/summary', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const [statusResult, priorityResult, categoryResult, resolutionResult, slaResult, assigneeResult] =
    await Promise.all([
      sharedDb.execute(sql`
        SELECT status, COUNT(*) AS count
        FROM "serviceTickets"
        WHERE "tenantId" = ${tenantId}
        GROUP BY status
      `),
      sharedDb.execute(sql`
        SELECT priority, COUNT(*) AS count
        FROM "serviceTickets"
        WHERE "tenantId" = ${tenantId}
        GROUP BY priority
      `),
      sharedDb.execute(sql`
        SELECT category, COUNT(*) AS count
        FROM "serviceTickets"
        WHERE "tenantId" = ${tenantId}
        GROUP BY category
      `),
      sharedDb.execute(sql`
        SELECT
          ROUND(
            AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600)::numeric,
            2
          ) AS "avgResolutionHours"
        FROM "serviceTickets"
        WHERE "tenantId" = ${tenantId}
          AND status = 'resolved'
          AND "resolvedAt" IS NOT NULL
      `),
      sharedDb.execute(sql`
        SELECT COUNT(*) AS count
        FROM "serviceTickets"
        WHERE "tenantId" = ${tenantId}
          AND "slaBreached" = true
      `),
      sharedDb.execute(sql`
        SELECT "assignedTo", COUNT(*) AS "resolvedCount"
        FROM "serviceTickets"
        WHERE "tenantId" = ${tenantId}
          AND status IN ('resolved', 'closed')
          AND "assignedTo" IS NOT NULL
        GROUP BY "assignedTo"
        ORDER BY "resolvedCount" DESC
        LIMIT 3
      `),
    ]);

  type StatusRow = { status: string; count: string };
  type PriorityRow = { priority: string; count: string };
  type CategoryRow = { category: string; count: string };
  type ResolutionRow = { avgResolutionHours: string | null };
  type SlaRow = { count: string };
  type AssigneeRow = { assignedTo: string; resolvedCount: string };

  const byStatus = (statusResult.rows as StatusRow[]).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = Number(r.count);
    return acc;
  }, {});

  const byPriority = (priorityResult.rows as PriorityRow[]).reduce<Record<string, number>>((acc, r) => {
    acc[r.priority] = Number(r.count);
    return acc;
  }, {});

  const byCategory = (categoryResult.rows as CategoryRow[]).reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = Number(r.count);
    return acc;
  }, {});

  const resRow = resolutionResult.rows[0] as ResolutionRow | undefined;
  const slaRow = slaResult.rows[0] as SlaRow | undefined;

  return c.json({
    byStatus,
    byPriority,
    byCategory,
    avgResolutionHours: resRow?.avgResolutionHours != null ? Number(resRow.avgResolutionHours) : null,
    slaBreachCount: Number(slaRow?.count ?? 0),
    topAssignees: (assigneeResult.rows as AssigneeRow[]).map((r) => ({
      assignedTo: r.assignedTo,
      resolvedCount: Number(r.resolvedCount),
    })),
  });
});

// ── List tickets ───────────────────────────────────────────────

serviceDeskRouter.get('/tickets', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const status = c.req.query('status') ?? null;
  const category = c.req.query('category') ?? null;
  const priority = c.req.query('priority') ?? null;
  const assignedTo = c.req.query('assignedTo') ?? null;
  const requestedBy = c.req.query('requestedBy') ?? null;

  // First update SLA breach for open/in-progress tickets
  await sharedDb.execute(sql`
    UPDATE "serviceTickets"
    SET "slaBreached" = true, "updatedAt" = now()
    WHERE "tenantId" = ${tenantId}
      AND status IN ('open', 'in-progress')
      AND "slaBreached" = false
      AND "createdAt" + ("slaHours" || ' hours')::interval < now()
  `);

  const result = await sharedDb.execute(sql`
    SELECT
      t.*,
      COUNT(c.id) AS "commentCount"
    FROM "serviceTickets" t
    LEFT JOIN "ticketComments" c ON c."ticketId" = t.id AND c."tenantId" = t."tenantId"
    WHERE t."tenantId" = ${tenantId}
      AND (${status}::text IS NULL OR t.status = ${status})
      AND (${category}::text IS NULL OR t.category = ${category})
      AND (${priority}::text IS NULL OR t.priority = ${priority})
      AND (${assignedTo}::text IS NULL OR t."assignedTo" = ${assignedTo})
      AND (${requestedBy}::text IS NULL OR t."requestedBy" = ${requestedBy})
    GROUP BY t.id
    ORDER BY t."createdAt" DESC
  `);

  return c.json(result.rows);
});

// ── Create ticket ──────────────────────────────────────────────

const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['it', 'hr', 'facilities', 'finance', 'other']).default('it'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  requestedBy: z.string().min(1),
  assignedTo: z.string().optional(),
  slaHours: z.number().int().positive().default(24),
  tags: z.array(z.string()).default([]),
});

serviceDeskRouter.post('/tickets', zValidator('json', createTicketSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = c.req.valid('json');

  // Auto-generate ticket number
  const countResult = await sharedDb.execute(sql`
    SELECT COUNT(*) AS cnt FROM "serviceTickets" WHERE "tenantId" = ${tenantId}
  `);
  const cnt = Number((countResult.rows[0] as { cnt: string } | undefined)?.cnt ?? 0);
  const number = `TKT-${String(cnt + 1).padStart(4, '0')}`;

  const result = await sharedDb.execute(sql`
    INSERT INTO "serviceTickets" (
      "tenantId", number, title, description, category, priority, status,
      "requestedBy", "assignedTo", "slaHours", "dueAt", tags
    ) VALUES (
      ${tenantId},
      ${number},
      ${body.title},
      ${body.description ?? null},
      ${body.category},
      ${body.priority},
      'open',
      ${body.requestedBy},
      ${body.assignedTo ?? null},
      ${body.slaHours},
      now() + (${body.slaHours} || ' hours')::interval,
      ${JSON.stringify(body.tags)}::jsonb
    )
    RETURNING *
  `);

  const ticket = result.rows[0];
  if (!ticket) return c.json({ error: 'Failed to create ticket' }, 500);

  return c.json(ticket, 201);
});

// ── Get ticket with comments ───────────────────────────────────

serviceDeskRouter.get('/tickets/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const [ticketResult, commentsResult] = await Promise.all([
    sharedDb.execute(sql`
      SELECT * FROM "serviceTickets"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      LIMIT 1
    `),
    sharedDb.execute(sql`
      SELECT * FROM "ticketComments"
      WHERE "ticketId" = ${id} AND "tenantId" = ${tenantId}
      ORDER BY "createdAt" ASC
    `),
  ]);

  if (!ticketResult.rows[0]) return c.json({ error: 'Ticket not found' }, 404);

  return c.json({
    ...ticketResult.rows[0],
    comments: commentsResult.rows,
  });
});

// ── Update ticket metadata ─────────────────────────────────────

const updateTicketSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(['it', 'hr', 'facilities', 'finance', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  slaHours: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
});

serviceDeskRouter.put('/tickets/:id', zValidator('json', updateTicketSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "serviceTickets" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
  `);
  if (!check.rows[0]) return c.json({ error: 'Ticket not found' }, 404);

  const result = await sharedDb.execute(sql`
    UPDATE "serviceTickets"
    SET
      title       = COALESCE(${body.title ?? null}, title),
      description = COALESCE(${body.description ?? null}, description),
      category    = COALESCE(${body.category ?? null}, category),
      priority    = COALESCE(${body.priority ?? null}, priority),
      "slaHours"  = COALESCE(${body.slaHours ?? null}::integer, "slaHours"),
      tags        = COALESCE(${body.tags != null ? JSON.stringify(body.tags) : null}::jsonb, tags),
      "updatedAt" = now()
    WHERE id = ${id} AND "tenantId" = ${tenantId}
    RETURNING *
  `);

  return c.json(result.rows[0]);
});

// ── Delete ticket (only if open) ───────────────────────────────

serviceDeskRouter.delete('/tickets/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const check = await sharedDb.execute(sql`
    SELECT id, status FROM "serviceTickets"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
    LIMIT 1
  `);
  const existing = check.rows[0] as { id: string; status: string } | undefined;
  if (!existing) return c.json({ error: 'Ticket not found' }, 404);
  if (existing.status !== 'open') return c.json({ error: 'Only open tickets can be deleted' }, 400);

  await sharedDb.execute(sql`
    DELETE FROM "serviceTickets" WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);

  return c.json({ success: true });
});

// ── Update ticket status ───────────────────────────────────────

const updateStatusSchema = z.object({
  status: z.enum(['open', 'in-progress', 'waiting', 'resolved', 'closed']),
  resolvedBy: z.string().optional(),
});

serviceDeskRouter.put('/tickets/:id/status', zValidator('json', updateStatusSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const check = await sharedDb.execute(sql`
    SELECT id, status FROM "serviceTickets"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
    LIMIT 1
  `);
  const existing = check.rows[0] as { id: string; status: string } | undefined;
  if (!existing) return c.json({ error: 'Ticket not found' }, 404);

  const allowed = VALID_STATUS_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(body.status)) {
    return c.json(
      { error: `Cannot transition from '${existing.status}' to '${body.status}'. Allowed: ${allowed.join(', ') || 'none'}` },
      400,
    );
  }

  const result = await sharedDb.execute(sql`
    UPDATE "serviceTickets"
    SET
      status      = ${body.status},
      "resolvedAt" = CASE WHEN ${body.status} = 'resolved' AND "resolvedAt" IS NULL THEN now() ELSE "resolvedAt" END,
      "closedAt"  = CASE WHEN ${body.status} = 'closed' AND "closedAt" IS NULL THEN now() ELSE "closedAt" END,
      "updatedAt" = now()
    WHERE id = ${id} AND "tenantId" = ${tenantId}
    RETURNING *
  `);

  return c.json(result.rows[0]);
});

// ── Assign ticket ──────────────────────────────────────────────

const assignTicketSchema = z.object({
  assignedTo: z.string().min(1),
});

serviceDeskRouter.put('/tickets/:id/assign', zValidator('json', assignTicketSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const { assignedTo } = c.req.valid('json');

  const check = await sharedDb.execute(sql`
    SELECT id, status FROM "serviceTickets"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
    LIMIT 1
  `);
  const existing = check.rows[0] as { id: string; status: string } | undefined;
  if (!existing) return c.json({ error: 'Ticket not found' }, 404);

  // Auto-transition to in-progress if currently open
  const newStatus = existing.status === 'open' ? 'in-progress' : existing.status;

  const result = await sharedDb.execute(sql`
    UPDATE "serviceTickets"
    SET
      "assignedTo" = ${assignedTo},
      status       = ${newStatus},
      "updatedAt"  = now()
    WHERE id = ${id} AND "tenantId" = ${tenantId}
    RETURNING *
  `);

  return c.json(result.rows[0]);
});

// ── Ticket comments ────────────────────────────────────────────

const createCommentSchema = z.object({
  content: z.string().min(1),
  authorId: z.string().min(1),
  authorName: z.string().optional(),
  isInternal: z.boolean().default(false),
});

serviceDeskRouter.post('/tickets/:id/comments', zValidator('json', createCommentSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const ticketId = c.req.param('id');
  const body = c.req.valid('json');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "serviceTickets"
    WHERE id = ${ticketId} AND "tenantId" = ${tenantId}
    LIMIT 1
  `);
  if (!check.rows[0]) return c.json({ error: 'Ticket not found' }, 404);

  const result = await sharedDb.execute(sql`
    INSERT INTO "ticketComments" ("tenantId", "ticketId", content, "authorId", "authorName", "isInternal")
    VALUES (${tenantId}, ${ticketId}, ${body.content}, ${body.authorId}, ${body.authorName ?? null}, ${body.isInternal})
    RETURNING *
  `);

  // Bump ticket updatedAt
  await sharedDb.execute(sql`
    UPDATE "serviceTickets" SET "updatedAt" = now()
    WHERE id = ${ticketId} AND "tenantId" = ${tenantId}
  `);

  return c.json(result.rows[0], 201);
});

serviceDeskRouter.delete('/tickets/:id/comments/:commentId', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const ticketId = c.req.param('id');
  const commentId = c.req.param('commentId');
  const authorId = c.req.query('authorId') ?? c.req.header('x-veska-identity-id') ?? '';

  const check = await sharedDb.execute(sql`
    SELECT id, "authorId" FROM "ticketComments"
    WHERE id = ${commentId} AND "ticketId" = ${ticketId} AND "tenantId" = ${tenantId}
    LIMIT 1
  `);
  const existing = check.rows[0] as { id: string; authorId: string } | undefined;
  if (!existing) return c.json({ error: 'Comment not found' }, 404);
  if (existing.authorId !== authorId) return c.json({ error: 'Not authorized to delete this comment' }, 403);

  await sharedDb.execute(sql`
    DELETE FROM "ticketComments"
    WHERE id = ${commentId} AND "ticketId" = ${ticketId} AND "tenantId" = ${tenantId}
  `);

  return c.json({ success: true });
});
