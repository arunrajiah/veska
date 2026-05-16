import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { ApprovalService } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';
import { dispatchWebhookEvent } from '../middleware/webhook-events.js';
import { sendApprovalDecisionEmail, sendApprovalRequestedEmail } from '../lib/notification-mailer.js';

/** Map entityType → new status after approval/rejection */
const ENTITY_STATUS_MAP: Record<string, { approved: string; rejected: string }> = {
  invoice:        { approved: 'sent',     rejected: 'rejected' },
  Invoice:        { approved: 'sent',     rejected: 'rejected' },
  purchase_order: { approved: 'approved', rejected: 'rejected' },
  PurchaseOrder:  { approved: 'approved', rejected: 'rejected' },
  Expense:        { approved: 'approved', rejected: 'rejected' },
  expense:        { approved: 'approved', rejected: 'rejected' },
  LeaveRequest:   { approved: 'approved', rejected: 'rejected' },
};

export const approvalRequestsRouter = new Hono<{ Variables: TenantContext }>();

// ── Inbox (must be before /:id) ───────────────────────────────

approvalRequestsRouter.get('/inbox', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const result = await db.execute(sql`
    SELECT ar.*, ac."name" AS "chainName", ac."steps" AS "chainSteps"
    FROM "approvalRequests" ar
    JOIN "approvalChains" ac ON ac."id" = ar."chainId"
    WHERE ar."tenantId" = ${tenantId}
      AND ar."status" = 'pending'
    ORDER BY ar."createdAt" DESC
  `);

  const requests = result.rows ?? [];
  return c.json({ requests, count: requests.length });
});

// ── List ──────────────────────────────────────────────────────

approvalRequestsRouter.get('/', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const status = c.req.query('status');
  const entityType = c.req.query('entityType');

  let whereClause = sql`ar."tenantId" = ${tenantId}`;

  if (status) {
    whereClause = sql`${whereClause} AND ar."status" = ${status}`;
  }
  if (entityType) {
    whereClause = sql`${whereClause} AND ar."entityType" = ${entityType}`;
  }

  const result = await db.execute(sql`
    SELECT ar.*, ac."name" AS "chainName"
    FROM "approvalRequests" ar
    JOIN "approvalChains" ac ON ac."id" = ar."chainId"
    WHERE ${whereClause}
    ORDER BY ar."createdAt" DESC
  `);

  return c.json({ requests: result.rows ?? [] });
});

// ── Create ────────────────────────────────────────────────────

const createSchema = z.object({
  tenantId: z.string().optional(),
  chainId: z.string().uuid(),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  entityTitle: z.string().optional(),
  requestedBy: z.string().optional(),
});

approvalRequestsRouter.post('/', zValidator('json', createSchema), async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const body = c.req.valid('json');

  // Look up chain to get totalSteps
  const chainResult = await db.execute(sql`
    SELECT "steps" FROM "approvalChains"
    WHERE "id" = ${body.chainId}::uuid
      AND "tenantId" = ${tenantId}
  `);

  const chain = (chainResult.rows ?? [])[0];
  if (!chain) return c.json({ error: 'Approval chain not found' }, 404);

  const steps = Array.isArray(chain.steps) ? chain.steps : [];
  const totalSteps = steps.length || 1;

  const result = await db.execute(sql`
    INSERT INTO "approvalRequests" (
      "tenantId", "chainId", "entityType", "entityId",
      "entityTitle", "currentStep", "totalSteps", "status", "requestedBy"
    ) VALUES (
      ${tenantId},
      ${body.chainId}::uuid,
      ${body.entityType},
      ${body.entityId},
      ${body.entityTitle ?? null},
      1,
      ${totalSteps},
      'pending',
      ${body.requestedBy ?? null}
    )
    RETURNING *
  `);

  const request = (result.rows ?? [])[0];
  if (!request) return c.json({ error: 'Failed to create approval request' }, 500);
  return c.json(request, 201);
});

// ── Get single with decisions ─────────────────────────────────

approvalRequestsRouter.get('/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const requestResult = await db.execute(sql`
    SELECT ar.*, ac."name" AS "chainName", ac."steps" AS "chainSteps"
    FROM "approvalRequests" ar
    JOIN "approvalChains" ac ON ac."id" = ar."chainId"
    WHERE ar."id" = ${id}::uuid
      AND ar."tenantId" = ${tenantId}
  `);

  const request = (requestResult.rows ?? [])[0];
  if (!request) return c.json({ error: 'Not found' }, 404);

  const decisionsResult = await db.execute(sql`
    SELECT * FROM "approvalDecisions"
    WHERE "requestId" = ${id}::uuid
    ORDER BY "step" ASC, "decidedAt" ASC
  `);

  return c.json({ ...request, decisions: decisionsResult.rows ?? [] });
});

// ── Approve ───────────────────────────────────────────────────

const decisionSchema = z.object({
  approverId: z.string().optional(),
  approverName: z.string().optional(),
  comment: z.string().optional(),
});

approvalRequestsRouter.post('/:id/approve', zValidator('json', decisionSchema), async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  // Fetch the current request
  const requestResult = await db.execute(sql`
    SELECT * FROM "approvalRequests"
    WHERE "id" = ${id}::uuid
      AND "tenantId" = ${tenantId}
  `);

  const request = (requestResult.rows ?? [])[0];
  if (!request) return c.json({ error: 'Not found' }, 404);
  if (request.status !== 'pending') {
    return c.json({ error: `Request is already ${request.status}` }, 400);
  }

  const currentStep = Number(request.currentStep);
  const totalSteps = Number(request.totalSteps);

  // Insert decision
  await db.execute(sql`
    INSERT INTO "approvalDecisions" (
      "requestId", "step", "approverId", "approverName", "decision", "comment"
    ) VALUES (
      ${id}::uuid,
      ${currentStep},
      ${body.approverId ?? null},
      ${body.approverName ?? null},
      'approved',
      ${body.comment ?? null}
    )
  `);

  let updatedRequest: Record<string, unknown>;

  if (currentStep < totalSteps) {
    // Advance to next step
    const result = await db.execute(sql`
      UPDATE "approvalRequests"
      SET "currentStep" = ${currentStep + 1}, "updatedAt" = now()
      WHERE "id" = ${id}::uuid
      RETURNING *
    `);
    updatedRequest = (result.rows ?? [])[0] as Record<string, unknown>;
  } else {
    // Final step — mark fully approved
    const result = await db.execute(sql`
      UPDATE "approvalRequests"
      SET "status" = 'approved', "updatedAt" = now()
      WHERE "id" = ${id}::uuid
      RETURNING *
    `);
    updatedRequest = (result.rows ?? [])[0] as Record<string, unknown>;
  }

  return c.json(updatedRequest);
});

// ── Reject ────────────────────────────────────────────────────

approvalRequestsRouter.post('/:id/reject', zValidator('json', decisionSchema), async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const requestResult = await db.execute(sql`
    SELECT * FROM "approvalRequests"
    WHERE "id" = ${id}::uuid
      AND "tenantId" = ${tenantId}
  `);

  const request = (requestResult.rows ?? [])[0];
  if (!request) return c.json({ error: 'Not found' }, 404);
  if (request.status !== 'pending') {
    return c.json({ error: `Request is already ${request.status}` }, 400);
  }

  // Insert decision
  await db.execute(sql`
    INSERT INTO "approvalDecisions" (
      "requestId", "step", "approverId", "approverName", "decision", "comment"
    ) VALUES (
      ${id}::uuid,
      ${Number(request.currentStep)},
      ${body.approverId ?? null},
      ${body.approverName ?? null},
      'rejected',
      ${body.comment ?? null}
    )
  `);

  // Mark request as rejected
  const result = await db.execute(sql`
    UPDATE "approvalRequests"
    SET "status" = 'rejected', "updatedAt" = now()
    WHERE "id" = ${id}::uuid
    RETURNING *
  `);

  return c.json((result.rows ?? [])[0]);
});

// ── Cancel ────────────────────────────────────────────────────

approvalRequestsRouter.post('/:id/cancel', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const result = await db.execute(sql`
    UPDATE "approvalRequests"
    SET "status" = 'cancelled', "updatedAt" = now()
    WHERE "id" = ${id}::uuid
      AND "tenantId" = ${tenantId}
    RETURNING *
  `);

  const request = (result.rows ?? [])[0];
  if (!request) return c.json({ error: 'Not found' }, 404);
  return c.json(request);
});

// ── GET /pending-count — count of pending triggers for tenant ──

approvalRequestsRouter.get('/pending-count', async (c) => {
  const { tenantId, db } = c.get('tenantCtx');

  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM "approvalTriggers"
    WHERE "tenantId" = ${tenantId}::uuid
      AND status = 'pending'
  `) as unknown as { rows: Array<{ count: number }> };

  const count = result.rows[0]?.count ?? 0;
  return c.json({ count });
});

// ── GET /triggers — list pending approvalTriggers ──────────────

approvalRequestsRouter.get('/triggers', async (c) => {
  const { tenantId, db } = c.get('tenantCtx');
  const approvalSvc = new ApprovalService(db);
  const pending = await approvalSvc.getPending(tenantId);
  return c.json({ data: pending, total: pending.length });
});

// ── PATCH /triggers/:id/decide — approve or reject a trigger ──

approvalRequestsRouter.patch(
  '/triggers/:id/decide',
  zValidator(
    'json',
    z.object({
      decision: z.enum(['approved', 'rejected']),
      reason: z.string().optional(),
    }),
  ),
  async (c) => {
    const { tenantId, db, identityId } = c.get('tenantCtx');
    const triggerId = c.req.param('id');
    const body = c.req.valid('json');
    const approvalSvc = new ApprovalService(db);

    // Fetch trigger before deciding so we know the entityType + entityId
    const triggerResult = await db.execute(sql`
      SELECT "entityType", "entityId"
      FROM "approvalTriggers"
      WHERE id = ${triggerId}::uuid
        AND "tenantId" = ${tenantId}::uuid
    `) as unknown as { rows: Array<{ entityType: string; entityId: string }> };

    const trigger = triggerResult.rows[0];

    await approvalSvc.decide(triggerId, tenantId, body.decision, identityId, body.reason);

    // Auto-advance the originating entity's status
    if (trigger) {
      const mapping = ENTITY_STATUS_MAP[trigger.entityType];
      if (mapping) {
        const newStatus = body.decision === 'approved' ? mapping.approved : mapping.rejected;
        await db.execute(sql`
          UPDATE "entityRecords"
          SET data = data || ${JSON.stringify({ status: newStatus })}::jsonb,
              "updatedAt" = now()
          WHERE id = ${trigger.entityId}::uuid
            AND "tenantId" = ${tenantId}::uuid
        `);
      }

      // Look up requester email and send decision notification (fire-and-forget)
      void (async () => {
        try {
          const triggerRow = (await db.execute(sql`
            SELECT "requestedBy" FROM "approvalTriggers"
            WHERE id = ${triggerId}::uuid
              AND "tenantId" = ${tenantId}::uuid
          `) as unknown as { rows: Array<{ requestedBy: string | null }> }).rows[0];

          const requestedBy = triggerRow?.requestedBy;
          if (!requestedBy) return;

          const userRow = (await db.execute(sql`
            SELECT data->>'email' AS email,
                   COALESCE(data->>'name', data->>'full_name', data->>'firstName') AS name
            FROM "entityRecords"
            WHERE id = ${requestedBy}::uuid
              AND "tenantId" = ${tenantId}::uuid
            LIMIT 1
          `) as unknown as { rows: Array<{ email: string | null; name: string | null }> }).rows[0];

          const email = userRow?.email;
          if (!email) return;

          const entityData = (await db.execute(sql`
            SELECT data->>'number' AS ref,
                   COALESCE(data->>'title', data->>'description', data->>'number') AS ref2
            FROM "entityRecords"
            WHERE id = ${trigger.entityId}::uuid
              AND "tenantId" = ${tenantId}::uuid
            LIMIT 1
          `) as unknown as { rows: Array<{ ref: string | null; ref2: string | null }> }).rows[0];

          const entityRef = entityData?.ref ?? entityData?.ref2 ?? trigger.entityId;
          const dashboardUrl = `${process.env['ADMIN_BASE_URL'] ?? 'http://localhost:3000'}/dashboard`;

          await sendApprovalDecisionEmail({
            to: email,
            recipientName: userRow?.name ?? 'there',
            entityType: trigger.entityType,
            entityRef,
            decision: body.decision,
            reason: body.reason,
            dashboardUrl,
          });
        } catch (err) {
          console.error('[approval-requests] decision email failed:', err);
        }
      })();
    }

    const webhookEvent = body.decision === 'approved' ? 'approval.approved' : 'approval.rejected';
    dispatchWebhookEvent({
      tenantId,
      db,
      event: webhookEvent,
      resourceId: triggerId,
      data: { triggerId, tenantId, decision: body.decision, reason: body.reason, decidedBy: identityId },
    });

    return c.json({ success: true });
  },
);
