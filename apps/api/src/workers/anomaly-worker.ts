import { sql } from 'drizzle-orm';
import type { Job } from 'bullmq';
import type {
  Database,
  QueueService,
  AnthropicProvider,
  AnomalyRecord,
  AnomalySummaryJob,
} from '@veska/core';

// ──────────────────────────────────────────────────────────────
// Anomaly detection worker
// ──────────────────────────────────────────────────────────────
//
// Registers two workers:
//
//  1. A repeatable BullMQ job on the "ai" queue that runs every 6 hours.
//     It scans all tenants for four anomaly categories and enqueues an
//     'ai.anomaly_summary' job for each tenant that has anomalies.
//
//  2. A worker for 'ai.anomaly_summary' that calls the LLM to produce
//     a natural language summary and stores it as an entityRecord of
//     entityType='AIAlert'.

interface TenantRow {
  id: string;
}

interface BudgetOverrunRow {
  tenantId: string;
  lineItemId: string;
  budgetName: string;
  categoryName: string | null;
  plannedAmount: string;
  actualAmount: string;
}

interface SlaBreachRow {
  tenantId: string;
  ticketId: string;
  subject: string | null;
  priority: string;
  createdAt: string;
}

interface OverdueInvoiceRow {
  tenantId: string;
  invoiceId: string;
  dueDate: string;
  amount: string | null;
}

interface ExpiringContractRow {
  tenantId: string;
  contractId: string;
  title: string | null;
  endDate: string;
}

export function registerAnomalyWorker(
  queueService: QueueService,
  db: Database,
  llm: AnthropicProvider,
): void {
  // ── 1. Repeatable scanner — every 6 hours ──────────────────

  // Register the repeatable job by accessing the internal BullMQ Queue.
  // QueueService.getQueue is private, so we use a type-safe escape hatch.
  void (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const svc = queueService as any;
      // Try the private getQueue method first; fall back to the queues Map.
      const queue: import('bullmq').Queue | undefined =
        typeof svc.getQueue === 'function'
          ? (svc.getQueue('ai') as import('bullmq').Queue)
          : (svc.queues?.get('ai') as import('bullmq').Queue | undefined);

      if (queue != null) {
        await queue.add(
          'ai.scan_anomalies',
          {},
          {
            repeat: { every: 6 * 60 * 60 * 1000 }, // 6 hours in ms
            jobId: 'anomaly-scan-repeatable',
          },
        );
        console.log('[AnomalyWorker] Registered repeatable anomaly scan every 6 hours');
      }
    } catch (err) {
      console.warn('[AnomalyWorker] Could not register repeatable job:', err);
    }
  })();

  // Worker that handles each scan run
  queueService.registerWorker(
    'ai',
    async (job: Job) => {
      if (job.name !== 'ai.scan_anomalies') return;

      console.log('[AnomalyWorker] Running anomaly scan…');

      // Fetch all tenant IDs
      const tenantsResult = await db.execute(sql`
        SELECT DISTINCT id FROM tenants WHERE "deletedAt" IS NULL
      `);

      const tenants = tenantsResult.rows as TenantRow[];

      for (const tenant of tenants) {
        const tenantId = tenant.id;
        const anomalies: AnomalyRecord[] = [];

        // 1. Budget overruns: actualAmount > plannedAmount * 1.1
        const budgetOverrunResult = await db.execute(sql`
          SELECT
            b."tenantId",
            bli.id AS "lineItemId",
            b.name AS "budgetName",
            bli.category AS "categoryName",
            bli."plannedAmount",
            bli."actualAmount"
          FROM "budgetLineItems" bli
          JOIN budgets b ON b.id = bli."budgetId"
          WHERE b."tenantId" = ${tenantId}
            AND bli."actualAmount" > bli."plannedAmount" * 1.1
        `);

        for (const row of budgetOverrunResult.rows as BudgetOverrunRow[]) {
          const overPct = Math.round(
            ((Number(row.actualAmount) - Number(row.plannedAmount)) / Number(row.plannedAmount)) * 100,
          );
          anomalies.push({
            type: 'budget_overrun',
            description: `Budget "${row.budgetName}" line "${row.categoryName ?? row.lineItemId}" is ${overPct}% over plan (actual: ${row.actualAmount}, planned: ${row.plannedAmount})`,
            entityId: row.lineItemId,
            metadata: {
              budgetName: row.budgetName,
              plannedAmount: row.plannedAmount,
              actualAmount: row.actualAmount,
              overPct,
            },
          });
        }

        // 2. SLA breaches: high/critical tickets open > 48 hours
        const slaBreachResult = await db.execute(sql`
          SELECT
            "tenantId",
            id AS "ticketId",
            subject,
            priority,
            "createdAt"
          FROM "serviceTickets"
          WHERE "tenantId" = ${tenantId}
            AND status NOT IN ('resolved', 'closed')
            AND "createdAt" < NOW() - INTERVAL '48 hours'
            AND priority IN ('high', 'critical')
        `);

        for (const row of slaBreachResult.rows as SlaBreachRow[]) {
          anomalies.push({
            type: 'sla_breach',
            description: `Service ticket "${row.subject ?? row.ticketId}" (priority: ${row.priority}) has been open since ${row.createdAt} without resolution`,
            entityId: row.ticketId,
            metadata: { priority: row.priority, createdAt: row.createdAt },
          });
        }

        // 3. Overdue invoices
        const overdueInvoiceResult = await db.execute(sql`
          SELECT
            "tenantId",
            id AS "invoiceId",
            data->>'dueDate' AS "dueDate",
            data->>'amount' AS amount
          FROM "entityRecords"
          WHERE "tenantId" = ${tenantId}
            AND "entityType" = 'Invoice'
            AND (data->>'dueDate')::date < CURRENT_DATE
            AND data->>'status' NOT IN ('paid', 'cancelled')
        `);

        for (const row of overdueInvoiceResult.rows as OverdueInvoiceRow[]) {
          anomalies.push({
            type: 'overdue_invoice',
            description: `Invoice ${row.invoiceId} was due on ${row.dueDate} and remains unpaid${row.amount ? ` (amount: ${row.amount})` : ''}`,
            entityId: row.invoiceId,
            metadata: { dueDate: row.dueDate, amount: row.amount },
          });
        }

        // 4. Expiring contracts within 30 days
        const expiringContractResult = await db.execute(sql`
          SELECT
            "tenantId",
            id AS "contractId",
            title,
            "endDate"
          FROM contracts
          WHERE "tenantId" = ${tenantId}
            AND "endDate" BETWEEN NOW() AND NOW() + INTERVAL '30 days'
            AND status = 'active'
        `);

        for (const row of expiringContractResult.rows as ExpiringContractRow[]) {
          anomalies.push({
            type: 'expiring_contract',
            description: `Contract "${row.title ?? row.contractId}" expires on ${row.endDate}`,
            entityId: row.contractId,
            metadata: { title: row.title, endDate: row.endDate },
          });
        }

        if (anomalies.length > 0) {
          await queueService.enqueue('ai.anomaly_summary', { tenantId, anomalies });
          console.log(`[AnomalyWorker] Queued summary for tenant ${tenantId} with ${anomalies.length} anomalies`);
        }
      }
    },
    2,
  );

  // ── 2. Anomaly summary worker ──────────────────────────────

  queueService.registerWorker(
    'ai',
    async (job: Job<AnomalySummaryJob>) => {
      if (job.name !== 'ai.anomaly_summary') return;

      const { tenantId, anomalies } = job.data;

      const system = `You are a business intelligence assistant for an ERP system. Summarize the following anomalies for a business manager in 2-3 concise sentences. Be specific with numbers and dates. Focus on the most critical issues first.`;

      const userMessage = `Anomalies detected for this business:\n${anomalies.map((a: AnomalyRecord, i: number) => `${i + 1}. [${a.type}] ${a.description}`).join('\n')}\n\nProvide a 2-3 sentence summary.`;

      let summary = 'Anomaly detection completed but summary generation failed.';

      try {
        const result = await llm.complete({
          system,
          messages: [{ role: 'user', content: userMessage }],
          maxTokens: 512,
        });
        summary = result.content.trim();
      } catch (err) {
        console.error(`[AnomalyWorker] LLM summary failed for tenant ${tenantId}:`, err);
      }

      const generatedAt = new Date().toISOString();
      const alertData = JSON.stringify({ summary, anomalies, generatedAt });

      // Store as AIAlert entityRecord
      try {
        await db.execute(sql`
          INSERT INTO "entityRecords" ("tenantId", "entityType", data, "createdAt", "updatedAt")
          VALUES (
            ${tenantId},
            'AIAlert',
            ${alertData}::jsonb,
            NOW(),
            NOW()
          )
        `);
        console.log(`[AnomalyWorker] Stored AIAlert for tenant ${tenantId}`);
      } catch (err) {
        console.error(`[AnomalyWorker] Failed to store AIAlert for tenant ${tenantId}:`, err);
      }
    },
    3,
  );

  console.log('[AnomalyWorker] Workers registered');
}
