import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';

export const purchasingRouter = new Hono<{ Variables: TenantContext }>();

const PO_STATUSES = ['draft', 'sent', 'received', 'cancelled'] as const;
const PAYMENT_TERMS = ['net30', 'net60', 'net90', 'immediate'] as const;

// ── Vendors ───────────────────────────────────────────────────

purchasingRouter.get('/vendors', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const records = await db.query.entityRecords.findMany({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Vendor'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  return c.json(records);
});

purchasingRouter.get('/vendors/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Vendor'),
      eq(schema.entityRecords.id, id),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!record) return c.json({ error: 'Vendor not found' }, 404);
  return c.json(record);
});

purchasingRouter.post(
  '/vendors',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      payment_terms: z.enum(PAYMENT_TERMS).optional(),
      contact_person: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Vendor', data: body, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create vendor' }, 500);
    return c.json(record, 201);
  },
);

// ── Purchase Orders ────────────────────────────────────────────

purchasingRouter.get('/orders', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const status = c.req.query('status');
  const vendorId = c.req.query('vendorId');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'PurchaseOrder'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (status) {
    conditions.push(sql`${schema.entityRecords.data}->>'status' = ${status}`);
  }
  if (vendorId) {
    conditions.push(sql`${schema.entityRecords.data}->>'vendor_id' = ${vendorId}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  return c.json(records);
});

purchasingRouter.get('/orders/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'PurchaseOrder'),
      eq(schema.entityRecords.id, id),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!record) return c.json({ error: 'Purchase order not found' }, 404);
  return c.json(record);
});

purchasingRouter.post(
  '/orders',
  zValidator(
    'json',
    z.object({
      vendor_id: z.string().min(1),
      order_date: z.string().optional(),
      expected_date: z.string().optional(),
      items: z
        .array(
          z.object({
            description: z.string().min(1),
            quantity: z.number().positive(),
            unit_price: z.number().nonnegative(),
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

    const poNumber = `PO-${Date.now()}`;
    const data = { ...body, number: poNumber, status: 'draft' };

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'PurchaseOrder', data, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create purchase order' }, 500);
    return c.json(record, 201);
  },
);

purchasingRouter.patch(
  '/orders/:id',
  zValidator(
    'json',
    z.object({
      status: z.enum(PO_STATUSES),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');
    const { status } = c.req.valid('json');

    const order = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'PurchaseOrder'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!order) return c.json({ error: 'Purchase order not found' }, 404);

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
