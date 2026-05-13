import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';

export const projectsRouter = new Hono<{ Variables: TenantContext }>();

const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'] as const;
const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

// ── Tasks (registered before /:id to avoid route conflict) ────

projectsRouter.get('/tasks', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const projectId = c.req.query('projectId');
  const assigneeId = c.req.query('assigneeId');
  const status = c.req.query('status');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Task'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (projectId) {
    conditions.push(sql`${schema.entityRecords.data}->>'project_id' = ${projectId}`);
  }
  if (assigneeId) {
    conditions.push(sql`${schema.entityRecords.data}->>'assignee_id' = ${assigneeId}`);
  }
  if (status) {
    conditions.push(sql`${schema.entityRecords.data}->>'status' = ${status}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  return c.json(records);
});

projectsRouter.get('/tasks/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Task'),
      eq(schema.entityRecords.id, id),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!record) return c.json({ error: 'Task not found' }, 404);
  return c.json(record);
});

projectsRouter.post(
  '/tasks',
  zValidator(
    'json',
    z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      project_id: z.string().optional(),
      assignee: z.string().optional(),
      status: z.enum(TASK_STATUSES).optional().default('todo'),
      priority: z.enum(TASK_PRIORITIES).optional().default('medium'),
      due_date: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Task', data: body, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create task' }, 500);
    return c.json(record, 201);
  },
);

projectsRouter.patch(
  '/tasks/:id',
  zValidator(
    'json',
    z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      project_id: z.string().optional(),
      assignee: z.string().optional(),
      status: z.enum(TASK_STATUSES).optional(),
      priority: z.enum(TASK_PRIORITIES).optional(),
      due_date: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const task = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Task'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!task) return c.json({ error: 'Task not found' }, 404);

    const [updated] = await db
      .update(schema.entityRecords)
      .set({
        data: { ...(task.data as Record<string, unknown>), ...body },
        updatedAt: new Date(),
      })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    return c.json(updated);
  },
);

// ── Milestones (registered before /:id to avoid route conflict) ──

projectsRouter.get('/milestones', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const projectId = c.req.query('projectId');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Milestone'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (projectId) {
    conditions.push(sql`${schema.entityRecords.data}->>'project_id' = ${projectId}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  return c.json(records);
});

projectsRouter.post(
  '/milestones',
  zValidator(
    'json',
    z.object({
      title: z.string().min(1),
      project_id: z.string().min(1),
      due_date: z.string().optional(),
      description: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const data = { ...body, completed: false };

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Milestone', data, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create milestone' }, 500);
    return c.json(record, 201);
  },
);

projectsRouter.patch(
  '/milestones/:id',
  zValidator(
    'json',
    z.object({
      completed: z.boolean(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');
    const { completed } = c.req.valid('json');

    const milestone = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Milestone'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!milestone) return c.json({ error: 'Milestone not found' }, 404);

    const [updated] = await db
      .update(schema.entityRecords)
      .set({
        data: { ...(milestone.data as Record<string, unknown>), completed },
        updatedAt: new Date(),
      })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    return c.json(updated);
  },
);

// ── Projects (/:id must come after static sub-routes) ─────────

projectsRouter.get('/', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const status = c.req.query('status');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Project'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (status) {
    conditions.push(sql`${schema.entityRecords.data}->>'status' = ${status}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  return c.json(records);
});

projectsRouter.post(
  '/',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      status: z.enum(PROJECT_STATUSES).optional().default('planning'),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      owner: z.string().optional(),
      budget: z.number().nonnegative().optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Project', data: body, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create project' }, 500);
    return c.json(record, 201);
  },
);

projectsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Project'),
      eq(schema.entityRecords.id, id),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!record) return c.json({ error: 'Project not found' }, 404);
  return c.json(record);
});

projectsRouter.patch(
  '/:id',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(PROJECT_STATUSES).optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      owner: z.string().optional(),
      budget: z.number().nonnegative().optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const project = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Project'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!project) return c.json({ error: 'Project not found' }, 404);

    const [updated] = await db
      .update(schema.entityRecords)
      .set({
        data: { ...(project.data as Record<string, unknown>), ...body },
        updatedAt: new Date(),
      })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    return c.json(updated);
  },
);
