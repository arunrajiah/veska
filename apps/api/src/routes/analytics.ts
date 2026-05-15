import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { TenantContext } from '../middleware/tenant-context.js';

export const analyticsRouter = new Hono<{ Variables: TenantContext }>();

// ── Color palette ─────────────────────────────────────────────

const PALETTE = [
  '#6366f1',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#84cc16',
];

// ── Helpers ───────────────────────────────────────────────────

/**
 * Build a complete date spine (no gaps) between two dates, inclusive.
 * Returns ISO date strings (YYYY-MM-DD).
 */
function buildDateSpine(from: Date, to: Date): string[] {
  const spine: string[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    spine.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return spine;
}

/**
 * Build a complete month spine (YYYY-MM) going back `count` months.
 */
function buildMonthSpine(count: number): string[] {
  const spine: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    spine.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return spine;
}

function parsePeriod(raw: string | undefined): { days: number; trunc: 'day' | 'week' | 'month' } {
  switch (raw) {
    case '90d':
      return { days: 90, trunc: 'week' };
    case '12m':
      return { days: 365, trunc: 'month' };
    default:
      return { days: 30, trunc: 'day' };
  }
}

// ── GET /analytics/revenue ────────────────────────────────────

analyticsRouter.get('/revenue', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const { days, trunc } = parsePeriod(c.req.query('period'));

  try {
    const result = await db.execute(sql`
      SELECT
        DATE_TRUNC(${trunc}, "createdAt")::date AS bucket,
        COALESCE(SUM(CAST(data->>'total' AS numeric)), 0) AS revenue
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" = 'Invoice'
        AND data->>'status' = 'paid'
        AND "createdAt" >= NOW() - (${days} || ' days')::interval
      GROUP BY bucket
      ORDER BY bucket ASC
    `);

    type Row = { bucket: string; revenue: string };
    const dbRows = result.rows as Row[];
    const byBucket = new Map(dbRows.map((r) => [String(r.bucket).slice(0, 10), Number(r.revenue)]));

    let labels: string[];
    if (trunc === 'day') {
      const from = new Date(Date.now() - days * 86400_000);
      labels = buildDateSpine(from, new Date());
    } else if (trunc === 'week') {
      labels = buildDateSpine(new Date(Date.now() - days * 86400_000), new Date()).filter(
        (_d, i) => i % 7 === 0,
      );
    } else {
      labels = buildMonthSpine(12);
    }

    const data = labels.map((l) => byBucket.get(l) ?? 0);

    return c.json({
      labels,
      datasets: [{ label: 'Revenue', data, color: PALETTE[0] }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── GET /analytics/expenses ───────────────────────────────────

analyticsRouter.get('/expenses', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const { days } = parsePeriod(c.req.query('period'));

  try {
    const result = await db.execute(sql`
      SELECT
        COALESCE(data->>'category', 'Uncategorised') AS category,
        COALESCE(SUM(CAST(data->>'amount' AS numeric)), 0) AS total
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" = 'Expense'
        AND "createdAt" >= NOW() - (${days} || ' days')::interval
      GROUP BY category
      ORDER BY total DESC
    `);

    type Row = { category: string; total: string };
    const rows = result.rows as Row[];

    const top6 = rows.slice(0, 6);
    const rest = rows.slice(6);
    const labels = top6.map((r) => r.category);
    const data = top6.map((r) => Number(r.total));

    if (rest.length > 0) {
      labels.push('Other');
      data.push(rest.reduce((sum, r) => sum + Number(r.total), 0));
    }

    return c.json({
      labels,
      datasets: [
        {
          label: 'Expenses by Category',
          data,
          color: labels.map((_l, i) => PALETTE[i % PALETTE.length]),
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── GET /analytics/headcount ──────────────────────────────────

analyticsRouter.get('/headcount', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  try {
    const result = await db.execute(sql`
      SELECT
        COALESCE(data->>'department', 'Unassigned') AS department,
        COUNT(*) AS headcount
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" = 'Employee'
        AND "deletedAt" IS NULL
      GROUP BY department
      ORDER BY headcount DESC
    `);

    type Row = { department: string; headcount: string };
    const rows = result.rows as Row[];

    return c.json({
      labels: rows.map((r) => r.department),
      datasets: [
        {
          label: 'Headcount by Department',
          data: rows.map((r) => Number(r.headcount)),
          color: rows.map((_r, i) => PALETTE[i % PALETTE.length]),
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── GET /analytics/pipeline ───────────────────────────────────

analyticsRouter.get('/pipeline', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  try {
    const result = await db.execute(sql`
      SELECT
        s.name AS stage,
        s."order",
        COUNT(d.id) AS deal_count,
        COALESCE(SUM(d.value), 0) AS pipeline_value
      FROM "dealStages" s
      LEFT JOIN "crmDeals" d ON d."stageId" = s.id
        AND d."tenantId" = ${tenantId}
        AND d.status NOT IN ('won', 'lost')
      WHERE s."tenantId" = ${tenantId}
      GROUP BY s.id, s.name, s."order"
      ORDER BY s."order" ASC
    `);

    type Row = { stage: string; order: string; deal_count: string; pipeline_value: string };
    const rows = result.rows as Row[];

    return c.json({
      labels: rows.map((r) => r.stage),
      datasets: [
        {
          label: 'Deal Count',
          data: rows.map((r) => Number(r.deal_count)),
          color: PALETTE[0],
        },
        {
          label: 'Pipeline Value',
          data: rows.map((r) => Number(r.pipeline_value)),
          color: PALETTE[2],
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── GET /analytics/inventory-value ───────────────────────────

analyticsRouter.get('/inventory-value', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  try {
    const result = await db.execute(sql`
      SELECT
        COALESCE(data->>'category', 'Uncategorised') AS category,
        SUM(
          CAST(data->>'unitPrice' AS numeric) *
          CAST(data->>'stockQuantity' AS numeric)
        ) AS inventory_value
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" = 'Product'
        AND "deletedAt" IS NULL
        AND data->>'unitPrice' IS NOT NULL
        AND data->>'stockQuantity' IS NOT NULL
      GROUP BY category
      ORDER BY inventory_value DESC
    `);

    type Row = { category: string; inventory_value: string };
    const rows = result.rows as Row[];

    return c.json({
      labels: rows.map((r) => r.category),
      datasets: [
        {
          label: 'Inventory Value by Category',
          data: rows.map((r) => Number(r.inventory_value)),
          color: rows.map((_r, i) => PALETTE[i % PALETTE.length]),
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── GET /analytics/ticket-volume ──────────────────────────────

analyticsRouter.get('/ticket-volume', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const period = c.req.query('period');
  const days = period === '90d' ? 90 : 30;

  try {
    const result = await db.execute(sql`
      SELECT
        DATE_TRUNC('day', "createdAt")::date AS day,
        COUNT(*) AS ticket_count
      FROM "serviceTickets"
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= NOW() - (${days} || ' days')::interval
      GROUP BY day
      ORDER BY day ASC
    `);

    type Row = { day: string; ticket_count: string };
    const dbRows = result.rows as Row[];
    const byDay = new Map(dbRows.map((r) => [String(r.day).slice(0, 10), Number(r.ticket_count)]));

    const from = new Date(Date.now() - days * 86400_000);
    const labels = buildDateSpine(from, new Date());
    const data = labels.map((l) => byDay.get(l) ?? 0);

    return c.json({
      labels,
      datasets: [{ label: 'Ticket Volume', data, color: PALETTE[3] }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── GET /analytics/summary ────────────────────────────────────

analyticsRouter.get('/summary', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  try {
    const [
      revenue30d,
      expenses30d,
      openInvoices,
      headcount,
      openTickets,
      pipeline,
      budgetUtil,
    ] = await Promise.all([
      db.execute(sql`
        SELECT COALESCE(SUM(CAST(data->>'total' AS numeric)), 0) AS total
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Invoice'
          AND data->>'status' = 'paid'
          AND "createdAt" >= NOW() - INTERVAL '30 days'
      `),
      db.execute(sql`
        SELECT COALESCE(SUM(CAST(data->>'amount' AS numeric)), 0) AS total
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Expense'
          AND "createdAt" >= NOW() - INTERVAL '30 days'
      `),
      db.execute(sql`
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(CAST(data->>'total' AS numeric)), 0) AS value
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Invoice'
          AND data->>'status' NOT IN ('paid', 'cancelled')
          AND "deletedAt" IS NULL
      `),
      db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Employee'
          AND "deletedAt" IS NULL
      `),
      db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "serviceTickets"
        WHERE "tenantId" = ${tenantId}
          AND status NOT IN ('resolved', 'closed')
      `),
      db.execute(sql`
        SELECT COALESCE(SUM(d.value), 0) AS total
        FROM "crmDeals" d
        WHERE d."tenantId" = ${tenantId}
          AND d.status NOT IN ('won', 'lost')
      `),
      db.execute(sql`
        SELECT
          CASE
            WHEN COALESCE(SUM(bli."plannedAmount"), 0) > 0
            THEN ROUND(SUM(bli."actualAmount") / SUM(bli."plannedAmount") * 100, 1)
            ELSE 0
          END AS utilization_pct
        FROM budgets b
        LEFT JOIN "budgetLineItems" bli ON bli."budgetId" = b.id
        WHERE b."tenantId" = ${tenantId}
      `),
    ]);

    type SingleNum = { total: string };
    type CountVal = { count: string; value: string };
    type CountOnly = { count: string };
    type UtilRow = { utilization_pct: string };

    return c.json({
      revenue30d: Number((revenue30d.rows[0] as SingleNum)?.total ?? 0),
      expenses30d: Number((expenses30d.rows[0] as SingleNum)?.total ?? 0),
      openInvoicesCount: Number((openInvoices.rows[0] as CountVal)?.count ?? 0),
      openInvoicesValue: Number((openInvoices.rows[0] as CountVal)?.value ?? 0),
      headcount: Number((headcount.rows[0] as CountOnly)?.count ?? 0),
      openTickets: Number((openTickets.rows[0] as CountOnly)?.count ?? 0),
      pipelineValue: Number((pipeline.rows[0] as SingleNum)?.total ?? 0),
      budgetUtilizationPct: Number((budgetUtil.rows[0] as UtilRow)?.utilization_pct ?? 0),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});
