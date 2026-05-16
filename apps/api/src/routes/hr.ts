import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { schema, ApprovalService } from '@veska/core';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { dispatchWebhookEvent } from '../middleware/webhook-events.js';
import { sendLeaveDecisionEmail } from '../lib/notification-mailer.js';
import { logAudit } from './audit.js';
import { computeDiff, redactDiff } from '../lib/diff.js';

export const hrRouter = new Hono<{ Variables: TenantContext }>();

// ── Employees ────────────────────────────────────────────────

const employeesQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

hrRouter.get('/employees', zValidator('query', employeesQuerySchema), async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const { status } = c.req.valid('query');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Employee'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (status) {
    conditions.push(sql`${schema.entityRecords.data}->>'status' = ${status}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return c.json(records);
});

hrRouter.get('/employees/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.id, c.req.param('id')),
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Employee'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

hrRouter.post(
  '/employees',
  zValidator(
    'json',
    z.object({
      first_name: z.string().min(1),
      last_name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      department: z.string().optional(),
      title: z.string().optional(),
      hire_date: z.string().optional(),
      salary: z.number().optional(),
      status: z.enum(['active', 'on_leave', 'inactive']).optional().default('active'),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Employee', data: body, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create employee' }, 500);
    return c.json(record, 201);
  },
);

// ── Departments ──────────────────────────────────────────────

hrRouter.get('/departments', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const records = await db.query.entityRecords.findMany({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Department'),
      isNull(schema.entityRecords.deletedAt),
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return c.json(records);
});

hrRouter.get('/departments/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.id, c.req.param('id')),
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Department'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

hrRouter.post(
  '/departments',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      head_id: z.string().optional(),
      budget: z.number().optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Department', data: body, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create department' }, 500);
    return c.json(record, 201);
  },
);

// ── Leave Requests ───────────────────────────────────────────

const leaveQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

hrRouter.get('/leave', zValidator('query', leaveQuerySchema), async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const { employeeId, status } = c.req.valid('query');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'LeaveRequest'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (employeeId) {
    conditions.push(sql`${schema.entityRecords.data}->>'employee_id' = ${employeeId}`);
  }
  if (status) {
    conditions.push(sql`${schema.entityRecords.data}->>'status' = ${status}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return c.json(records);
});

hrRouter.get('/leave/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.id, c.req.param('id')),
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'LeaveRequest'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

hrRouter.post(
  '/leave',
  zValidator(
    'json',
    z.object({
      employee_id: z.string().optional(),
      employee_name: z.string().optional(),
      leave_type: z.enum(['annual', 'sick', 'unpaid', 'parental', 'other']).default('annual'),
      start_date: z.string(),
      end_date: z.string(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');
    const data = { ...body, status: 'pending' };

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'LeaveRequest', data, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create leave request' }, 500);

    dispatchWebhookEvent({
      tenantId,
      db,
      event: 'leave_request.created',
      resourceId: record.id,
      data: {
        id: record.id,
        tenantId,
        employee_id: body.employee_id,
        leave_type: body.leave_type,
        start_date: body.start_date,
        end_date: body.end_date,
        status: 'pending',
      },
    });

    // Trigger approval flow for all leave requests
    void new ApprovalService(db).trigger({
      tenantId,
      entityType: 'LeaveRequest',
      entityId: record.id,
      requestedBy: identityId,
      metadata: {
        leaveType: body.leave_type,
        startDate: body.start_date,
        endDate: body.end_date,
      },
    }).catch(() => {});

    return c.json(record, 201);
  },
);

hrRouter.post(
  '/leave/bulk',
  zValidator(
    'json',
    z.object({
      ids: z.array(z.string()).min(1),
      action: z.enum(['approve', 'reject']),
    }),
  ),
  async (c) => {
    const { db, tenantId } = c.get('tenantCtx');
    const { ids, action } = c.req.valid('json');

    let processed = 0;
    const failed: { id: string; error: string }[] = [];

    for (const id of ids) {
      try {
        const leave = await db.query.entityRecords.findFirst({
          where: and(
            eq(schema.entityRecords.tenantId, tenantId),
            eq(schema.entityRecords.entityType, 'LeaveRequest'),
            eq(schema.entityRecords.id, id),
            isNull(schema.entityRecords.deletedAt),
          ),
        });

        if (!leave) {
          failed.push({ id, error: 'Leave request not found' });
          continue;
        }

        const status = action === 'approve' ? 'approved' : 'rejected';
        await db
          .update(schema.entityRecords)
          .set({
            data: { ...(leave.data as Record<string, unknown>), status },
            updatedAt: new Date(),
          })
          .where(eq(schema.entityRecords.id, id));

        processed++;
      } catch (err) {
        failed.push({ id, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return c.json({ processed, failed });
  },
);

hrRouter.patch(
  '/leave/:id',
  zValidator(
    'json',
    z.object({
      status: z.enum(['approved', 'rejected', 'pending']),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const { status } = c.req.valid('json');

    const leave = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'LeaveRequest'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!leave) return c.json({ error: 'Leave request not found' }, 404);

    const beforeData = leave.data as Record<string, unknown>;
    const afterData = { ...beforeData, status };

    const [updated] = await db
      .update(schema.entityRecords)
      .set({
        data: afterData,
        updatedAt: new Date(),
      })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    const diff = redactDiff(computeDiff(beforeData, afterData));
    void logAudit(sharedDb, {
      tenantId,
      actorId: identityId,
      actorType: 'user',
      action: 'update',
      entityType: 'LeaveRequest',
      entityId: id,
      before: beforeData,
      after: afterData,
      diff,
    });

    // Send leave decision email to employee (fire-and-forget)
    if (status === 'approved' || status === 'rejected') {
      const leaveData = leave.data as Record<string, unknown>;
      const employeeId = leaveData['employee_id'] as string | undefined;
      const employeeName = (leaveData['employee_name'] as string | undefined) ?? 'there';

      void (async () => {
        try {
          let email: string | null = null;
          let resolvedName = employeeName;

          if (employeeId) {
            const empRow = (await db.execute(sql`
              SELECT data->>'email' AS email,
                     COALESCE(data->>'name', data->>'full_name', data->>'first_name') AS name
              FROM "entityRecords"
              WHERE id = ${employeeId}::uuid
                AND "tenantId" = ${tenantId}::uuid
              LIMIT 1
            `) as unknown as { rows: Array<{ email: string | null; name: string | null }> }).rows[0];

            email = empRow?.email ?? null;
            resolvedName = empRow?.name ?? resolvedName;
          }

          if (!email) return;

          await sendLeaveDecisionEmail({
            to: email,
            employeeName: resolvedName,
            leaveType: (leaveData['leave_type'] as string | undefined) ?? 'annual',
            startDate: (leaveData['start_date'] as string | undefined) ?? '',
            endDate: (leaveData['end_date'] as string | undefined) ?? '',
            decision: status,
          });
        } catch (err) {
          console.error('[hr] leave decision email failed:', err);
        }
      })();
    }

    return c.json(updated);
  },
);
