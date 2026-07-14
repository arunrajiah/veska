import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { sharedDb as db } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const dashboardRouter = new Hono<{ Variables: TenantContext }>();

// ── Types ─────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  entityType: string;
  label: string;
  verb: string;
  status: string | undefined;
  createdAt: unknown;
}

// ── Helpers ───────────────────────────────────────────────────

// Keys are entity types as stored in "entityRecords" (PascalCase). They used to be
// snake_case here, so every lookup missed and the feed showed a generic verb.
function getVerb(entityType: string, status?: string): string {
  const map: Record<string, string> = {
    Invoice: status === 'paid' ? 'Invoice paid' : 'Invoice updated',
    Expense: status === 'approved' ? 'Expense approved' : 'Expense submitted',
    Employee: 'Employee record updated',
    SalesOrder: status === 'delivered' ? 'Order delivered' : 'Order updated',
    PurchaseOrder: status === 'approved' ? 'PO approved' : 'PO updated',
    Project: 'Project updated',
    Deal: status === 'won' ? 'Deal won' : 'Deal updated',
    PayrollRun: status === 'completed' ? 'Payroll completed' : 'Payroll updated',
    TimeEntry: 'Time logged',
    InventoryItem: 'Inventory updated',
    Task: 'Task updated',
    Contact: 'Contact updated',
    SupportTicket: status === 'resolved' ? 'Ticket resolved' : 'Ticket updated',
  };
  return map[entityType] ?? 'Record updated';
}

function toActivity(record: Record<string, unknown>): ActivityItem {
  const d = (record['data'] as Record<string, unknown>) ?? {};
  const label =
    (d['title'] as string) ||
    (d['name'] as string) ||
    (d['number'] as string) ||
    (d['subject'] as string) ||
    (record['id'] as string).slice(0, 8);
  const entityType = (record['entity_type'] ?? record['entityType']) as string;
  const status = (d['status'] as string | undefined) ?? (record['status'] as string | undefined);
  const verb = getVerb(entityType, status);
  return {
    id: record['id'] as string,
    entityType,
    label,
    verb,
    status,
    // The Admin UI reads `createdAt`; this used to be emitted as `timestamp`, so the
    // feed rendered "NaNd ago" for every row.
    createdAt: record['updatedAt'] ?? record['createdAt'],
  };
}

// ── GET /stats ────────────────────────────────────────────────

// drizzle-orm/postgres-js returns rows as a plain array from db.execute(),
// not as { rows: [...] }. This helper normalises the result.
function firstRow(result: unknown): Record<string, string> | undefined {
  if (Array.isArray(result)) return result[0] as Record<string, string> | undefined;
  const r = result as { rows?: unknown[] };
  return (r.rows?.[0]) as Record<string, string> | undefined;
}

function allRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const r = result as { rows?: unknown[] };
  return (r.rows ?? []) as Record<string, unknown>[];
}

dashboardRouter.get('/stats', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  // Helper to safely run a query and return undefined on error
  async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }

  const [
    financeResult,
    hrEmployeesResult,
    hrLeaveResult,
    hrPayrollResult,
    inventoryResult,
    salesOrdersResult,
    dealsResult,
    projectsResult,
    tasksResult,
    purchaseOrdersResult,
    approvalsResult,
    timeResult,
  ] = await Promise.all([
    // Finance: invoices + expenses combined
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN data->>'status' IN ('sent','overdue') THEN (data->>'amount')::numeric ELSE 0 END), 0) AS outstanding,
          COALESCE(SUM(CASE WHEN data->>'status' = 'paid' AND "updatedAt" >= date_trunc('month', now()) THEN (data->>'amount')::numeric ELSE 0 END), 0) AS paid_this_month,
          COALESCE(SUM(CASE WHEN data->>'status' IN ('submitted','approved') THEN (data->>'amount')::numeric ELSE 0 END), 0) AS expenses_pending,
          COUNT(CASE WHEN data->>'status' = 'overdue' THEN 1 END) AS overdue_count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" IN ('Invoice', 'Expense')
      `);
      return firstRow(res);
    }, undefined),

    // HR: active employees
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Employee'
          AND data->>'status' = 'active'
      `);
      return firstRow(res);
    }, undefined),

    // HR: pending leave requests
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'LeaveRequest'
          AND data->>'status' = 'pending'
      `);
      return firstRow(res);
    }, undefined),

    // HR: payroll runs this month
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'PayrollRun'
          AND "createdAt" >= date_trunc('month', now())
          AND "createdAt" <= now()
      `);
      return firstRow(res);
    }, undefined),

    // Inventory stats
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT
          COUNT(*) AS total_products,
          COUNT(CASE WHEN (data->>'stockQuantity')::numeric < (data->>'reorderLevel')::numeric THEN 1 END) AS low_stock,
          COALESCE(SUM((data->>'stockQuantity')::numeric * (data->>'cost')::numeric), 0) AS total_value
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'InventoryItem'
          AND (data->>'stockQuantity') IS NOT NULL
          AND (data->>'reorderLevel') IS NOT NULL
      `);
      return firstRow(res);
    }, undefined),

    // Sales orders
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'SalesOrder'
          AND data->>'status' NOT IN ('delivered', 'cancelled')
      `);
      return firstRow(res);
    }, undefined),

    // Deals
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM((data->>'value')::numeric), 0) AS total_value
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Deal'
          AND COALESCE(data->>'stage', '') NOT IN ('closed_won', 'closed_lost')
      `);
      return firstRow(res);
    }, undefined),

    // Projects
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Project'
          AND data->>'status' IN ('active', 'in_progress')
      `);
      return firstRow(res);
    }, undefined),

    // Tasks in progress
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Task'
          AND data->>'status' = 'in_progress'
      `);
      return firstRow(res);
    }, undefined),

    // Purchase orders
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'PurchaseOrder'
          AND data->>'status' NOT IN ('received', 'cancelled')
      `);
      return firstRow(res);
    }, undefined),

    // Pending approvals
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "approvalRequests"
        WHERE "tenantId" = ${tenantId}
          AND "status" = 'pending'
      `);
      return firstRow(res);
    }, undefined),

    // Time entries this week
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COALESCE(SUM((data->>'hours')::numeric), 0) AS total_hours
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'TimeEntry'
          AND "createdAt" >= date_trunc('week', now())
          AND "createdAt" <= now()
      `);
      return firstRow(res);
    }, undefined),
  ]);

  const n = (v: string | undefined) => Number(v ?? 0);

  return c.json({
    finance: {
      totalOutstandingInvoices: n(financeResult?.['outstanding']),
      totalPaidThisMonth: n(financeResult?.['paid_this_month']),
      totalExpensesPending: n(financeResult?.['expenses_pending']),
      overdueInvoicesCount: n(financeResult?.['overdue_count']),
    },
    hr: {
      activeEmployees: n(hrEmployeesResult?.['count']),
      pendingLeaveRequests: n(hrLeaveResult?.['count']),
      payrollRunsThisMonth: n(hrPayrollResult?.['count']),
    },
    inventory: {
      totalProducts: n(inventoryResult?.['total_products']),
      lowStockItems: n(inventoryResult?.['low_stock']),
      totalInventoryValue: n(inventoryResult?.['total_value']),
    },
    sales: {
      openOrdersCount: n(salesOrdersResult?.['count']),
      openDealsCount: n(dealsResult?.['count']),
      openDealsValue: n(dealsResult?.['total_value']),
    },
    projects: {
      activeProjects: n(projectsResult?.['count']),
      tasksInProgress: n(tasksResult?.['count']),
    },
    purchasing: {
      openPOsCount: n(purchaseOrdersResult?.['count']),
      pendingApprovals: n(approvalsResult?.['count']),
    },
    time: {
      hoursLoggedThisWeek: n(timeResult?.['total_hours']),
    },
  });
});

// ── GET /activity ─────────────────────────────────────────────

dashboardRouter.get('/activity', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const rawLimit = parseInt(c.req.query('limit') ?? '20', 10);
  const limit = Math.min(isNaN(rawLimit) ? 20 : rawLimit, 50);

  try {
    const result = await db.execute(sql`
      SELECT
        id,
        "entityType",
        data->>'status' AS status,
        data->>'title' AS title,
        data->>'name' AS name,
        data->>'number' AS number,
        data->>'subject' AS subject,
        data,
        "createdAt",
        "updatedAt"
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
      ORDER BY "updatedAt" DESC
      LIMIT ${limit}
    `);

    const activities: ActivityItem[] = allRows(result).map((row) => {
      // Merge top-level fields into a data-like shape for toActivity
      const enriched: Record<string, unknown> = {
        ...row,
        data: {
          status: row['status'],
          title: row['title'],
          name: row['name'],
          number: row['number'],
          subject: row['subject'],
          ...(typeof row['data'] === 'object' && row['data'] !== null ? (row['data'] as Record<string, unknown>) : {}),
        },
      };
      return toActivity(enriched);
    });

    return c.json({ activities, generatedAt: new Date().toISOString() });
  } catch {
    return c.json({ activities: [], generatedAt: new Date().toISOString() });
  }
});

// ── GET /quick-stats ──────────────────────────────────────────

dashboardRouter.get('/quick-stats', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }

  const [invoicesResult, employeesResult, ordersResult, approvalsResult] = await Promise.all([
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COALESCE(SUM((data->>'amount')::numeric), 0) AS outstanding
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Invoice'
          AND data->>'status' IN ('sent', 'overdue')
      `);
      return firstRow(res);
    }, undefined),

    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'Employee'
          AND data->>'status' = 'active'
      `);
      return firstRow(res);
    }, undefined),

    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'SalesOrder'
          AND data->>'status' NOT IN ('delivered', 'cancelled')
      `);
      return firstRow(res);
    }, undefined),

    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "approvalRequests"
        WHERE "tenantId" = ${tenantId}
          AND "status" = 'pending'
      `);
      return firstRow(res);
    }, undefined),
  ]);

  const n = (v: string | undefined) => Number(v ?? 0);

  return c.json({
    outstandingInvoices: n(invoicesResult?.['outstanding']),
    activeEmployees: n(employeesResult?.['count']),
    openOrders: n(ordersResult?.['count']),
    pendingApprovals: n(approvalsResult?.['count']),
  });
});
