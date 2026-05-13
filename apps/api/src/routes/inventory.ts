import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, ilike, sql } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';

export const inventoryRouter = new Hono<{ Variables: TenantContext }>();

// ── Products ──────────────────────────────────────────────────

inventoryRouter.get('/products', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const category = c.req.query('category');
  const search = c.req.query('search');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Product'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (category) {
    conditions.push(sql`${schema.entityRecords.data}->>'category' = ${category}`);
  }
  if (search) {
    conditions.push(ilike(sql`${schema.entityRecords.data}->>'name'`, `%${search}%`));
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  return c.json(records);
});

inventoryRouter.get('/products/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Product'),
      eq(schema.entityRecords.id, id),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!record) return c.json({ error: 'Product not found' }, 404);
  return c.json(record);
});

inventoryRouter.post(
  '/products',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      sku: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      unit_price: z.number().optional(),
      cost_price: z.number().optional(),
      unit_of_measure: z.enum(['each', 'kg', 'l', 'm', 'box', 'pack']).optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Product', data: body, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create product' }, 500);
    return c.json(record, 201);
  },
);

inventoryRouter.patch(
  '/products/:id',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).optional(),
      sku: z.string().min(1).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      unit_price: z.number().optional(),
      cost_price: z.number().optional(),
      unit_of_measure: z.enum(['each', 'kg', 'l', 'm', 'box', 'pack']).optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const product = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Product'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!product) return c.json({ error: 'Product not found' }, 404);

    const [updated] = await db
      .update(schema.entityRecords)
      .set({
        data: { ...(product.data as Record<string, unknown>), ...body },
        updatedAt: new Date(),
      })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    return c.json(updated);
  },
);

// ── Warehouses ────────────────────────────────────────────────

inventoryRouter.get('/warehouses', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const records = await db.query.entityRecords.findMany({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Warehouse'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  return c.json(records);
});

inventoryRouter.get('/warehouses/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Warehouse'),
      eq(schema.entityRecords.id, id),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!record) return c.json({ error: 'Warehouse not found' }, 404);
  return c.json(record);
});

inventoryRouter.post(
  '/warehouses',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      location: z.string().optional(),
      manager: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Warehouse', data: body, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create warehouse' }, 500);
    return c.json(record, 201);
  },
);

// ── Stock levels (computed from movements) ────────────────────

inventoryRouter.get('/stock', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const productId = c.req.query('productId');
  const warehouseId = c.req.query('warehouseId');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'StockMovement'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (productId) {
    conditions.push(sql`${schema.entityRecords.data}->>'product_id' = ${productId}`);
  }
  if (warehouseId) {
    conditions.push(sql`${schema.entityRecords.data}->>'warehouse_id' = ${warehouseId}`);
  }

  const movements = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  const levels: Record<string, number> = {};
  for (const m of movements) {
    const d = m.data as Record<string, unknown>;
    const key = `${String(d['product_id'] ?? '')}::${String(d['warehouse_id'] ?? '')}`;
    if (d['type'] === 'adjustment') levels[key] = Number(d['quantity']);
    else if (d['type'] === 'in') levels[key] = (levels[key] ?? 0) + Number(d['quantity']);
    else if (d['type'] === 'out') levels[key] = (levels[key] ?? 0) - Number(d['quantity']);
  }

  return c.json(
    Object.entries(levels).map(([key, qty]) => {
      const [pId, wId] = key.split('::');
      return { productId: pId, warehouseId: wId, quantity: qty };
    }),
  );
});

// ── Stock movements ───────────────────────────────────────────

inventoryRouter.get('/movements', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const productId = c.req.query('productId');
  const warehouseId = c.req.query('warehouseId');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'StockMovement'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (productId) {
    conditions.push(sql`${schema.entityRecords.data}->>'product_id' = ${productId}`);
  }
  if (warehouseId) {
    conditions.push(sql`${schema.entityRecords.data}->>'warehouse_id' = ${warehouseId}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  return c.json(records);
});

inventoryRouter.post(
  '/movements',
  zValidator(
    'json',
    z.object({
      type: z.enum(['in', 'out', 'adjustment']),
      product_id: z.string().min(1),
      warehouse_id: z.string().min(1),
      quantity: z.number(),
      reference: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'StockMovement', data: body, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to record movement' }, 500);
    return c.json(record, 201);
  },
);
