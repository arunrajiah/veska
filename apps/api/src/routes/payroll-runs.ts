import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const payrollRunsRouter = new Hono<{ Variables: TenantContext }>();

// ── Helpers ────────────────────────────────────────────────────

function computeGrossPay(baseSalary: number, period: string, hoursWorked: number): number {
  // If salary looks hourly (< 200), use hours-based calc when hours available
  if (hoursWorked > 0 && baseSalary < 200) {
    return hoursWorked * baseSalary;
  }
  if (period === 'bi-weekly') return baseSalary / 26 * 2;
  if (period === 'weekly') return baseSalary / 52;
  // monthly (default)
  return baseSalary;
}

function computeDeductions(grossPay: number) {
  const taxDeduction = grossPay * 0.20;
  const socialSecurity = grossPay * 0.062;
  const medicare = grossPay * 0.0145;
  const otherDeductions = 0;
  const totalDeductions = taxDeduction + socialSecurity + medicare + otherDeductions;
  return { taxDeduction, socialSecurity, medicare, otherDeductions, totalDeductions };
}

async function buildPayrollItems(
  tenantId: string,
  runId: string,
  period: string,
  periodStart: string,
  periodEnd: string,
) {
  // Fetch active employees from entityRecords
  const empResult = await sharedDb.execute(sql`
    SELECT id, data
    FROM "entityRecords"
    WHERE "tenantId" = ${tenantId}
      AND "entityType" = 'employee'
      AND data->>'status' = 'active'
      AND "deletedAt" IS NULL
  `);

  type EmpRow = { id: string; data: Record<string, unknown> };
  const employees = empResult.rows as EmpRow[];

  const items: Array<Record<string, unknown>> = [];

  for (const emp of employees) {
    const employeeId = String(emp.data['id'] ?? emp.id);
    const employeeName = String(emp.data['name'] ?? emp.data['fullName'] ?? 'Unknown');
    const employeeEmail = emp.data['email'] ? String(emp.data['email']) : null;
    const baseSalary = Number(emp.data['salary'] ?? 0);

    // Query hours worked from timeEntries
    const hoursResult = await sharedDb.execute(sql`
      SELECT COALESCE(SUM(minutes), 0) / 60.0 AS hours
      FROM "timeEntries"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${employeeId}
        AND date BETWEEN ${periodStart}::date AND ${periodEnd}::date
    `);
    const hoursWorked = Number((hoursResult.rows[0] as { hours: string } | undefined)?.hours ?? 0);

    const grossPay = computeGrossPay(baseSalary, period, hoursWorked);
    const { taxDeduction, socialSecurity, medicare, otherDeductions, totalDeductions } = computeDeductions(grossPay);
    const netPay = grossPay - totalDeductions;

    items.push({
      tenantId,
      runId,
      employeeId,
      employeeName,
      employeeEmail,
      baseSalary,
      hoursWorked: hoursWorked > 0 ? hoursWorked : null,
      overtimeHours: 0,
      grossPay,
      taxDeduction,
      socialSecurity,
      medicare,
      otherDeductions,
      totalDeductions,
      netPay,
    });
  }

  return items;
}

async function insertItemsAndUpdateTotals(
  tenantId: string,
  runId: string,
  items: Array<Record<string, unknown>>,
) {
  // Insert all items
  for (const item of items) {
    await sharedDb.execute(sql`
      INSERT INTO "payrollItems" (
        "tenantId", "runId", "employeeId", "employeeName", "employeeEmail",
        "baseSalary", "hoursWorked", "overtimeHours", "grossPay",
        "taxDeduction", "socialSecurity", medicare, "otherDeductions",
        "totalDeductions", "netPay"
      ) VALUES (
        ${item['tenantId'] as string},
        ${item['runId'] as string},
        ${item['employeeId'] as string},
        ${item['employeeName'] as string},
        ${item['employeeEmail'] as string | null},
        ${item['baseSalary'] as number},
        ${item['hoursWorked'] as number | null},
        ${item['overtimeHours'] as number},
        ${item['grossPay'] as number},
        ${item['taxDeduction'] as number},
        ${item['socialSecurity'] as number},
        ${item['medicare'] as number},
        ${item['otherDeductions'] as number},
        ${item['totalDeductions'] as number},
        ${item['netPay'] as number}
      )
    `);
  }

  // Update run totals
  await sharedDb.execute(sql`
    UPDATE "payrollRuns"
    SET
      "totalGross"      = (SELECT COALESCE(SUM("grossPay"), 0) FROM "payrollItems" WHERE "runId" = ${runId} AND "tenantId" = ${tenantId}),
      "totalDeductions" = (SELECT COALESCE(SUM("totalDeductions"), 0) FROM "payrollItems" WHERE "runId" = ${runId} AND "tenantId" = ${tenantId}),
      "totalNet"        = (SELECT COALESCE(SUM("netPay"), 0) FROM "payrollItems" WHERE "runId" = ${runId} AND "tenantId" = ${tenantId}),
      "employeeCount"   = (SELECT COUNT(*) FROM "payrollItems" WHERE "runId" = ${runId} AND "tenantId" = ${tenantId}),
      "updatedAt"       = now()
    WHERE id = ${runId} AND "tenantId" = ${tenantId}
  `);
}

// ── Summary (must be before /:id) ─────────────────────────────

payrollRunsRouter.get('/summary', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const currentYear = new Date().getFullYear();

    const monthlyResult = await sharedDb.execute(sql`
      SELECT
        EXTRACT(MONTH FROM r."periodStart")::int AS month,
        COALESCE(SUM(i."grossPay"), 0) AS "totalGross",
        COUNT(DISTINCT i."employeeId") AS headcount
      FROM "payrollRuns" r
      JOIN "payrollItems" i ON i."runId" = r.id AND i."tenantId" = r."tenantId"
      WHERE r."tenantId" = ${tenantId}
        AND r.status = 'paid'
        AND EXTRACT(YEAR FROM r."periodStart") = ${currentYear}
      GROUP BY 1
      ORDER BY 1
    `);

    const ytdResult = await sharedDb.execute(sql`
      SELECT COALESCE(SUM(i."grossPay"), 0) AS "ytdTotal"
      FROM "payrollRuns" r
      JOIN "payrollItems" i ON i."runId" = r.id AND i."tenantId" = r."tenantId"
      WHERE r."tenantId" = ${tenantId}
        AND r.status = 'paid'
        AND EXTRACT(YEAR FROM r."periodStart") = ${currentYear}
    `);

    type MonthRow = { month: number; totalGross: string; headcount: string };
    const byMonth = (monthlyResult.rows as MonthRow[]).map((r) => ({
      month: r.month,
      totalGross: Number(r.totalGross),
      headcount: Number(r.headcount),
    }));

    const ytdTotal = Number((ytdResult.rows[0] as { ytdTotal: string } | undefined)?.ytdTotal ?? 0);

    return c.json({ byMonth, ytdTotal, year: currentYear });
  } catch (err) {
    return handleRouteError(c, err, 'GET /payroll-runs/summary');
  }
});

// ── List runs ──────────────────────────────────────────────────

payrollRunsRouter.get('/', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const status = c.req.query('status');
    const year = c.req.query('year');

    const result = await sharedDb.execute(sql`
      SELECT *
      FROM "payrollRuns"
      WHERE "tenantId" = ${tenantId}
        AND (${status ?? null} IS NULL OR status = ${status ?? null})
        AND (${year ?? null} IS NULL OR EXTRACT(YEAR FROM "periodStart") = ${year ? parseInt(year, 10) : null}::integer)
      ORDER BY "createdAt" DESC
    `);

    return c.json(result.rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /payroll-runs');
  }
});

// ── Create run ─────────────────────────────────────────────────

const createRunSchema = z.object({
  name: z.string().min(1),
  period: z.enum(['monthly', 'bi-weekly', 'weekly']),
  periodStart: z.string(),
  periodEnd: z.string(),
  currency: z.string().default('USD'),
  notes: z.string().optional(),
});

payrollRunsRouter.post('/', zValidator('json', createRunSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    // Create the run record
    const runResult = await sharedDb.execute(sql`
      INSERT INTO "payrollRuns" (
        "tenantId", name, period, "periodStart", "periodEnd", currency, notes
      ) VALUES (
        ${tenantId}, ${body.name}, ${body.period},
        ${body.periodStart}::date, ${body.periodEnd}::date,
        ${body.currency}, ${body.notes ?? null}
      )
      RETURNING *
    `);

    const run = runResult.rows[0] as { id: string } | undefined;
    if (!run) return c.json({ error: 'Failed to create payroll run' }, 500);

    // Build and insert payroll items
    const items = await buildPayrollItems(tenantId, run.id, body.period, body.periodStart, body.periodEnd);
    await insertItemsAndUpdateTotals(tenantId, run.id, items);

    // Return run with items
    const updatedRun = await sharedDb.execute(sql`
      SELECT * FROM "payrollRuns" WHERE id = ${run.id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    const itemsResult = await sharedDb.execute(sql`
      SELECT * FROM "payrollItems" WHERE "runId" = ${run.id} AND "tenantId" = ${tenantId} ORDER BY "employeeName"
    `);

    return c.json({ ...updatedRun.rows[0], items: itemsResult.rows }, 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /payroll-runs');
  }
});

// ── Get run with items ─────────────────────────────────────────

payrollRunsRouter.get('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const runResult = await sharedDb.execute(sql`
      SELECT * FROM "payrollRuns" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if (!runResult.rows[0]) return c.json({ error: 'Not found' }, 404);

    const itemsResult = await sharedDb.execute(sql`
      SELECT * FROM "payrollItems" WHERE "runId" = ${id} AND "tenantId" = ${tenantId} ORDER BY "employeeName"
    `);

    return c.json({ ...runResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    return handleRouteError(c, err, 'GET /payroll-runs/:id');
  }
});

// ── Update run metadata ────────────────────────────────────────

const updateRunSchema = z.object({
  name: z.string().min(1).optional(),
  notes: z.string().optional(),
  currency: z.string().optional(),
});

payrollRunsRouter.put('/:id', zValidator('json', updateRunSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');
    const body = c.req.valid('json');

    const check = await sharedDb.execute(sql`
      SELECT id, status FROM "payrollRuns" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    const existing = check.rows[0] as { id: string; status: string } | undefined;
    if (!existing) return c.json({ error: 'Not found' }, 404);
    if (existing.status === 'paid') return c.json({ error: 'Cannot update a paid payroll run' }, 400);

    const result = await sharedDb.execute(sql`
      UPDATE "payrollRuns"
      SET
        name       = COALESCE(${body.name ?? null}, name),
        notes      = COALESCE(${body.notes ?? null}, notes),
        currency   = COALESCE(${body.currency ?? null}, currency),
        "updatedAt" = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    return c.json(result.rows[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /payroll-runs/:id');
  }
});

// ── Delete run ─────────────────────────────────────────────────

payrollRunsRouter.delete('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const check = await sharedDb.execute(sql`
      SELECT id, status FROM "payrollRuns" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    const existing = check.rows[0] as { id: string; status: string } | undefined;
    if (!existing) return c.json({ error: 'Not found' }, 404);
    if (existing.status !== 'draft') return c.json({ error: 'Only draft payroll runs can be deleted' }, 400);

    await sharedDb.execute(sql`DELETE FROM "payrollRuns" WHERE id = ${id} AND "tenantId" = ${tenantId}`);

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /payroll-runs/:id');
  }
});

// ── Update status ──────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['processing', 'cancelled'],
  processing: ['approved', 'cancelled'],
  approved: ['paid', 'cancelled'],
};

const updateStatusSchema = z.object({
  status: z.enum(['processing', 'approved', 'paid', 'cancelled']),
  approvedBy: z.string().optional(),
});

payrollRunsRouter.put('/:id/status', zValidator('json', updateStatusSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');
    const { status, approvedBy } = c.req.valid('json');

    const check = await sharedDb.execute(sql`
      SELECT id, status FROM "payrollRuns" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    const existing = check.rows[0] as { id: string; status: string } | undefined;
    if (!existing) return c.json({ error: 'Not found' }, 404);

    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(status)) {
      return c.json({ error: `Cannot transition from '${existing.status}' to '${status}'` }, 400);
    }

    const isApproving = status === 'approved';
    const isPaying = status === 'paid';

    const result = await sharedDb.execute(sql`
      UPDATE "payrollRuns"
      SET
        status      = ${status},
        "approvedBy" = CASE WHEN ${isApproving} THEN COALESCE(${approvedBy ?? null}, "approvedBy") ELSE "approvedBy" END,
        "approvedAt" = CASE WHEN ${isApproving} AND "approvedAt" IS NULL THEN now() ELSE "approvedAt" END,
        "paidAt"    = CASE WHEN ${isPaying} AND "paidAt" IS NULL THEN now() ELSE "paidAt" END,
        "updatedAt" = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    return c.json(result.rows[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /payroll-runs/:id/status');
  }
});

// ── Recalculate ────────────────────────────────────────────────

payrollRunsRouter.post('/:id/recalculate', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const check = await sharedDb.execute(sql`
      SELECT id, status, period, "periodStart", "periodEnd"
      FROM "payrollRuns"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      LIMIT 1
    `);
    const run = check.rows[0] as {
      id: string;
      status: string;
      period: string;
      periodStart: string;
      periodEnd: string;
    } | undefined;

    if (!run) return c.json({ error: 'Not found' }, 404);
    if (!['draft', 'processing'].includes(run.status)) {
      return c.json({ error: 'Recalculation only allowed for draft or processing runs' }, 400);
    }

    // Delete existing items
    await sharedDb.execute(sql`
      DELETE FROM "payrollItems" WHERE "runId" = ${id} AND "tenantId" = ${tenantId}
    `);

    const periodStart = typeof run.periodStart === 'string'
      ? run.periodStart.slice(0, 10)
      : new Date(run.periodStart as unknown as string).toISOString().slice(0, 10);
    const periodEnd = typeof run.periodEnd === 'string'
      ? run.periodEnd.slice(0, 10)
      : new Date(run.periodEnd as unknown as string).toISOString().slice(0, 10);

    const items = await buildPayrollItems(tenantId, id, run.period, periodStart, periodEnd);
    await insertItemsAndUpdateTotals(tenantId, id, items);

    const updatedRun = await sharedDb.execute(sql`
      SELECT * FROM "payrollRuns" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    const itemsResult = await sharedDb.execute(sql`
      SELECT * FROM "payrollItems" WHERE "runId" = ${id} AND "tenantId" = ${tenantId} ORDER BY "employeeName"
    `);

    return c.json({ ...updatedRun.rows[0], items: itemsResult.rows });
  } catch (err) {
    return handleRouteError(c, err, 'POST /payroll-runs/:id/recalculate');
  }
});

// ── Generate payslip HTML ──────────────────────────────────────

payrollRunsRouter.get('/:id/payslip/:itemId', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const runId = c.req.param('id');
    const itemId = c.req.param('itemId');

    const runResult = await sharedDb.execute(sql`
      SELECT * FROM "payrollRuns" WHERE id = ${runId} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    const run = runResult.rows[0] as {
      name: string;
      period: string;
      periodStart: string;
      periodEnd: string;
      currency: string;
    } | undefined;
    if (!run) return c.json({ error: 'Run not found' }, 404);

    const itemResult = await sharedDb.execute(sql`
      SELECT * FROM "payrollItems"
      WHERE id = ${itemId} AND "runId" = ${runId} AND "tenantId" = ${tenantId}
      LIMIT 1
    `);
    const item = itemResult.rows[0] as {
      employeeName: string;
      employeeEmail: string | null;
      baseSalary: string;
      hoursWorked: string | null;
      grossPay: string;
      taxDeduction: string;
      socialSecurity: string;
      medicare: string;
      otherDeductions: string;
      totalDeductions: string;
      netPay: string;
    } | undefined;
    if (!item) return c.json({ error: 'Payslip item not found' }, 404);

    const fmt = (n: string | number) =>
      Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const periodLabel = `${run.periodStart} — ${run.periodEnd}`;
    const currency = run.currency;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Payslip — ${item.employeeName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #222; background: #fff; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a56db; padding-bottom: 16px; margin-bottom: 24px; }
  .company { font-size: 22px; font-weight: 700; color: #1a56db; }
  .company-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .payslip-title { font-size: 16px; font-weight: 600; text-align: right; }
  .period { font-size: 11px; color: #6b7280; text-align: right; margin-top: 4px; }
  .employee-section { display: flex; gap: 32px; background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
  .employee-section div { flex: 1; }
  .label { font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 2px; }
  .value { font-size: 13px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
  td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; }
  td:last-child { text-align: right; font-weight: 500; }
  .section-title { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
  .net-pay-box { background: #1a56db; color: #fff; border-radius: 8px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
  .net-pay-label { font-size: 14px; font-weight: 600; }
  .net-pay-amount { font-size: 22px; font-weight: 700; }
  .footer { margin-top: 32px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="company">Veska ERP</div>
    <div class="company-sub">Payroll Department</div>
  </div>
  <div>
    <div class="payslip-title">Pay Slip</div>
    <div class="period">Period: ${periodLabel}</div>
    <div class="period">Run: ${run.name}</div>
  </div>
</div>

<div class="employee-section">
  <div>
    <div class="label">Employee Name</div>
    <div class="value">${item.employeeName}</div>
  </div>
  <div>
    <div class="label">Email</div>
    <div class="value">${item.employeeEmail ?? '—'}</div>
  </div>
  <div>
    <div class="label">Pay Period</div>
    <div class="value">${periodLabel}</div>
  </div>
  <div>
    <div class="label">Currency</div>
    <div class="value">${currency}</div>
  </div>
</div>

<div class="section-title">Earnings</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right">Amount (${currency})</th></tr></thead>
  <tbody>
    <tr><td>Base Salary</td><td>${fmt(item.baseSalary)}</td></tr>
    ${item.hoursWorked ? `<tr><td>Hours Worked</td><td>${fmt(item.hoursWorked)} hrs</td></tr>` : ''}
    <tr><td><strong>Gross Pay</strong></td><td><strong>${fmt(item.grossPay)}</strong></td></tr>
  </tbody>
</table>

<div class="section-title">Deductions</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right">Amount (${currency})</th></tr></thead>
  <tbody>
    <tr><td>Federal Income Tax (20%)</td><td>${fmt(item.taxDeduction)}</td></tr>
    <tr><td>Social Security (6.2%)</td><td>${fmt(item.socialSecurity)}</td></tr>
    <tr><td>Medicare (1.45%)</td><td>${fmt(item.medicare)}</td></tr>
    ${Number(item.otherDeductions) > 0 ? `<tr><td>Other Deductions</td><td>${fmt(item.otherDeductions)}</td></tr>` : ''}
    <tr><td><strong>Total Deductions</strong></td><td><strong>${fmt(item.totalDeductions)}</strong></td></tr>
  </tbody>
</table>

<div class="net-pay-box">
  <div class="net-pay-label">Net Pay</div>
  <div class="net-pay-amount">${currency} ${fmt(item.netPay)}</div>
</div>

<div class="footer">
  Generated by Veska ERP &bull; This is an official payroll document. Please retain for your records.
</div>
</body>
</html>`;

    // Mark payslip as generated
    await sharedDb.execute(sql`
      UPDATE "payrollItems" SET "payslipGenerated" = true WHERE id = ${itemId} AND "tenantId" = ${tenantId}
    `);

    return c.json({ html, employeeName: item.employeeName, period: periodLabel });
  } catch (err) {
    return handleRouteError(c, err, 'GET /payroll-runs/:id/payslip/:itemId');
  }
});
