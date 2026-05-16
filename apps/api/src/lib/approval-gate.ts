import { sql } from 'drizzle-orm';
import { ApprovalService } from '@veska/core';
import type { sharedDb } from '../shared.js';
import { sendApprovalRequestedEmail } from './notification-mailer.js';

type Database = typeof sharedDb;

/**
 * Check whether an approval chain is configured for the given entity type.
 *
 * - If no enabled chain exists → returns { required: false }
 * - If a chain exists but has an amount threshold that is not met → returns { required: false }
 * - Otherwise → triggers approval and returns { required: true, triggerId }
 */
export async function checkApprovalRequired(
  db: Database,
  tenantId: string,
  entityType: string,
  entityId: string,
  triggeredBy: string,
  amount?: number,
): Promise<{ required: true; triggerId: string } | { required: false }> {
  // Query for enabled approval chains for this entity type + tenant
  const result = await db.execute(sql`
    SELECT id, "conditionOp", "conditionField", "conditionValue"
    FROM "approvalChains"
    WHERE "tenantId" = ${tenantId}
      AND "entityType" = ${entityType}
      AND "enabled" = true
    ORDER BY "createdAt" ASC
    LIMIT 1
  `) as unknown as { rows: Array<{
    id: string;
    conditionOp: string | null;
    conditionField: string | null;
    conditionValue: number | null;
  }> };

  const chain = result.rows[0];

  // No chain configured — allow action to proceed
  if (!chain) return { required: false };

  // Evaluate threshold condition if applicable
  if (chain.conditionOp && chain.conditionOp !== 'always' && chain.conditionField === 'amount' && chain.conditionValue !== null) {
    const threshold = Number(chain.conditionValue);
    const amt = amount ?? 0;
    const conditionMet =
      chain.conditionOp === 'gt'  ? amt > threshold :
      chain.conditionOp === 'gte' ? amt >= threshold :
      chain.conditionOp === 'lt'  ? amt < threshold :
      chain.conditionOp === 'lte' ? amt <= threshold :
      chain.conditionOp === 'eq'  ? amt === threshold : false;

    if (!conditionMet) return { required: false };
  }

  // Trigger approval
  const approvalSvc = new ApprovalService(db);
  const triggerReq: Parameters<typeof approvalSvc.trigger>[0] = {
    tenantId,
    entityType: entityType as 'Expense' | 'LeaveRequest' | 'PurchaseOrder',
    entityId,
    requestedBy: triggeredBy,
    ...(amount !== undefined ? { amount } : {}),
  };
  const { triggerId } = await approvalSvc.trigger(triggerReq);

  // Notify approvers fire-and-forget
  void (async () => {
    try {
      // Look up the entity reference for the email subject
      const entityRow = (await db.execute(sql`
        SELECT data->>'number' AS ref,
               COALESCE(data->>'title', data->>'description', data->>'number') AS ref2
        FROM "entityRecords"
        WHERE id = ${entityId}::uuid
          AND "tenantId" = ${tenantId}::uuid
        LIMIT 1
      `) as unknown as { rows: Array<{ ref: string | null; ref2: string | null }> }).rows[0];

      const entityRef = entityRow?.ref ?? entityRow?.ref2 ?? entityId;

      // Look up requester details
      const requesterRow = (await db.execute(sql`
        SELECT data->>'email' AS email,
               COALESCE(data->>'name', data->>'full_name', data->>'firstName') AS name
        FROM "entityRecords"
        WHERE id = ${triggeredBy}::uuid
          AND "tenantId" = ${tenantId}::uuid
        LIMIT 1
      `) as unknown as { rows: Array<{ email: string | null; name: string | null }> }).rows[0];

      const requesterName = requesterRow?.name ?? 'A team member';

      // Look up approvers from the chain's steps
      const chainStepsRow = (await db.execute(sql`
        SELECT ac."steps"
        FROM "approvalTriggers" at2
        JOIN "approvalChains" ac ON ac."id" = at2."chainId"
        WHERE at2."id" = ${triggerId}::uuid
        LIMIT 1
      `) as unknown as { rows: Array<{ steps: unknown }> }).rows[0];

      const steps: Array<{ approverEmail?: string; approverId?: string; approverName?: string }> =
        Array.isArray(chainStepsRow?.steps) ? chainStepsRow.steps as Array<{ approverEmail?: string; approverId?: string; approverName?: string }> : [];

      const approvalsUrl = `${process.env['ADMIN_BASE_URL'] ?? 'http://localhost:3000'}/dashboard/approvals`;

      for (const step of steps) {
        // Use inline email if present, otherwise look up from entityRecords
        let approverEmail = step.approverEmail ?? null;
        let approverName = step.approverName ?? null;

        if (!approverEmail && step.approverId) {
          const approverRow = (await db.execute(sql`
            SELECT data->>'email' AS email,
                   COALESCE(data->>'name', data->>'full_name', data->>'firstName') AS name
            FROM "entityRecords"
            WHERE id = ${step.approverId}::uuid
              AND "tenantId" = ${tenantId}::uuid
            LIMIT 1
          `) as unknown as { rows: Array<{ email: string | null; name: string | null }> }).rows[0];

          approverEmail = approverRow?.email ?? null;
          approverName = approverName ?? approverRow?.name ?? null;
        }

        if (!approverEmail) continue;

        await sendApprovalRequestedEmail({
          to: approverEmail,
          approverName: approverName ?? 'Approver',
          requesterName,
          entityType,
          entityRef,
          amount,
          approvalsUrl,
        });
      }
    } catch (err) {
      console.error('[approval-gate] approver notification failed:', err);
    }
  })();

  return { required: true, triggerId };
}
