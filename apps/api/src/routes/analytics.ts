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

function buildDateSpine(from: Date, to: Date): string[] {
  const spine: string[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    spine.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return spine;
}

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

// Normalize drizzle-orm/postgres-js result (returns array directly, not { rows: [] })
function toRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const r = result as { rows?: unknown[] };
  return (r.rows ?? []) as Record<string, unknown>[];
}

function firstRow(result: unknown): Record<string, unknown> | undefined {
  return toRows(result)[0];
}

// ── GET /analytics/revenue ────────────────────────────────────

analyticsRouter.get('/revenue', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const { days, trunc } = parsePeriod(c.req.query('period'));

  try {
    const result = await db.execute(sql`
      SELECT
        DATE_TRUNC(${trunc}, "createdAt")::date AS bucket,
        COALESCE(SUM(CAST(COALESCE(data->>'total', data->>'amount') AS numeric)), 0) AS revenue
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" = 'Invoice'
        AND data->>'status' = 'paid'
        AND "createdAt" >= NOW() - (${days} || ' days')::interval
        AND "deletedAt" IS NULL
      GROUP BY bucket
      ORDER BY bucket ASC
    `);

    type Row = { bucket: string; revenue: string };
    const dbRows = toRows(result) as Row[];
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
        AND "deletedAt" IS NULL
      GROUP BY category
      ORDER BY total DESC
    `);

    type Row = { category: string; total: string };
    const rows = toRows(result) as Row[];

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
    const rows = toRows(result) as Row[];

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
// Uses "entityRecords" for deals (Deal entity type)

analyticsRouter.get('/pipeline', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  try {
    const result = await db.execute(sql`
      SELECT
        COALESCE(data->>'stage', data->>'status', 'Unknown') AS stage,
        COUNT(*) AS deal_count,
        COALESCE(SUM(CAST(COALESCE(data->>'value', data->>'amount') AS numeric)), 0) AS pipeline_value
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" = 'Deal'
        AND data->>'status' NOT IN ('won', 'lost')
        AND "deletedAt" IS NULL
      GROUP BY stage
      ORDER BY pipeline_value DESC
    `);

    type Row = { stage: string; deal_count: string; pipeline_value: string };
    const rows = toRows(result) as Row[];

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
        COALESCE(SUM(
          CAST(COALESCE(data->>'cost_price', data->>'unitPrice', '0') AS numeric) *
          CAST(COALESCE(data->>'stock_level', data->>'stockQuantity', '0') AS numeric)
        ), 0) AS inventory_value
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" = 'InventoryItem'
        AND "deletedAt" IS NULL
      GROUP BY category
      ORDER BY inventory_value DESC
    `);

    type Row = { category: string; inventory_value: string };
    const rows = toRows(result) as Row[];

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
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" IN ('SupportTicket', 'Ticket', 'ServiceTicket')
        AND "createdAt" >= NOW() - (${days} || ' days')::interval
        AND "deletedAt" IS NULL
      GROUP BY day
      ORDER BY day ASC
    `);

    type Row = { day: string; ticket_count: string };
    const dbRows = toRows(result) as Row[];
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

  async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try { return await fn(); } catch { return fallback; }
  }

  const [revenue30d, expenses30d, openInvoices, headcount, openTickets, pipeline] =
    await Promise.all([
      safeQuery(() => db.execute(sql`
        SELECT COALESCE(SUM(CAST(COALESCE(data->>'total', data->>'amount') AS numeric)), 0) AS total
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Invoice'
          AND data->>'status' = 'paid'
          AND "createdAt" >= NOW() - INTERVAL '30 days'
          AND "deletedAt" IS NULL
      `), null),
      safeQuery(() => db.execute(sql`
        SELECT COALESCE(SUM(CAST(data->>'amount' AS numeric)), 0) AS total
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Expense'
          AND "createdAt" >= NOW() - INTERVAL '30 days'
          AND "deletedAt" IS NULL
      `), null),
      safeQuery(() => db.execute(sql`
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(CAST(COALESCE(data->>'total', data->>'amount') AS numeric)), 0) AS value
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Invoice'
          AND data->>'status' NOT IN ('paid', 'cancelled')
          AND "deletedAt" IS NULL
      `), null),
      safeQuery(() => db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Employee'
          AND "deletedAt" IS NULL
      `), null),
      safeQuery(() => db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" IN ('SupportTicket', 'Ticket', 'ServiceTicket')
          AND data->>'status' NOT IN ('resolved', 'closed')
          AND "deletedAt" IS NULL
      `), null),
      safeQuery(() => db.execute(sql`
        SELECT COALESCE(SUM(CAST(COALESCE(data->>'value', data->>'amount') AS numeric)), 0) AS total
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Deal'
          AND data->>'status' NOT IN ('won', 'lost')
          AND "deletedAt" IS NULL
      `), null),
    ]);

  const n = (result: unknown, key = 'total') => Number(firstRow(result)?.[key] ?? 0);

  return c.json({
    revenue30d: n(revenue30d),
    expenses30d: n(expenses30d),
    openInvoicesCount: n(openInvoices, 'count'),
    openInvoicesValue: n(openInvoices, 'value'),
    headcount: n(headcount, 'count'),
    openTickets: n(openTickets, 'count'),
    pipelineValue: n(pipeline),
    budgetUtilizationPct: 0,
  });
});
