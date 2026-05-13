import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';

export const entitiesRouter = new Hono<{ Variables: TenantContext }>();

// List entity definitions
entitiesRouter.get('/definitions', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const defs = await db.query.entityDefinitions.findMany({
    where: eq(schema.entityDefinitions.tenantId, tenantId),
  });
  return c.json(defs);
});

// List records of a given entity type
entitiesRouter.get('/:entityType', async (c) => {
  const entityType = c.req.param('entityType');
  const { db, tenantId } = c.get('tenantCtx');

  const records = await db.query.entityRecords.findMany({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, entityType),
      isNull(schema.entityRecords.deletedAt),
    ),
  });
  return c.json(records);
});

// Get a single record
entitiesRouter.get('/:entityType/:id', async (c) => {
  const entityType = c.req.param('entityType');
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, entityType),
      eq(schema.entityRecords.id, id),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

// Create a record
entitiesRouter.post(
  '/:entityType',
  zValidator('json', z.object({ data: z.record(z.string(), z.unknown()) })),
  async (c) => {
    const entityType = c.req.param('entityType');
    const { data } = c.req.valid('json');
    const { db, tenantId, identityId } = c.get('tenantCtx');

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType, data, createdBy: identityId })
      .returning();

    return c.json(record, 201);
  },
);

// Soft-delete a record
entitiesRouter.delete('/:entityType/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  await db
    .update(schema.entityRecords)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.id, id),
      ),
    );

  return c.json({ success: true });
});
