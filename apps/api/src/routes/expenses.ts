import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';

export const expensesRouter = new Hono<{ Variables: TenantContext }>();

// ── Summary (must be before /:id to avoid route conflict) ────

expensesRouter.get('/summary', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const records = await db.query.entityRecords.findMany({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Expense'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  let totalSubmitted = 0;
  let totalApproved = 0;
  let totalPaid = 0;
  let pendingCount = 0;

  const categoryMap = new Map<string, { count: number; total: number }>();

  for (const record of records) {
    const d = record.data as Record<string, unknown>;
    const status = String(d['status'] ?? '');
    const amount = Number(d['amount'] ?? 0);
    const category = String(d['category'] ?? 'other');

    if (status === 'submitted') {
      totalSubmitted += amount;
      pendingCount++;
    } else if (status === 'approved') {
      totalApproved += amount;
    } else if (status === 'paid') {
      totalPaid += amount;
    }

    const existing = categoryMap.get(category) ?? { count: 0, total: 0 };
    categoryMap.set(category, { count: existing.count + 1, total: existing.total + amount });
  }

  const byCategory = Array.from(categoryMap.entries()).map(([category, { count, total }]) => ({
    category,
    count,
    total,
  }));

  return c.json({ totalSubmitted, totalApproved, totalPaid, byCategory, pendingCount });
});

// ── List ─────────────────────────────────────────────────────

expensesRouter.get('/', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const status = c.req.query('status');
  const employeeId = c.req.query('employeeId');
  const category = c.req.query('category');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Expense'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (status) {
    conditions.push(sql`${schema.entityRecords.data}->>'status' = ${status}`);
  }
  if (employeeId) {
    conditions.push(sql`${schema.entityRecords.data}->>'employee_id' = ${employeeId}`);
  }
  if (category) {
    conditions.push(sql`${schema.entityRecords.data}->>'category' = ${category}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return c.json(records);
});

// ── Get by ID ────────────────────────────────────────────────

expensesRouter.get('/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.id, c.req.param('id')),
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Expense'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

// ── Create ───────────────────────────────────────────────────

expensesRouter.post(
  '/',
  zValidator(
    'json',
    z.object({
      employee_id: z.string().optional(),
      employee_name: z.string().optional(),
      category: z.enum(['travel', 'meals', 'equipment', 'software', 'office', 'other']).default('other'),
      amount: z.number(),
      currency: z.string().default('USD'),
      date: z.string(),
      description: z.string().min(1),
      notes: z.string().optional(),
      status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'paid']).optional().default('draft'),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');
    const data = { ...body, status: body.status ?? 'draft' };

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Expense', data, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create expense' }, 500);
    return c.json(record, 201);
  },
);

// ── Update / status transitions ──────────────────────────────

expensesRouter.patch(
  '/:id',
  zValidator(
    'json',
    z.object({
      status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'paid']).optional(),
      notes: z.string().optional(),
      employee_id: z.string().optional(),
      employee_name: z.string().optional(),
      category: z.enum(['travel', 'meals', 'equipment', 'software', 'office', 'other']).optional(),
      amount: z.number().optional(),
      currency: z.string().optional(),
      date: z.string().optional(),
      description: z.string().optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const expense = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Expense'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!expense) return c.json({ error: 'Expense not found' }, 404);

    const existing = expense.data as Record<string, unknown>;
    const updated: Record<string, unknown> = { ...existing, ...body };

    // Store reviewer notes only when approving or rejecting
    if (body.status === 'approved' || body.status === 'rejected') {
      if (body.notes !== undefined) {
        updated['notes'] = body.notes;
      }
    }

    const [result] = await db
      .update(schema.entityRecords)
      .set({ data: updated, updatedAt: new Date() })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    return c.json(result);
  },
);
