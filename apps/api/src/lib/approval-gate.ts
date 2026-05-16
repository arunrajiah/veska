import { sql } from 'drizzle-orm';
import { ApprovalService } from '@veska/core';
import type { sharedDb } from '../shared.js';

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

  return { required: true, triggerId };
}
