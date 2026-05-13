import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';

export const notificationsRouter = new Hono<{ Variables: TenantContext }>();

// GET /notifications — list unread (or all with ?all=true), ordered by createdAt desc, limit 50
notificationsRouter.get('/', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const all = c.req.query('all') === 'true';

  const conditions = [eq(schema.notifications.tenantId, tenantId)];
  if (!all) {
    conditions.push(eq(schema.notifications.read, false));
  }

  const records = await db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: [desc(schema.notifications.createdAt)],
    limit: 50,
  });

  return c.json(records);
});

// GET /notifications/unread-count — returns { count: number }
notificationsRouter.get('/unread-count', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const records = await db.query.notifications.findMany({
    where: and(
      eq(schema.notifications.tenantId, tenantId),
      eq(schema.notifications.read, false),
    ),
  });

  return c.json({ count: records.length });
});

// PATCH /notifications/:id/read — mark one as read
notificationsRouter.patch('/:id/read', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const notification = await db.query.notifications.findFirst({
    where: and(
      eq(schema.notifications.tenantId, tenantId),
      eq(schema.notifications.id, id),
    ),
  });

  if (!notification) return c.json({ error: 'Notification not found' }, 404);

  const [updated] = await db
    .update(schema.notifications)
    .set({ read: true })
    .where(and(
      eq(schema.notifications.tenantId, tenantId),
      eq(schema.notifications.id, id),
    ))
    .returning();

  return c.json(updated);
});

// POST /notifications/read-all — mark all as read for tenant
notificationsRouter.post('/read-all', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  await db
    .update(schema.notifications)
    .set({ read: true })
    .where(and(
      eq(schema.notifications.tenantId, tenantId),
      eq(schema.notifications.read, false),
    ));

  return c.json({ success: true });
});

// POST /notifications — create (internal use)
notificationsRouter.post(
  '/',
  zValidator(
    'json',
    z.object({
      title: z.string().min(1),
      body: z.string().optional(),
      type: z.enum(['info', 'warning', 'success', 'error']).optional().default('info'),
      link: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [record] = await db
      .insert(schema.notifications)
      .values({ tenantId, ...body })
      .returning();

    if (!record) return c.json({ error: 'Failed to create notification' }, 500);
    return c.json(record, 201);
  },
);
