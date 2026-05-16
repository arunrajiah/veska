import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const grnRouter = new Hono<{ Variables: TenantContext }>();

const grnItemSchema = z.object({
  product_id: z.string().optional(),
  product_name: z.string().min(1),
  ordered_qty: z.number().nonnegative(),
  received_qty: z.number().nonnegative(),
  unit_cost: z.number().nonnegative().optional(),
});

const grnBodySchema = z.object({
  po_id: z.string().min(1),
  po_number: z.string().min(1),
  received_date: z.string().min(1),
  received_by: z.string().optional(),
  warehouse_id: z.string().optional(),
  warehouse_name: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(grnItemSchema).min(1),
});

// GET /grn — list GRNs, optional ?poId= filter, newest first
grnRouter.get('/', async (c) => {
  try {
    const { db, tenantId } = c.get('tenantCtx');
    const poId = c.req.query('poId');

    const conditions = [
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'GoodsReceivedNote'),
      isNull(schema.entityRecords.deletedAt),
    ];

    if (poId) {
      conditions.push(sql`${schema.entityRecords.data}->>'po_id' = ${poId}`);
    }

    const records = await db.query.entityRecords.findMany({
      where: and(...conditions),
      orderBy: [desc(schema.entityRecords.createdAt)],
    });

    return c.json(records);
  } catch (err) {
    return handleRouteError(c, err, 'GET /grn');
  }
});

// GET /grn/:id
grnRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');

    const record = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'GoodsReceivedNote'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!record) return c.json({ error: 'Goods received note not found' }, 404);
    return c.json(record);
  } catch (err) {
    return handleRouteError(c, err, 'GET /grn/:id');
  }
});

// POST /grn — create GRN + auto stock movements
grnRouter.post('/', zValidator('json', grnBodySchema), async (c) => {
  try {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    // Create the GRN record initially as draft
    const [grnRecord] = await db
      .insert(schema.entityRecords)
      .values({
        tenantId,
        entityType: 'GoodsReceivedNote',
        data: { ...body, status: 'draft' },
        createdBy: identityId,
      })
      .returning();

    if (!grnRecord) return c.json({ error: 'Failed to create goods received note' }, 500);

    // Create StockMovement records for each item with received_qty > 0
    for (const item of body.items) {
      if (item.received_qty > 0) {
        await db.insert(schema.entityRecords).values({
          tenantId,
          entityType: 'StockMovement',
          data: {
            product_id: item.product_id ?? '',
            product_name: item.product_name,
            warehouse_id: body.warehouse_id ?? 'default',
            type: 'in',
            quantity: item.received_qty,
            reference: `GRN-${grnRecord.id.slice(0, 8)}`,
            notes: `Received via PO ${body.po_number}`,
          },
          createdBy: identityId,
        });
      }
    }

    // Update GRN status to posted
    const [posted] = await db
      .update(schema.entityRecords)
      .set({
        data: { ...body, status: 'posted' },
        updatedAt: new Date(),
      })
      .where(eq(schema.entityRecords.id, grnRecord.id))
      .returning();

    return c.json(posted ?? grnRecord, 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /grn');
  }
});

// DELETE /grn/:id — only if status is draft
grnRouter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');

    const record = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'GoodsReceivedNote'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!record) return c.json({ error: 'Goods received note not found' }, 404);

    const status = ((record.data as Record<string, unknown>)['status'] ?? 'draft') as string;
    if (status !== 'draft') {
      return c.json({ error: 'Only draft GRNs can be deleted' }, 422);
    }

    await db
      .update(schema.entityRecords)
      .set({ deletedAt: new Date() })
      .where(eq(schema.entityRecords.id, id));

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /grn/:id');
  }
});
