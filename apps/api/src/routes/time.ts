import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';

export const timeRouter = new Hono<{ Variables: TenantContext }>();

// ── Summary (must be before /:id to avoid route conflict) ────

timeRouter.get('/entries/summary', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const records = await db.query.entityRecords.findMany({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'TimeEntry'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  // Determine Monday of current week (Mon–Sun)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - daysFromMon);
  thisMonday.setHours(0, 0, 0, 0);

  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  thisSunday.setHours(23, 59, 59, 999);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  lastSunday.setHours(23, 59, 59, 999);

  let totalHours = 0;
  let billableHours = 0;
  let nonBillableHours = 0;
  let thisWeekHours = 0;
  let lastWeekHours = 0;

  const employeeMap = new Map<string, { totalHours: number; billableHours: number }>();
  const projectMap = new Map<string, { totalHours: number; billableHours: number }>();

  for (const record of records) {
    const d = record.data as Record<string, unknown>;
    const hours = Number(d['hours'] ?? 0);
    const billable = d['billable'] !== false;
    const employeeName = String(d['employee_name'] ?? 'Unknown');
    const projectName = d['project_name'] ? String(d['project_name']) : null;
    const dateStr = d['date'] ? String(d['date']).slice(0, 10) : null;

    totalHours += hours;
    if (billable) {
      billableHours += hours;
    } else {
      nonBillableHours += hours;
    }

    // Week calculations based on date field
    if (dateStr) {
      const entryDate = new Date(dateStr + 'T00:00:00');
      if (entryDate >= thisMonday && entryDate <= thisSunday) {
        thisWeekHours += hours;
      } else if (entryDate >= lastMonday && entryDate <= lastSunday) {
        lastWeekHours += hours;
      }
    }

    // By employee
    const empEntry = employeeMap.get(employeeName) ?? { totalHours: 0, billableHours: 0 };
    employeeMap.set(employeeName, {
      totalHours: empEntry.totalHours + hours,
      billableHours: empEntry.billableHours + (billable ? hours : 0),
    });

    // By project
    if (projectName) {
      const projEntry = projectMap.get(projectName) ?? { totalHours: 0, billableHours: 0 };
      projectMap.set(projectName, {
        totalHours: projEntry.totalHours + hours,
        billableHours: projEntry.billableHours + (billable ? hours : 0),
      });
    }
  }

  const byEmployee = Array.from(employeeMap.entries())
    .map(([employee_name, { totalHours: th, billableHours: bh }]) => ({
      employee_name,
      totalHours: th,
      billableHours: bh,
    }))
    .sort((a, b) => b.totalHours - a.totalHours);

  const byProject = Array.from(projectMap.entries()).map(
    ([project_name, { totalHours: th, billableHours: bh }]) => ({
      project_name,
      totalHours: th,
      billableHours: bh,
    }),
  );

  return c.json({
    totalHours,
    billableHours,
    nonBillableHours,
    thisWeekHours,
    lastWeekHours,
    byEmployee,
    byProject,
  });
});

// ── List ─────────────────────────────────────────────────────

timeRouter.get('/entries', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const employeeId = c.req.query('employeeId');
  const projectId = c.req.query('projectId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const status = c.req.query('status');
  const billable = c.req.query('billable');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'TimeEntry'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (employeeId) {
    conditions.push(sql`${schema.entityRecords.data}->>'employee_id' = ${employeeId}`);
  }
  if (projectId) {
    conditions.push(sql`${schema.entityRecords.data}->>'project_id' = ${projectId}`);
  }
  if (startDate) {
    conditions.push(sql`${schema.entityRecords.data}->>'date' >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(sql`${schema.entityRecords.data}->>'date' <= ${endDate}`);
  }
  if (status) {
    conditions.push(sql`${schema.entityRecords.data}->>'status' = ${status}`);
  }
  if (billable !== undefined) {
    const billableVal = billable === 'true' ? 'true' : 'false';
    conditions.push(sql`(${schema.entityRecords.data}->>'billable')::boolean = ${billableVal}::boolean`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
    orderBy: (t, { desc }) => [
      desc(sql`${t.data}->>'date'`),
    ],
  });

  return c.json(records);
});

// ── Get by ID ────────────────────────────────────────────────

timeRouter.get('/entries/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.id, c.req.param('id')),
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'TimeEntry'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

// ── Create ───────────────────────────────────────────────────

timeRouter.post(
  '/entries',
  zValidator(
    'json',
    z.object({
      employee_id: z.string().optional(),
      employee_name: z.string(),
      project_id: z.string().optional(),
      project_name: z.string().optional(),
      task_id: z.string().optional(),
      date: z.string(),
      hours: z.number().min(0.25).max(24),
      description: z.string().optional(),
      billable: z.boolean().default(true),
      status: z.enum(['draft', 'submitted', 'approved']).optional().default('draft'),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');
    const data = { ...body, status: body.status ?? 'draft', billable: body.billable ?? true };

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'TimeEntry', data, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create time entry' }, 500);
    return c.json(record, 201);
  },
);

// ── Update ───────────────────────────────────────────────────

timeRouter.patch(
  '/entries/:id',
  zValidator(
    'json',
    z.object({
      employee_id: z.string().optional(),
      employee_name: z.string().optional(),
      project_id: z.string().optional(),
      project_name: z.string().optional(),
      task_id: z.string().optional(),
      date: z.string().optional(),
      hours: z.number().min(0.25).max(24).optional(),
      description: z.string().optional(),
      billable: z.boolean().optional(),
      status: z.enum(['draft', 'submitted', 'approved']).optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const entry = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'TimeEntry'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!entry) return c.json({ error: 'Time entry not found' }, 404);

    const existing = entry.data as Record<string, unknown>;
    const updated: Record<string, unknown> = { ...existing, ...body };

    const [result] = await db
      .update(schema.entityRecords)
      .set({ data: updated, updatedAt: new Date() })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    return c.json(result);
  },
);

// ── Delete (draft only) ──────────────────────────────────────

timeRouter.delete('/entries/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const entry = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'TimeEntry'),
      eq(schema.entityRecords.id, id),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!entry) return c.json({ error: 'Time entry not found' }, 404);

  const d = entry.data as Record<string, unknown>;
  if (String(d['status'] ?? 'draft') !== 'draft') {
    return c.json({ error: 'Only draft entries can be deleted' }, 400);
  }

  await db
    .update(schema.entityRecords)
    .set({ deletedAt: new Date() })
    .where(eq(schema.entityRecords.id, id));

  return c.json({ success: true });
});
