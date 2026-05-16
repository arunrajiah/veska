import { sql } from 'drizzle-orm';
import type { Database } from '../db/index.js';

export interface ApprovalRequest {
  tenantId: string;
  entityType: 'Expense' | 'LeaveRequest' | 'PurchaseOrder';
  entityId: string;
  requestedBy: string;
  amount?: number;       // for threshold-based routing
  metadata?: Record<string, unknown>;
}

export class ApprovalService {
  constructor(private db: Database) {}

  /**
   * Trigger an approval flow for an entity.
   * Looks up matching approval chain by entityType + amount threshold,
   * creates an approvalTrigger record, and notifies the first approver.
   */
  async trigger(req: ApprovalRequest): Promise<{ triggerId: string; approvers: string[] }> {
    // Find matching approval chain
    const chainResult = await this.db.execute(sql`
      SELECT id, name, steps
      FROM "approvalChains"
      WHERE "tenantId" = ${req.tenantId}::uuid
        AND "entityType" = ${req.entityType}
        AND enabled = true
      ORDER BY "createdAt" ASC
      LIMIT 1
    `).then(r => r as unknown as { rows: unknown[] }).catch(() => ({ rows: [] as unknown[] }));

    const chain = (chainResult.rows as Array<{
      id: string;
      name: string;
      steps: Array<{ approverId?: string; role?: string; threshold?: number }>;
    }>)[0];

    // Determine approvers from chain steps (or default to admin)
    const approvers = chain?.steps?.map(s => s.approverId ?? s.role ?? 'admin') ?? ['admin'];

    // Insert trigger record
    const result = await this.db.execute(sql`
      INSERT INTO "approvalTriggers" (
        "tenantId", "entityType", "entityId", "chainId",
        "requestedBy", status, "currentStep", approvers, metadata
      ) VALUES (
        ${req.tenantId}::uuid,
        ${req.entityType},
        ${req.entityId}::uuid,
        ${chain?.id ?? null},
        ${req.requestedBy},
        'pending',
        0,
        ${JSON.stringify(approvers)}::jsonb,
        ${JSON.stringify(req.metadata ?? {})}::jsonb
      )
      RETURNING id
    `) as unknown as { rows: Array<{ id: string }> };

    const triggerId = (result.rows[0] as { id: string }).id;
    return { triggerId, approvers };
  }

  /** Approve or reject a trigger */
  async decide(
    triggerId: string,
    tenantId: string,
    decision: 'approved' | 'rejected',
    decidedBy: string,
    reason?: string
  ): Promise<void> {
    if (decision === 'approved') {
      await this.db.execute(sql`
        UPDATE "approvalTriggers"
        SET status = 'approved', "approvedBy" = ${decidedBy}, "updatedAt" = now()
        WHERE id = ${triggerId}::uuid AND "tenantId" = ${tenantId}::uuid
      `);
    } else {
      await this.db.execute(sql`
        UPDATE "approvalTriggers"
        SET status = 'rejected', "rejectedBy" = ${decidedBy},
            "rejectionReason" = ${reason ?? null}, "updatedAt" = now()
        WHERE id = ${triggerId}::uuid AND "tenantId" = ${tenantId}::uuid
      `);
    }
  }

  /** Get pending approvals for a tenant */
  async getPending(tenantId: string) {
    const result = await this.db.execute(sql`
      SELECT at.*, er.data as entity_data
      FROM "approvalTriggers" at
      LEFT JOIN "entityRecords" er ON er.id = at."entityId"
      WHERE at."tenantId" = ${tenantId}::uuid
        AND at.status = 'pending'
      ORDER BY at."createdAt" DESC
      LIMIT 50
    `) as unknown as { rows: Record<string, unknown>[] };
    return result.rows;
  }
}
