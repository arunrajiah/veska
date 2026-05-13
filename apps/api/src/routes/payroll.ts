import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';

export const payrollRouter = new Hono<{ Variables: TenantContext }>();

// ── Helper: create notification directly via db ──────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createNotification(
  db: any,
  tenantId: string,
  title: string,
  body: string,
  type: 'info' | 'warning' | 'success' | 'error' = 'info',
) {
  try {
    await db.insert(schema.notifications).values({ tenantId, title, body, type });
  } catch {
    // best-effort; don't fail the main request
  }
}

// ── Pay Runs ─────────────────────────────────────────────────

payrollRouter.get('/runs', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const status = c.req.query('status');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'PayRun'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (status) {
    conditions.push(sql`${schema.entityRecords.data}->>'status' = ${status}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return c.json(records);
});

payrollRouter.get('/runs/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.id, id),
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'PayRun'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!record) return c.json({ error: 'Not found' }, 404);

  // Fetch all payslips for this pay run
  const payslips = await db.query.entityRecords.findMany({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Payslip'),
      isNull(schema.entityRecords.deletedAt),
      sql`${schema.entityRecords.data}->>'pay_run_id' = ${id}`,
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return c.json({ ...record, payslips });
});

payrollRouter.post(
  '/runs',
  zValidator(
    'json',
    z.object({
      period_start: z.string(),
      period_end: z.string(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const data = {
      ...body,
      status: 'draft',
      total_gross: 0,
      total_net: 0,
      total_deductions: 0,
      employee_count: 0,
    };

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'PayRun', data, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create pay run' }, 500);
    return c.json(record, 201);
  },
);

payrollRouter.patch(
  '/runs/:id',
  zValidator(
    'json',
    z.object({
      period_start: z.string().optional(),
      period_end: z.string().optional(),
      status: z.enum(['draft', 'processing', 'completed', 'cancelled']).optional(),
      total_gross: z.number().optional(),
      total_net: z.number().optional(),
      total_deductions: z.number().optional(),
      employee_count: z.number().optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const payRun = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'PayRun'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!payRun) return c.json({ error: 'Pay run not found' }, 404);

    const existing = payRun.data as Record<string, unknown>;
    const updated: Record<string, unknown> = { ...existing, ...body };

    const [result] = await db
      .update(schema.entityRecords)
      .set({ data: updated, updatedAt: new Date() })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    // Notification when status transitions to completed
    if (body.status === 'completed' && existing['status'] !== 'completed') {
      const periodStart = String(updated['period_start'] ?? '');
      const periodEnd = String(updated['period_end'] ?? '');
      const period = periodStart && periodEnd ? `${periodStart} – ${periodEnd}` : 'the period';
      await createNotification(
        db as any,
        tenantId,
        'Pay run completed',
        `Pay run for ${period} has been processed.`,
        'success',
      );
    }

    return c.json(result);
  },
);

// ── Payslips ─────────────────────────────────────────────────

payrollRouter.get('/payslips', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const payRunId = c.req.query('payRunId');
  const employeeId = c.req.query('employeeId');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Payslip'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (payRunId) {
    conditions.push(sql`${schema.entityRecords.data}->>'pay_run_id' = ${payRunId}`);
  }
  if (employeeId) {
    conditions.push(sql`${schema.entityRecords.data}->>'employee_id' = ${employeeId}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return c.json(records);
});

payrollRouter.get('/payslips/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.id, c.req.param('id')),
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Payslip'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

payrollRouter.post(
  '/payslips',
  zValidator(
    'json',
    z.object({
      pay_run_id: z.string(),
      employee_id: z.string(),
      employee_name: z.string(),
      gross_pay: z.number(),
      deductions: z.number(),
      period_start: z.string(),
      period_end: z.string(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const net_pay = body.gross_pay - body.deductions;
    const data = { ...body, net_pay, status: 'draft' };

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Payslip', data, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create payslip' }, 500);
    return c.json(record, 201);
  },
);

payrollRouter.patch(
  '/payslips/:id',
  zValidator(
    'json',
    z.object({
      pay_run_id: z.string().optional(),
      employee_id: z.string().optional(),
      employee_name: z.string().optional(),
      gross_pay: z.number().optional(),
      deductions: z.number().optional(),
      net_pay: z.number().optional(),
      period_start: z.string().optional(),
      period_end: z.string().optional(),
      status: z.enum(['draft', 'paid']).optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const payslip = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Payslip'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!payslip) return c.json({ error: 'Payslip not found' }, 404);

    const existing = payslip.data as Record<string, unknown>;
    const updated: Record<string, unknown> = { ...existing, ...body };

    // Recompute net_pay if gross or deductions changed and net_pay not explicitly provided
    if ((body.gross_pay !== undefined || body.deductions !== undefined) && body.net_pay === undefined) {
      const gross = typeof body.gross_pay === 'number' ? body.gross_pay : Number(existing['gross_pay'] ?? 0);
      const deductions = typeof body.deductions === 'number' ? body.deductions : Number(existing['deductions'] ?? 0);
      updated['net_pay'] = gross - deductions;
    }

    const [result] = await db
      .update(schema.entityRecords)
      .set({ data: updated, updatedAt: new Date() })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    return c.json(result);
  },
);
