import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';

export const salesRouter = new Hono<{ Variables: TenantContext }>();

const SO_STATUSES = ['draft', 'confirmed', 'picking', 'shipped', 'delivered', 'cancelled'] as const;

// ── Sales Orders ───────────────────────────────────────────────

salesRouter.get('/orders', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const status = c.req.query('status');
  const customerId = c.req.query('customerId');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'SalesOrder'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (status) {
    conditions.push(sql`${schema.entityRecords.data}->>'status' = ${status}`);
  }
  if (customerId) {
    conditions.push(sql`${schema.entityRecords.data}->>'customer_id' = ${customerId}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  return c.json(records);
});

salesRouter.get('/orders/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'SalesOrder'),
      eq(schema.entityRecords.id, id),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!record) return c.json({ error: 'Sales order not found' }, 404);
  return c.json(record);
});

salesRouter.post(
  '/orders',
  zValidator(
    'json',
    z.object({
      customer_id: z.string().optional(),
      customer_name: z.string().min(1),
      order_date: z.string().optional(),
      delivery_date: z.string().optional(),
      items: z
        .array(
          z.object({
            description: z.string().min(1),
            quantity: z.number().positive(),
            unit_price: z.number().nonnegative(),
            product_id: z.string().optional(),
          }),
        )
        .optional()
        .default([]),
      total: z.number().nonnegative().optional().default(0),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const soNumber = `SO-${Date.now()}`;
    const data = { ...body, number: soNumber, status: 'draft' };

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'SalesOrder', data, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create sales order' }, 500);
    return c.json(record, 201);
  },
);

salesRouter.patch(
  '/orders/:id',
  zValidator(
    'json',
    z.object({
      status: z.enum(SO_STATUSES),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');
    const { status } = c.req.valid('json');

    const order = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'SalesOrder'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!order) return c.json({ error: 'Sales order not found' }, 404);

    const [updated] = await db
      .update(schema.entityRecords)
      .set({
        data: { ...(order.data as Record<string, unknown>), status },
        updatedAt: new Date(),
      })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    return c.json(updated);
  },
);
