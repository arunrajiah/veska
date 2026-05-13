import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';

export const reportsRouter = new Hono<{ Variables: TenantContext }>();

// ── Finance summary ───────────────────────────────────────────

reportsRouter.get('/finance', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const invoices = await db.query.entityRecords.findMany({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Invoice'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  const today = new Date().toISOString().slice(0, 10);

  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let overdueCount = 0;

  // byMonth accumulator: last 6 months
  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    );
  }
  const byMonthMap: Record<string, { invoiced: number; paid: number }> = {};
  for (const mk of monthKeys) byMonthMap[mk] = { invoiced: 0, paid: 0 };

  for (const inv of invoices) {
    const d = inv.data as Record<string, unknown>;
    const total =
      typeof d['total'] === 'number'
        ? d['total']
        : parseFloat(String(d['total'] ?? '0'));
    const amount = isNaN(total) ? 0 : total;
    const status = (d['status'] as string) ?? '';
    const dueDate = (d['due_date'] as string) ?? '';

    totalInvoiced += amount;

    if (status === 'paid') totalPaid += amount;
    if (status === 'sent' || status === 'draft') totalOutstanding += amount;
    if (status === 'sent' && dueDate && dueDate < today) overdueCount++;

    const month =
      typeof inv.createdAt === 'string'
        ? inv.createdAt.slice(0, 7)
        : new Date(inv.createdAt).toISOString().slice(0, 7);

    if (byMonthMap[month]) {
      byMonthMap[month]!.invoiced += amount;
      if (status === 'paid') byMonthMap[month]!.paid += amount;
    }
  }

  const byMonth = monthKeys.map((month) => ({
    month,
    invoiced: byMonthMap[month]?.invoiced ?? 0,
    paid: byMonthMap[month]?.paid ?? 0,
  }));

  return c.json({ totalInvoiced, totalPaid, totalOutstanding, overdueCount, byMonth });
});

// ── Inventory valuation ───────────────────────────────────────

reportsRouter.get('/inventory', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const [products, movements] = await Promise.all([
    db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Product'),
        isNull(schema.entityRecords.deletedAt),
      ),
    }),
    db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'StockMovement'),
        isNull(schema.entityRecords.deletedAt),
      ),
    }),
  ]);

  // Compute stock levels per product (sum across all warehouses)
  const stockByProduct: Record<string, number> = {};
  for (const m of movements) {
    const d = m.data as Record<string, unknown>;
    const productId = String(d['product_id'] ?? '');
    if (!productId) continue;
    const qty = Number(d['quantity'] ?? 0);
    if (d['type'] === 'adjustment') stockByProduct[productId] = qty;
    else if (d['type'] === 'in')
      stockByProduct[productId] = (stockByProduct[productId] ?? 0) + qty;
    else if (d['type'] === 'out')
      stockByProduct[productId] = (stockByProduct[productId] ?? 0) - qty;
  }

  const skuSet = new Set<string>();
  let valuationByCost = 0;

  const items = products.map((p) => {
    const d = p.data as Record<string, unknown>;
    const sku = (d['sku'] as string) ?? '';
    if (sku) skuSet.add(sku);
    const costPrice =
      typeof d['cost_price'] === 'number'
        ? d['cost_price']
        : parseFloat(String(d['cost_price'] ?? '0'));
    const cp = isNaN(costPrice) ? 0 : costPrice;
    const totalQuantity = stockByProduct[p.id] ?? 0;
    const totalValue = totalQuantity * cp;
    valuationByCost += totalValue;
    return {
      productId: p.id,
      productName: (d['name'] as string) ?? '',
      sku,
      totalQuantity,
      costPrice: cp,
      totalValue,
    };
  });

  // Sort by total value descending
  items.sort((a, b) => b.totalValue - a.totalValue);

  return c.json({
    totalProducts: products.length,
    totalSkus: skuSet.size,
    valuationByCost,
    items,
  });
});

// ── HR headcount ──────────────────────────────────────────────

reportsRouter.get('/hr', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const [employees, leaveRequests] = await Promise.all([
    db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Employee'),
        isNull(schema.entityRecords.deletedAt),
      ),
    }),
    db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'LeaveRequest'),
        isNull(schema.entityRecords.deletedAt),
      ),
    }),
  ]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let activeCount = 0;
  let onLeaveCount = 0;
  let inactiveCount = 0;
  const deptMap: Record<string, number> = {};
  const recentHires: unknown[] = [];

  for (const emp of employees) {
    const d = emp.data as Record<string, unknown>;
    const status = (d['status'] as string) ?? 'active';
    if (status === 'active') activeCount++;
    else if (status === 'on_leave') onLeaveCount++;
    else inactiveCount++;

    const dept = (d['department'] as string) ?? 'Unassigned';
    deptMap[dept] = (deptMap[dept] ?? 0) + 1;

    const createdAt =
      typeof emp.createdAt === 'string' ? emp.createdAt : new Date(emp.createdAt).toISOString();
    if (createdAt >= thirtyDaysAgo) recentHires.push(emp);
  }

  const byDepartment = Object.entries(deptMap).map(([department, count]) => ({
    department,
    count,
  }));

  // Leave stats
  let leavePending = 0;
  let leaveApproved = 0;
  let leaveRejected = 0;
  const leaveTypeMap: Record<string, number> = {};

  for (const lr of leaveRequests) {
    const d = lr.data as Record<string, unknown>;
    const st = (d['status'] as string) ?? 'pending';
    if (st === 'pending') leavePending++;
    else if (st === 'approved') leaveApproved++;
    else if (st === 'rejected') leaveRejected++;

    const type = (d['leave_type'] as string) ?? 'other';
    leaveTypeMap[type] = (leaveTypeMap[type] ?? 0) + 1;
  }

  const byType = Object.entries(leaveTypeMap).map(([type, count]) => ({ type, count }));

  return c.json({
    totalEmployees: employees.length,
    activeCount,
    onLeaveCount,
    inactiveCount,
    byDepartment,
    recentHires,
    leaveStats: {
      pending: leavePending,
      approved: leaveApproved,
      rejected: leaveRejected,
      byType,
    },
  });
});

// ── Projects status ───────────────────────────────────────────

reportsRouter.get('/projects', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const [projects, tasks] = await Promise.all([
    db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Project'),
        isNull(schema.entityRecords.deletedAt),
      ),
    }),
    db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Task'),
        isNull(schema.entityRecords.deletedAt),
      ),
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  // Project counts by status
  const byStatus: Record<string, number> = {
    planning: 0,
    active: 0,
    on_hold: 0,
    completed: 0,
  };
  for (const p of projects) {
    const d = p.data as Record<string, unknown>;
    const status = (d['status'] as string) ?? 'planning';
    if (status in byStatus) byStatus[status]!++;
  }

  // Task stats
  let taskTodo = 0;
  let taskInProgress = 0;
  let taskReview = 0;
  let taskDone = 0;
  let overdueTaskCount = 0;

  // Tasks per project
  const tasksByProject: Record<string, { total: number; done: number }> = {};

  for (const task of tasks) {
    const d = task.data as Record<string, unknown>;
    const status = (d['status'] as string) ?? 'todo';
    const dueDate = (d['due_date'] as string) ?? '';
    const projectId = (d['project_id'] as string) ?? '';

    if (status === 'todo') taskTodo++;
    else if (status === 'in_progress') taskInProgress++;
    else if (status === 'review') taskReview++;
    else if (status === 'done') taskDone++;

    if (dueDate && dueDate < today && status !== 'done') overdueTaskCount++;

    if (projectId) {
      if (!tasksByProject[projectId]) tasksByProject[projectId] = { total: 0, done: 0 };
      tasksByProject[projectId]!.total++;
      if (status === 'done') tasksByProject[projectId]!.done++;
    }
  }

  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (taskDone / totalTasks) * 100 : 0;

  const projectsWithProgress = projects.map((p) => {
    const d = p.data as Record<string, unknown>;
    const stats = tasksByProject[p.id] ?? { total: 0, done: 0 };
    const progressPct =
      stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    return {
      projectId: p.id,
      name: (d['name'] as string) ?? '',
      status: (d['status'] as string) ?? 'planning',
      taskCount: stats.total,
      completedTasks: stats.done,
      progressPct,
    };
  });

  return c.json({
    totalProjects: projects.length,
    byStatus,
    taskStats: {
      total: totalTasks,
      todo: taskTodo,
      in_progress: taskInProgress,
      review: taskReview,
      done: taskDone,
    },
    completionRate,
    overdueTaskCount,
    projectsWithProgress,
  });
});
