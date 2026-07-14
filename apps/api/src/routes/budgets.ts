import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const budgetsRouter = new Hono<{ Variables: TenantContext }>();

// ── Helpers ────────────────────────────────────────────────────

/** Compute the inclusive [startDate, endDate] for a budget's period. */
function budgetDateRange(
  fiscalYear: number,
  period: string,
  quarter: number | null,
  month: number | null,
): { startDate: string; endDate: string } {
  if (period === 'monthly' && month != null) {
    const start = new Date(fiscalYear, month - 1, 1);
    const end = new Date(fiscalYear, month, 0); // last day of month
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
  }
  if (period === 'quarterly' && quarter != null) {
    const startMonth = (quarter - 1) * 3; // 0-indexed
    const start = new Date(fiscalYear, startMonth, 1);
    const end = new Date(fiscalYear, startMonth + 3, 0);
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
  }
  // annual (default)
  return {
    startDate: `${fiscalYear}-01-01`,
    endDate: `${fiscalYear}-12-31`,
  };
}

function formatUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

// ── Budget summary (must be before /:id) ─────────────────────

budgetsRouter.get('/summary', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');

    const currentYear = new Date().getFullYear();

    const [activeBudgets, expenseActuals, invoiceActuals] = await Promise.all([
      sharedDb.execute(sql`
        SELECT id, name, currency,
               COALESCE(
                 (SELECT SUM("plannedAmount") FROM "budgetLineItems"
                  WHERE "budgetId" = b.id AND "tenantId" = ${tenantId}), 0
               ) AS "totalPlanned"
        FROM "budgets" b
        WHERE "tenantId" = ${tenantId} AND status = 'active'
        ORDER BY "createdAt" DESC
      `),
      sharedDb.execute(sql`
        SELECT COALESCE(SUM((data->>'amount')::numeric), 0) AS total
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Expense'
          AND COALESCE(data->>'date', data->>'issueDate') >= ${`${currentYear}-01-01`}
          AND COALESCE(data->>'date', data->>'issueDate') <= ${`${currentYear}-12-31`}
          AND "deletedAt" IS NULL
      `),
      sharedDb.execute(sql`
        SELECT COALESCE(SUM((data->>'amount')::numeric), 0) AS total
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Invoice'
          AND COALESCE(data->>'date', data->>'issueDate') >= ${`${currentYear}-01-01`}
          AND COALESCE(data->>'date', data->>'issueDate') <= ${`${currentYear}-12-31`}
          AND "deletedAt" IS NULL
      `),
    ]);

    const budgetRows = activeBudgets.rows as Array<{ id: string; name: string; currency: string; totalPlanned: string }>;
    const totalBudgeted = budgetRows.reduce((sum, r) => sum + Number(r.totalPlanned), 0);
    const totalActuals =
      Number((expenseActuals.rows[0] as { total: string })?.total ?? 0) +
      Number((invoiceActuals.rows[0] as { total: string })?.total ?? 0);
    const utilizationPct = totalBudgeted > 0 ? ((totalActuals / totalBudgeted) * 100).toFixed(1) : '0.0';

    return c.json({
      totalBudgeted,
      totalActuals,
      utilizationPct: Number(utilizationPct),
      activeBudgetCount: budgetRows.length,
      activeBudgetNames: budgetRows.map((r) => r.name),
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /budgets/summary');
  }
});

// ── List budgets ───────────────────────────────────────────────

budgetsRouter.get('/', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const fiscalYear = c.req.query('fiscalYear');
    const status = c.req.query('status');
    const period = c.req.query('period');

    const rows = await sharedDb.execute(sql`
      SELECT b.*,
             COALESCE(
               (SELECT JSON_AGG(li ORDER BY li."sortOrder")
                FROM "budgetLineItems" li
                WHERE li."budgetId" = b.id AND li."tenantId" = ${tenantId}),
               '[]'::json
             ) AS "lineItems"
      FROM "budgets" b
      WHERE b."tenantId" = ${tenantId}
        AND (${fiscalYear ?? null}::integer IS NULL OR b."fiscalYear" = ${fiscalYear ? parseInt(fiscalYear, 10) : null}::integer)
        AND (${status ?? null}::text IS NULL OR b.status = ${status ?? null})
        AND (${period ?? null}::text IS NULL OR b.period = ${period ?? null})
      ORDER BY b."createdAt" DESC
    `);

    return c.json(rows.rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /budgets');
  }
});

// ── Get single budget with line items ──────────────────────────

budgetsRouter.get('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const result = await sharedDb.execute(sql`
      SELECT b.*,
             COALESCE(
               (SELECT JSON_AGG(li ORDER BY li."sortOrder")
                FROM "budgetLineItems" li
                WHERE li."budgetId" = b.id AND li."tenantId" = ${tenantId}),
               '[]'::json
             ) AS "lineItems"
      FROM "budgets" b
      WHERE b.id = ${id} AND b."tenantId" = ${tenantId}
      LIMIT 1
    `);

    if (!result.rows[0]) return c.json({ error: 'Not found' }, 404);
    return c.json(result.rows[0]);
  } catch (err) {
    return handleRouteError(c, err, 'GET /budgets/:id');
  }
});

// ── Create budget ──────────────────────────────────────────────

const createBudgetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  fiscalYear: z.number().int(),
  period: z.enum(['annual', 'quarterly', 'monthly']).default('annual'),
  quarter: z.number().int().min(1).max(4).optional(),
  month: z.number().int().min(1).max(12).optional(),
  currency: z.string().default('USD'),
  status: z.enum(['draft', 'approved', 'active', 'closed']).default('draft'),
});

budgetsRouter.post('/', zValidator('json', createBudgetSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const result = await sharedDb.execute(sql`
      INSERT INTO "budgets" (
        "tenantId", name, description, "fiscalYear", period, quarter, month,
        status, currency
      ) VALUES (
        ${tenantId}, ${body.name}, ${body.description ?? null},
        ${body.fiscalYear}, ${body.period}, ${body.quarter ?? null},
        ${body.month ?? null}, ${body.status}, ${body.currency}
      )
      RETURNING *
    `);

    return c.json(result.rows[0], 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /budgets');
  }
});

// ── Update budget metadata ─────────────────────────────────────

const updateBudgetSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  fiscalYear: z.number().int().optional(),
  period: z.enum(['annual', 'quarterly', 'monthly']).optional(),
  quarter: z.number().int().min(1).max(4).optional(),
  month: z.number().int().min(1).max(12).optional(),
  currency: z.string().optional(),
});

budgetsRouter.put('/:id', zValidator('json', updateBudgetSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');
    const body = c.req.valid('json');

    // Check existence
    const check = await sharedDb.execute(sql`
      SELECT id FROM "budgets" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if (!check.rows[0]) return c.json({ error: 'Not found' }, 404);

    const result = await sharedDb.execute(sql`
      UPDATE "budgets"
      SET
        name        = COALESCE(${body.name ?? null}, name),
        description = COALESCE(${body.description ?? null}, description),
        "fiscalYear" = COALESCE(${body.fiscalYear ?? null}::integer, "fiscalYear"),
        period      = COALESCE(${body.period ?? null}, period),
        quarter     = COALESCE(${body.quarter ?? null}::integer, quarter),
        month       = COALESCE(${body.month ?? null}::integer, month),
        currency    = COALESCE(${body.currency ?? null}, currency),
        "updatedAt" = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    return c.json(result.rows[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /budgets/:id');
  }
});

// ── Delete budget ──────────────────────────────────────────────

budgetsRouter.delete('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const check = await sharedDb.execute(sql`
      SELECT id FROM "budgets" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if (!check.rows[0]) return c.json({ error: 'Not found' }, 404);

    await sharedDb.execute(sql`
      DELETE FROM "budgets" WHERE id = ${id} AND "tenantId" = ${tenantId}
    `);

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /budgets/:id');
  }
});

// ── Update status ──────────────────────────────────────────────

const updateStatusSchema = z.object({
  status: z.enum(['approved', 'active', 'closed']),
  approvedBy: z.string().optional(),
});

budgetsRouter.put('/:id/status', zValidator('json', updateStatusSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');
    const { status, approvedBy } = c.req.valid('json');

    const check = await sharedDb.execute(sql`
      SELECT id FROM "budgets" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if (!check.rows[0]) return c.json({ error: 'Not found' }, 404);

    const isApproving = status === 'approved';

    const result = await sharedDb.execute(sql`
      UPDATE "budgets"
      SET status      = ${status},
          "approvedBy"  = CASE WHEN ${isApproving} THEN COALESCE(${approvedBy ?? null}, "approvedBy") ELSE "approvedBy" END,
          "approvedAt"  = CASE WHEN ${isApproving} AND "approvedAt" IS NULL THEN now() ELSE "approvedAt" END,
          "updatedAt" = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    return c.json(result.rows[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /budgets/:id/status');
  }
});

// ── Line items: list ───────────────────────────────────────────

budgetsRouter.get('/:id/line-items', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const budgetId = c.req.param('id');

    const check = await sharedDb.execute(sql`
      SELECT id FROM "budgets" WHERE id = ${budgetId} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if (!check.rows[0]) return c.json({ error: 'Budget not found' }, 404);

    const result = await sharedDb.execute(sql`
      SELECT * FROM "budgetLineItems"
      WHERE "budgetId" = ${budgetId} AND "tenantId" = ${tenantId}
      ORDER BY "sortOrder", "createdAt"
    `);

    return c.json(result.rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /budgets/:id/line-items');
  }
});

// ── Line items: create ─────────────────────────────────────────

const createLineItemSchema = z.object({
  category: z.string().min(1),
  description: z.string().optional(),
  plannedAmount: z.number().default(0),
  entityType: z.string().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

budgetsRouter.post('/:id/line-items', zValidator('json', createLineItemSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const budgetId = c.req.param('id');
    const body = c.req.valid('json');

    const check = await sharedDb.execute(sql`
      SELECT id FROM "budgets" WHERE id = ${budgetId} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if (!check.rows[0]) return c.json({ error: 'Budget not found' }, 404);

    const result = await sharedDb.execute(sql`
      INSERT INTO "budgetLineItems" (
        "tenantId", "budgetId", category, description,
        "plannedAmount", "entityType", notes, "sortOrder"
      ) VALUES (
        ${tenantId}, ${budgetId}, ${body.category}, ${body.description ?? null},
        ${body.plannedAmount}, ${body.entityType ?? null}, ${body.notes ?? null}, ${body.sortOrder}
      )
      RETURNING *
    `);

    return c.json(result.rows[0], 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /budgets/:id/line-items');
  }
});

// ── Line items: update ─────────────────────────────────────────

const updateLineItemSchema = z.object({
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  plannedAmount: z.number().optional(),
  entityType: z.string().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

budgetsRouter.put('/:id/line-items/:itemId', zValidator('json', updateLineItemSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const budgetId = c.req.param('id');
    const itemId = c.req.param('itemId');
    const body = c.req.valid('json');

    const check = await sharedDb.execute(sql`
      SELECT id FROM "budgetLineItems"
      WHERE id = ${itemId} AND "budgetId" = ${budgetId} AND "tenantId" = ${tenantId}
      LIMIT 1
    `);
    if (!check.rows[0]) return c.json({ error: 'Line item not found' }, 404);

    const result = await sharedDb.execute(sql`
      UPDATE "budgetLineItems"
      SET
        category      = COALESCE(${body.category ?? null}, category),
        description   = COALESCE(${body.description ?? null}, description),
        "plannedAmount" = COALESCE(${body.plannedAmount ?? null}::numeric, "plannedAmount"),
        "entityType"  = COALESCE(${body.entityType ?? null}, "entityType"),
        notes         = COALESCE(${body.notes ?? null}, notes),
        "sortOrder"   = COALESCE(${body.sortOrder ?? null}::integer, "sortOrder"),
        "updatedAt"   = now()
      WHERE id = ${itemId} AND "budgetId" = ${budgetId} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    return c.json(result.rows[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /budgets/:id/line-items/:itemId');
  }
});

// ── Line items: delete ─────────────────────────────────────────

budgetsRouter.delete('/:id/line-items/:itemId', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const budgetId = c.req.param('id');
    const itemId = c.req.param('itemId');

    const check = await sharedDb.execute(sql`
      SELECT id FROM "budgetLineItems"
      WHERE id = ${itemId} AND "budgetId" = ${budgetId} AND "tenantId" = ${tenantId}
      LIMIT 1
    `);
    if (!check.rows[0]) return c.json({ error: 'Line item not found' }, 404);

    await sharedDb.execute(sql`
      DELETE FROM "budgetLineItems"
      WHERE id = ${itemId} AND "budgetId" = ${budgetId} AND "tenantId" = ${tenantId}
    `);

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /budgets/:id/line-items/:itemId');
  }
});

// ── Budget vs Actuals ──────────────────────────────────────────

budgetsRouter.get('/:id/actuals', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const budgetResult = await sharedDb.execute(sql`
      SELECT * FROM "budgets" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if (!budgetResult.rows[0]) return c.json({ error: 'Not found' }, 404);

    const budget = budgetResult.rows[0] as {
      fiscalYear: number;
      period: string;
      quarter: number | null;
      month: number | null;
    };

    const { startDate, endDate } = budgetDateRange(
      budget.fiscalYear,
      budget.period,
      budget.quarter,
      budget.month,
    );

    const lineItemsResult = await sharedDb.execute(sql`
      SELECT * FROM "budgetLineItems"
      WHERE "budgetId" = ${id} AND "tenantId" = ${tenantId}
      ORDER BY "sortOrder", "createdAt"
    `);

    const lineItems = lineItemsResult.rows as Array<{
      id: string;
      category: string;
      plannedAmount: string;
      entityType: string | null;
    }>;

    // Fetch actuals for each line item that has an entityType
    const enriched = await Promise.all(
      lineItems.map(async (item) => {
        let actualAmount = 0;

        if (item.entityType) {
          const actualsResult = await sharedDb.execute(sql`
            SELECT COALESCE(SUM((data->>'amount')::numeric), 0) AS total
            FROM "entityRecords"
            WHERE "tenantId" = ${tenantId}
              AND "entityType" = ${item.entityType}
              AND COALESCE(data->>'date', data->>'issueDate')::date >= ${startDate}::date
              AND COALESCE(data->>'date', data->>'issueDate')::date <= ${endDate}::date
              AND "deletedAt" IS NULL
          `);
          actualAmount = Number((actualsResult.rows[0] as { total: string })?.total ?? 0);
        }

        const plannedAmount = Number(item.plannedAmount);
        const variance = plannedAmount - actualAmount;
        const variancePct = plannedAmount !== 0 ? ((variance / plannedAmount) * 100).toFixed(1) : null;

        return {
          id: item.id,
          category: item.category,
          plannedAmount,
          actualAmount,
          variance,
          variancePct: variancePct !== null ? Number(variancePct) : null,
          entityType: item.entityType,
        };
      }),
    );

    const totalPlanned = enriched.reduce((s, r) => s + r.plannedAmount, 0);
    const totalActual = enriched.reduce((s, r) => s + r.actualAmount, 0);
    const totalVariance = totalPlanned - totalActual;
    const totalVariancePct = totalPlanned !== 0 ? Number(((totalVariance / totalPlanned) * 100).toFixed(1)) : null;

    return c.json({
      lineItems: enriched,
      totals: {
        planned: totalPlanned,
        actual: totalActual,
        variance: totalVariance,
        variancePct: totalVariancePct,
      },
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /budgets/:id/actuals');
  }
});

// ── Cash flow forecast ─────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

budgetsRouter.get('/:id/cashflow', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const budgetResult = await sharedDb.execute(sql`
      SELECT * FROM "budgets" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if (!budgetResult.rows[0]) return c.json({ error: 'Not found' }, 404);

    const budget = budgetResult.rows[0] as { fiscalYear: number };
    const fy = budget.fiscalYear;
    const now = new Date();
    const currentMonth = now.getFullYear() === fy ? now.getMonth() + 1 : (now.getFullYear() > fy ? 12 : 0);

    // Fetch actual monthly flows for the fiscal year
    const inflowResult = await sharedDb.execute(sql`
      SELECT
        EXTRACT(MONTH FROM COALESCE(data->>'date', data->>'issueDate')::date)::int AS month,
        COALESCE(SUM((data->>'amount')::numeric), 0) AS total
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" = 'Invoice'
        AND EXTRACT(YEAR FROM COALESCE(data->>'date', data->>'issueDate')::date) = ${fy}
        AND "deletedAt" IS NULL
      GROUP BY 1
      ORDER BY 1
    `);

    const outflowResult = await sharedDb.execute(sql`
      SELECT
        EXTRACT(MONTH FROM COALESCE(data->>'date', data->>'issueDate')::date)::int AS month,
        COALESCE(SUM((data->>'amount')::numeric), 0) AS total
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" = 'Expense'
        AND EXTRACT(YEAR FROM COALESCE(data->>'date', data->>'issueDate')::date) = ${fy}
        AND "deletedAt" IS NULL
      GROUP BY 1
      ORDER BY 1
    `);

    type MonthRow = { month: number; total: string };
    const inflowMap = new Map<number, number>();
    const outflowMap = new Map<number, number>();

    for (const row of inflowResult.rows as MonthRow[]) {
      inflowMap.set(row.month, Number(row.total));
    }
    for (const row of outflowResult.rows as MonthRow[]) {
      outflowMap.set(row.month, Number(row.total));
    }

    // Compute averages from known actual months for projection
    const knownInflows = Array.from(inflowMap.values());
    const knownOutflows = Array.from(outflowMap.values());
    const avgInflow = knownInflows.length > 0 ? knownInflows.reduce((a, b) => a + b, 0) / knownInflows.length : 0;
    const avgOutflow = knownOutflows.length > 0 ? knownOutflows.reduce((a, b) => a + b, 0) / knownOutflows.length : 0;

    let runningBalance = 0;
    let totalInflow = 0;
    let totalOutflow = 0;

    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const isActual = month <= currentMonth;
      const inflow = isActual ? (inflowMap.get(month) ?? 0) : avgInflow;
      const outflow = isActual ? (outflowMap.get(month) ?? 0) : avgOutflow;
      const net = inflow - outflow;
      runningBalance += net;
      totalInflow += inflow;
      totalOutflow += outflow;

      return {
        month,
        monthName: MONTH_NAMES[i]!,
        inflow,
        outflow,
        net,
        isActual,
        runningBalance,
      };
    });

    return c.json({
      months,
      summary: {
        totalInflow,
        totalOutflow,
        netCashFlow: totalInflow - totalOutflow,
      },
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /budgets/:id/cashflow');
  }
});
