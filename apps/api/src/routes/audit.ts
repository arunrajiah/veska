import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const auditRouter = new Hono<{ Variables: TenantContext }>();

// ── Helper — callable by other routes ─────────────────────────

export async function logAudit(
  db: typeof sharedDb,
  entry: {
    tenantId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    actorType?: string;
    actorId?: string;
    diff?: unknown;
    ip?: string;
    userAgent?: string;
  },
): Promise<void> {
  await db.execute(sql`
    INSERT INTO "auditLog" (
      "tenantId", "actorId", "actorType", "action",
      "entityType", "entityId", "diff", "ip", "userAgent"
    )
    VALUES (
      ${entry.tenantId},
      ${entry.actorId ?? null},
      ${entry.actorType ?? 'system'},
      ${entry.action},
      ${entry.entityType ?? null},
      ${entry.entityId ?? null},
      ${entry.diff ? JSON.stringify(entry.diff) : null}::jsonb,
      ${entry.ip ?? null},
      ${entry.userAgent ?? null}
    )
  `);
}

// GET / — query audit log with optional filters
auditRouter.get('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const entityType  = c.req.query('entityType');
  const action      = c.req.query('action');
  // accept both actorId (legacy) and userId (new)
  const actorId     = c.req.query('actorId') ?? c.req.query('userId');
  const from        = c.req.query('from');
  const to          = c.req.query('to');
  const limitParam  = c.req.query('limit');
  const offsetParam = c.req.query('offset');
  const limit       = Math.min(parseInt(limitParam ?? '50', 10), 200);
  const offset      = Math.max(parseInt(offsetParam ?? '0', 10), 0);

  // Build optional filter clauses
  const entityTypeClause = entityType
    ? sql` AND "entityType" = ${entityType}`
    : sql``;
  const actionClause = action
    ? sql` AND "action" = ${action}`
    : sql``;
  const actorIdClause = actorId
    ? sql` AND "actorId" = ${actorId}`
    : sql``;
  const fromClause = from
    ? sql` AND "createdAt" >= ${new Date(from)}`
    : sql``;
  const toClause = to
    ? sql` AND "createdAt" <= ${new Date(to)}`
    : sql``;

  const entries = await sharedDb.execute(sql`
    SELECT * FROM "auditLog"
    WHERE "tenantId" = ${tenantId}
    ${entityTypeClause}
    ${actionClause}
    ${actorIdClause}
    ${fromClause}
    ${toClause}
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const countResult = await sharedDb.execute(sql`
    SELECT COUNT(*)::int AS total FROM "auditLog"
    WHERE "tenantId" = ${tenantId}
    ${entityTypeClause}
    ${actionClause}
    ${actorIdClause}
    ${fromClause}
    ${toClause}
  `);

  const total = (countResult.rows[0] as Record<string, unknown>)['total'] as number;

  return c.json({ entries: entries.rows, total });
});

// POST / — insert an audit log entry directly
auditRouter.post('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{
    action: string;
    entityType?: string;
    entityId?: string;
    actorType?: string;
    actorId?: string;
    diff?: unknown;
    ip?: string;
    userAgent?: string;
  }>();

  if (!body.action) return c.json({ error: 'action is required' }, 400);

  await logAudit(sharedDb, {
    tenantId,
    ...body,
    ip: body.ip ?? c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip'),
    userAgent: body.userAgent ?? c.req.header('user-agent'),
  });

  return c.json({ success: true }, 201);
});
