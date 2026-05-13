import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { sharedDb as db } from '../shared.js';

export const dashboardRouter = new Hono();

// ── Types ─────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  entityType: string;
  label: string;
  verb: string;
  status: string | undefined;
  timestamp: unknown;
}

// ── Helpers ───────────────────────────────────────────────────

function getVerb(entityType: string, status?: string): string {
  const map: Record<string, string> = {
    invoice: status === 'paid' ? 'Invoice paid' : 'Invoice updated',
    expense: status === 'approved' ? 'Expense approved' : 'Expense submitted',
    employee: 'Employee record updated',
    sales_order: status === 'delivered' ? 'Order delivered' : 'Order updated',
    purchase_order: status === 'approved' ? 'PO approved' : 'PO updated',
    project: 'Project updated',
    deal: status === 'won' ? 'Deal won' : 'Deal updated',
    payroll_run: status === 'completed' ? 'Payroll completed' : 'Payroll updated',
    time_entry: 'Time logged',
    inventory_item: 'Inventory updated',
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
  const entityType = record['entityType'] as string;
  const status = (d['status'] as string | undefined) ?? (record['status'] as string | undefined);
  const verb = getVerb(entityType, status);
  return {
    id: record['id'] as string,
    entityType,
    label,
    verb,
    status,
    timestamp: record['updatedAt'],
  };
}

// ── GET /stats ────────────────────────────────────────────────

dashboardRouter.get('/stats', async (c) => {
  const tenantId = c.req.query('tenantId') ?? 'demo';

  // Helper to safely run a query and return 0 on error
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
          AND "entityType" IN ('invoice', 'expense')
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    // HR: active employees
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'employee'
          AND data->>'status' = 'active'
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    // HR: pending leave requests
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'leave_request'
          AND data->>'status' = 'pending'
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    // HR: payroll runs this month
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'payroll_run'
          AND "createdAt" >= date_trunc('month', now())
          AND "createdAt" <= now()
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    // Inventory stats
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT
          COUNT(*) AS total_products,
          COUNT(CASE WHEN (data->>'stock_level')::numeric < (data->>'reorder_level')::numeric THEN 1 END) AS low_stock,
          COALESCE(SUM((data->>'stock_level')::numeric * (data->>'cost_price')::numeric), 0) AS total_value
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'inventory_item'
          AND (data->>'stock_level') IS NOT NULL
          AND (data->>'reorder_level') IS NOT NULL
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    // Sales orders
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'sales_order'
          AND data->>'status' NOT IN ('delivered', 'cancelled')
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    // Deals
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM((data->>'value')::numeric), 0) AS total_value
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'deal'
          AND data->>'status' NOT IN ('won', 'lost')
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    // Projects
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'project'
          AND data->>'status' IN ('active', 'in_progress')
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    // Tasks in progress
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'task'
          AND data->>'status' = 'in_progress'
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    // Purchase orders
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'purchase_order'
          AND data->>'status' NOT IN ('received', 'cancelled')
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    // Pending approvals
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "approvalRequests"
        WHERE "tenantId" = ${tenantId}
          AND "status" = 'pending'
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    // Time entries this week
    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COALESCE(SUM((data->>'hours')::numeric), 0) AS total_hours
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'time_entry'
          AND "createdAt" >= date_trunc('week', now())
          AND "createdAt" <= now()
      `);
      return res.rows[0] as Record<string, string> | undefined;
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
  const tenantId = c.req.query('tenantId') ?? 'demo';
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

    const activities: ActivityItem[] = (result.rows as Record<string, unknown>[]).map((row) => {
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
  const tenantId = c.req.query('tenantId') ?? 'demo';

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
          AND "entityType" = 'invoice'
          AND data->>'status' IN ('sent', 'overdue')
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'employee'
          AND data->>'status' = 'active'
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'sales_order'
          AND data->>'status' NOT IN ('delivered', 'cancelled')
      `);
      return res.rows[0] as Record<string, string> | undefined;
    }, undefined),

    safeQuery(async () => {
      const res = await db.execute(sql`
        SELECT COUNT(*) AS count
        FROM "approvalRequests"
        WHERE "tenantId" = ${tenantId}
          AND "status" = 'pending'
      `);
      return res.rows[0] as Record<string, string> | undefined;
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
