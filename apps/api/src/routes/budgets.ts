import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';

export const budgetsRouter = new Hono<{ Variables: TenantContext }>();

// ── Overview (must be before /:id to avoid route conflict) ────

budgetsRouter.get('/overview', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const [budgets, expenses, invoices] = await Promise.all([
    db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Budget'),
        isNull(schema.entityRecords.deletedAt),
      ),
    }),
    db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Expense'),
        isNull(schema.entityRecords.deletedAt),
      ),
    }),
    db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Invoice'),
        isNull(schema.entityRecords.deletedAt),
      ),
    }),
  ]);

  const overview = budgets.map((budget) => {
    const bd = budget.data as Record<string, unknown>;
    const allocated = Number(bd['allocated_amount'] ?? 0);
    const budgetCategory = String(bd['category'] ?? '').toLowerCase();

    const actualExpenses = expenses.reduce((sum, exp) => {
      const ed = exp.data as Record<string, unknown>;
      const status = String(ed['status'] ?? '');
      const category = String(ed['category'] ?? '').toLowerCase();
      if (
        (status === 'approved' || status === 'paid') &&
        category === budgetCategory
      ) {
        return sum + Number(ed['amount'] ?? 0);
      }
      return sum;
    }, 0);

    const actualInvoices = invoices.reduce((sum, inv) => {
      const id = inv.data as Record<string, unknown>;
      const category = String(id['category'] ?? '').toLowerCase();
      if (category === budgetCategory) {
        return sum + Number(id['amount'] ?? 0);
      }
      return sum;
    }, 0);

    const actual = actualExpenses + actualInvoices;
    const variance = allocated - actual;
    const utilizationPct = allocated > 0 ? ((actual / allocated) * 100).toFixed(1) : '0.0';

    return {
      budget,
      allocated,
      actual,
      variance,
      utilizationPct,
    };
  });

  return c.json(overview);
});

// ── List ─────────────────────────────────────────────────────

budgetsRouter.get('/', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const period = c.req.query('period');
  const year = c.req.query('year');
  const departmentId = c.req.query('department_id');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Budget'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (period) {
    conditions.push(sql`${schema.entityRecords.data}->>'period' = ${period}`);
  }
  if (year) {
    conditions.push(sql`(${schema.entityRecords.data}->>'year')::int = ${parseInt(year, 10)}`);
  }
  if (departmentId) {
    conditions.push(sql`${schema.entityRecords.data}->>'department_id' = ${departmentId}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return c.json(records);
});

// ── Get by ID ────────────────────────────────────────────────

budgetsRouter.get('/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.id, c.req.param('id')),
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Budget'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

// ── Create ───────────────────────────────────────────────────

budgetsRouter.post(
  '/',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      period: z.enum(['monthly', 'quarterly', 'annual']),
      year: z.number(),
      month: z.number().optional(),
      quarter: z.number().optional(),
      department_id: z.string().optional(),
      department_name: z.string().optional(),
      category: z.string().min(1),
      allocated_amount: z.number(),
      currency: z.string().default('USD'),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Budget', data: body, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create budget' }, 500);
    return c.json(record, 201);
  },
);

// ── Update ───────────────────────────────────────────────────

budgetsRouter.patch(
  '/:id',
  zValidator(
    'json',
    z.object({
      name: z.string().optional(),
      period: z.enum(['monthly', 'quarterly', 'annual']).optional(),
      year: z.number().optional(),
      month: z.number().optional(),
      quarter: z.number().optional(),
      department_id: z.string().optional(),
      department_name: z.string().optional(),
      category: z.string().optional(),
      allocated_amount: z.number().optional(),
      currency: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const budget = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Budget'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!budget) return c.json({ error: 'Budget not found' }, 404);

    const existing = budget.data as Record<string, unknown>;
    const updated: Record<string, unknown> = { ...existing, ...body };

    const [result] = await db
      .update(schema.entityRecords)
      .set({ data: updated, updatedAt: new Date() })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    return c.json(result);
  },
);

// ── Delete ───────────────────────────────────────────────────

budgetsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const budget = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Budget'),
      eq(schema.entityRecords.id, id),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!budget) return c.json({ error: 'Budget not found' }, 404);

  await db
    .update(schema.entityRecords)
    .set({ deletedAt: new Date() })
    .where(eq(schema.entityRecords.id, id));

  return c.json({ success: true });
});
