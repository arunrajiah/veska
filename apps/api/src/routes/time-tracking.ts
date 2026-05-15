import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const timeTrackingRouter = new Hono<{ Variables: TenantContext }>();

// ── List time entries ─────────────────────────────────────────
// GET /time-entries
// Query params: userId, from, to, projectId
timeTrackingRouter.get('/time-entries', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const userId = c.req.query('userId');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const projectId = c.req.query('projectId');

  const result = await sharedDb.execute(sql`
    SELECT *
    FROM "timeEntries"
    WHERE "tenantId" = ${tenantId}
      AND (${userId}::text IS NULL OR "userId" = ${userId})
      AND (${from}::date IS NULL OR date >= ${from}::date)
      AND (${to}::date IS NULL OR date <= ${to}::date)
      AND (${projectId}::text IS NULL OR "projectId" = ${projectId})
    ORDER BY date DESC, "createdAt" DESC
  `);

  return c.json(result.rows);
});

// ── Create time entry ─────────────────────────────────────────
// POST /time-entries
timeTrackingRouter.post('/time-entries', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{
    userId: string;
    projectId?: string;
    taskId?: string;
    description?: string;
    date: string;
    minutes: number;
    billable?: boolean;
    hourlyRate?: number;
  }>();

  if (!body.userId || !body.date || body.minutes === undefined) {
    return c.json({ error: 'userId, date, and minutes are required' }, 400);
  }

  const result = await sharedDb.execute(sql`
    INSERT INTO "timeEntries" (
      "tenantId", "userId", "projectId", "taskId",
      description, date, minutes, billable, "hourlyRate"
    )
    VALUES (
      ${tenantId},
      ${body.userId},
      ${body.projectId ?? null},
      ${body.taskId ?? null},
      ${body.description ?? null},
      ${body.date}::date,
      ${body.minutes},
      ${body.billable ?? false},
      ${body.hourlyRate ?? null}
    )
    RETURNING *
  `);

  return c.json(result.rows[0], 201);
});

// ── Timer: start ──────────────────────────────────────────────
// POST /time-entries/timer/start
// Must be declared BEFORE /:id routes to avoid route shadowing
timeTrackingRouter.post('/time-entries/timer/start', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{
    userId: string;
    projectId?: string;
    description?: string;
  }>();

  if (!body.userId) {
    return c.json({ error: 'userId is required' }, 400);
  }

  // Auto-stop any existing running timer for this user
  await sharedDb.execute(sql`
    UPDATE "timeEntries"
    SET
      "stoppedAt" = now(),
      minutes = GREATEST(1, ROUND(EXTRACT(EPOCH FROM (now() - "startedAt")) / 60)::integer),
      "updatedAt" = now()
    WHERE "tenantId" = ${tenantId}
      AND "userId" = ${body.userId}
      AND "startedAt" IS NOT NULL
      AND "stoppedAt" IS NULL
  `);

  // Create new running timer
  const result = await sharedDb.execute(sql`
    INSERT INTO "timeEntries" (
      "tenantId", "userId", "projectId", description,
      date, minutes, billable, "startedAt"
    )
    VALUES (
      ${tenantId},
      ${body.userId},
      ${body.projectId ?? null},
      ${body.description ?? null},
      CURRENT_DATE,
      0,
      false,
      now()
    )
    RETURNING *
  `);

  return c.json(result.rows[0], 201);
});

// ── Timer: stop ───────────────────────────────────────────────
// POST /time-entries/timer/stop
timeTrackingRouter.post('/time-entries/timer/stop', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{ userId: string }>();

  if (!body.userId) {
    return c.json({ error: 'userId is required' }, 400);
  }

  const result = await sharedDb.execute(sql`
    UPDATE "timeEntries"
    SET
      "stoppedAt" = now(),
      minutes = GREATEST(1, ROUND(EXTRACT(EPOCH FROM (now() - "startedAt")) / 60)::integer),
      "updatedAt" = now()
    WHERE "tenantId" = ${tenantId}
      AND "userId" = ${body.userId}
      AND "startedAt" IS NOT NULL
      AND "stoppedAt" IS NULL
    RETURNING *
  `);

  if (!result.rows.length) {
    return c.json({ error: 'No running timer found for this user' }, 404);
  }

  return c.json(result.rows[0]);
});

// ── Timer: status ─────────────────────────────────────────────
// GET /time-entries/timer/status?userId=<id>
timeTrackingRouter.get('/time-entries/timer/status', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const userId = c.req.query('userId');

  if (!userId) {
    return c.json({ error: 'userId is required' }, 400);
  }

  const result = await sharedDb.execute(sql`
    SELECT *
    FROM "timeEntries"
    WHERE "tenantId" = ${tenantId}
      AND "userId" = ${userId}
      AND "startedAt" IS NOT NULL
      AND "stoppedAt" IS NULL
    LIMIT 1
  `);

  return c.json(result.rows[0] ?? null);
});

// ── Weekly summary ────────────────────────────────────────────
// GET /time-entries/weekly-summary?userId=<id>&weekStart=<date>
timeTrackingRouter.get('/time-entries/weekly-summary', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const userId = c.req.query('userId');
  const weekStart = c.req.query('weekStart');

  if (!userId || !weekStart) {
    return c.json({ error: 'userId and weekStart are required' }, 400);
  }

  // Generate 7-day summary (Mon through Sun from weekStart)
  const result = await sharedDb.execute(sql`
    WITH week_days AS (
      SELECT generate_series(
        ${weekStart}::date,
        ${weekStart}::date + INTERVAL '6 days',
        INTERVAL '1 day'
      )::date AS day
    ),
    entry_totals AS (
      SELECT
        date,
        SUM(minutes) AS total_minutes,
        SUM(CASE WHEN billable THEN minutes ELSE 0 END) AS billable_minutes
      FROM "timeEntries"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${userId}
        AND date >= ${weekStart}::date
        AND date <= ${weekStart}::date + INTERVAL '6 days'
      GROUP BY date
    ),
    billable_value AS (
      SELECT
        SUM(
          CASE WHEN billable AND "hourlyRate" IS NOT NULL
            THEN (minutes::numeric / 60) * "hourlyRate"
            ELSE 0
          END
        ) AS estimated_value
      FROM "timeEntries"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${userId}
        AND date >= ${weekStart}::date
        AND date <= ${weekStart}::date + INTERVAL '6 days'
    )
    SELECT
      json_build_object(
        'weekStart', ${weekStart},
        'days', (
          SELECT json_agg(
            json_build_object(
              'date', wd.day,
              'minutes', COALESCE(et.total_minutes, 0),
              'billableMinutes', COALESCE(et.billable_minutes, 0)
            )
            ORDER BY wd.day
          )
          FROM week_days wd
          LEFT JOIN entry_totals et ON et.date = wd.day
        ),
        'totals', json_build_object(
          'minutes', COALESCE((SELECT SUM(total_minutes) FROM entry_totals), 0),
          'billableMinutes', COALESCE((SELECT SUM(billable_minutes) FROM entry_totals), 0),
          'estimatedValue', COALESCE((SELECT estimated_value FROM billable_value), 0)
        )
      ) AS summary
  `);

  const row = result.rows[0] as { summary: unknown } | undefined;
  return c.json(row?.summary ?? null);
});

// ── Report ────────────────────────────────────────────────────
// GET /time-entries/report?from=<date>&to=<date>
timeTrackingRouter.get('/time-entries/report', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const from = c.req.query('from');
  const to = c.req.query('to');

  if (!from || !to) {
    return c.json({ error: 'from and to date params are required' }, 400);
  }

  const result = await sharedDb.execute(sql`
    SELECT
      "userId",
      "projectId",
      SUM(minutes) AS "totalMinutes",
      SUM(CASE WHEN billable THEN minutes ELSE 0 END) AS "billableMinutes",
      SUM(
        CASE WHEN billable AND "hourlyRate" IS NOT NULL
          THEN (minutes::numeric / 60) * "hourlyRate"
          ELSE 0
        END
      ) AS "estimatedValue"
    FROM "timeEntries"
    WHERE "tenantId" = ${tenantId}
      AND date >= ${from}::date
      AND date <= ${to}::date
    GROUP BY "userId", "projectId"
    ORDER BY "userId", "projectId"
  `);

  return c.json(result.rows);
});

// ── Update time entry ─────────────────────────────────────────
// PUT /time-entries/:id
timeTrackingRouter.put('/time-entries/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = await c.req.json<{
    projectId?: string;
    taskId?: string;
    description?: string;
    date?: string;
    minutes?: number;
    billable?: boolean;
    hourlyRate?: number;
  }>();

  // Verify ownership
  const check = await sharedDb.execute(sql`
    SELECT id FROM "timeEntries"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);
  if (!check.rows.length) {
    return c.json({ error: 'Time entry not found' }, 404);
  }

  const result = await sharedDb.execute(sql`
    UPDATE "timeEntries"
    SET
      "projectId"  = COALESCE(${body.projectId ?? null}, "projectId"),
      "taskId"     = COALESCE(${body.taskId ?? null}, "taskId"),
      description  = COALESCE(${body.description ?? null}, description),
      date         = COALESCE(${body.date ?? null}::date, date),
      minutes      = COALESCE(${body.minutes ?? null}, minutes),
      billable     = COALESCE(${body.billable ?? null}, billable),
      "hourlyRate" = COALESCE(${body.hourlyRate ?? null}, "hourlyRate"),
      "updatedAt"  = now()
    WHERE id = ${id} AND "tenantId" = ${tenantId}
    RETURNING *
  `);

  return c.json(result.rows[0]);
});

// ── Delete time entry ─────────────────────────────────────────
// DELETE /time-entries/:id
timeTrackingRouter.delete('/time-entries/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "timeEntries"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);
  if (!check.rows.length) {
    return c.json({ error: 'Time entry not found' }, 404);
  }

  await sharedDb.execute(sql`
    DELETE FROM "timeEntries"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);

  return c.json({ success: true });
});
