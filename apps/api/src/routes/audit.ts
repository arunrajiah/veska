import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { schema } from '@veska/core';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const auditRouter = new Hono<{ Variables: TenantContext }>();

// GET / — list audit events for tenant
auditRouter.get('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const action = c.req.query('action');
  const resourceType = c.req.query('resourceType');
  const limitParam = c.req.query('limit');
  const limit = Math.min(parseInt(limitParam ?? '50', 10), 200);

  const conditions: ReturnType<typeof eq>[] = [
    eq(schema.auditLog.tenantId, tenantId),
  ];

  if (action) {
    conditions.push(eq(schema.auditLog.action, action));
  }
  if (resourceType) {
    conditions.push(eq(schema.auditLog.resourceType, resourceType));
  }

  const events = await sharedDb.query.auditLog.findMany({
    where: and(...conditions),
    orderBy: [desc(schema.auditLog.createdAt)],
    limit,
  });

  return c.json({ events });
});

// GET /:id — get single audit event
auditRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');

  const event = await sharedDb.query.auditLog.findFirst({
    where: and(
      eq(schema.auditLog.id, id),
      eq(schema.auditLog.tenantId, tenantId),
    ),
  });

  if (!event) {
    return c.json({ error: 'Audit event not found' }, 404);
  }

  return c.json(event);
});
