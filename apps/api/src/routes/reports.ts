import { Hono } from 'hono';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';

// ── Saved-report types ────────────────────────────────────────

interface MetricConfig {
  field: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  label: string;
}

interface FilterConfig {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value: string | number;
}

interface DateRangeConfig {
  field: string;
  from?: string;
  to?: string;
}

interface ReportConfig {
  entityType: string;
  metrics: MetricConfig[];
  filters: FilterConfig[];
  groupBy?: string;
  dateRange?: DateRangeConfig;
}

// Sanitise a JSONB field path so it only contains safe characters.
function safePgField(field: string): string {
  return field.replace(/[^a-zA-Z0-9_.]/g, '');
}

function buildAggregation(metric: MetricConfig): string {
  const field = safePgField(metric.field);
  const label = safePgField(metric.label);
  const agg = metric.aggregation.toUpperCase();
  if (agg === 'COUNT') {
    return `COUNT(*) AS "${label}"`;
  }
  return `${agg}((data->>'${field}')::numeric) AS "${label}"`;
}

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

// ═══════════════════════════════════════════════════════════════
// Saved Reports CRUD
// ═══════════════════════════════════════════════════════════════

// ── GET /reports/saved ────────────────────────────────────────

reportsRouter.get('/saved', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  try {
    const res = await db.execute(sql`
      SELECT id, "tenantId", name, description, config, "createdBy", "isPublic", "createdAt", "updatedAt"
      FROM "savedReports"
      WHERE "tenantId" = ${tenantId}
      ORDER BY "createdAt" DESC
    `);
    return c.json(res.rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── POST /reports/saved ───────────────────────────────────────

reportsRouter.post('/saved', async (c) => {
  const { db, tenantId, identityId } = c.get('tenantCtx');
  try {
    const body = await c.req.json<{
      name: string;
      description?: string;
      config: ReportConfig;
      isPublic?: boolean;
    }>();

    if (!body.name || !body.config?.entityType) {
      return c.json({ error: 'name and config.entityType are required' }, 400);
    }

    const res = await db.execute(sql`
      INSERT INTO "savedReports" ("tenantId", name, description, config, "createdBy", "isPublic")
      VALUES (
        ${tenantId},
        ${body.name},
        ${body.description ?? null},
        ${JSON.stringify(body.config)}::jsonb,
        ${identityId},
        ${body.isPublic ?? false}
      )
      RETURNING *
    `);

    return c.json(res.rows[0], 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── GET /reports/saved/:id ────────────────────────────────────

reportsRouter.get('/saved/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  try {
    const res = await db.execute(sql`
      SELECT * FROM "savedReports"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
    `);
    if (!res.rows[0]) return c.json({ error: 'Report not found' }, 404);
    return c.json(res.rows[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── PUT /reports/saved/:id ────────────────────────────────────

reportsRouter.put('/saved/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  try {
    const body = await c.req.json<{
      name?: string;
      description?: string;
      config?: ReportConfig;
      isPublic?: boolean;
    }>();

    const res = await db.execute(sql`
      UPDATE "savedReports"
      SET
        name        = COALESCE(${body.name ?? null}, name),
        description = COALESCE(${body.description ?? null}, description),
        config      = COALESCE(${body.config ? JSON.stringify(body.config) : null}::jsonb, config),
        "isPublic"  = COALESCE(${body.isPublic ?? null}, "isPublic"),
        "updatedAt" = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    if (!res.rows[0]) return c.json({ error: 'Report not found' }, 404);
    return c.json(res.rows[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── DELETE /reports/saved/:id ─────────────────────────────────

reportsRouter.delete('/saved/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  try {
    const res = await db.execute(sql`
      DELETE FROM "savedReports"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING id
    `);
    if (!res.rows[0]) return c.json({ error: 'Report not found' }, 404);
    return c.json({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── POST /reports/saved/:id/run ───────────────────────────────
// Dynamically execute a saved report against entityRecords.

reportsRouter.post('/saved/:id/run', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  try {
    const reportRes = await db.execute(sql`
      SELECT config FROM "savedReports"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
    `);
    if (!reportRes.rows[0]) return c.json({ error: 'Report not found' }, 404);

    const config = (reportRes.rows[0] as Record<string, unknown>)['config'] as ReportConfig;

    if (!config.entityType) {
      return c.json({ error: 'Report config is missing entityType' }, 400);
    }

    // Collect parameterised WHERE conditions
    const conditions: ReturnType<typeof sql>[] = [
      sql`"tenantId" = ${tenantId}`,
      sql`"entityType" = ${config.entityType}`,
      sql`"deletedAt" IS NULL`,
    ];

    // Date range filter — field names are sanitised, values are parameterised
    if (config.dateRange) {
      const dr = config.dateRange;
      const dateField = safePgField(dr.field);
      if (dr.from) {
        conditions.push(
          sql.raw(`(data->>'${dateField}')::timestamptz >= `).append(sql`${dr.from}::timestamptz`),
        );
      }
      if (dr.to) {
        conditions.push(
          sql.raw(`(data->>'${dateField}')::timestamptz <= `).append(sql`${dr.to}::timestamptz`),
        );
      }
    }

    // Field filters — operators are exhaustively matched, values are parameterised
    for (const filter of config.filters ?? []) {
      const field = safePgField(filter.field);
      const val = filter.value;
      switch (filter.operator) {
        case 'eq':
          conditions.push(sql.raw(`data->>'${field}' = `).append(sql`${String(val)}`));
          break;
        case 'gt':
          conditions.push(sql.raw(`(data->>'${field}')::numeric > `).append(sql`${Number(val)}`));
          break;
        case 'lt':
          conditions.push(sql.raw(`(data->>'${field}')::numeric < `).append(sql`${Number(val)}`));
          break;
        case 'gte':
          conditions.push(sql.raw(`(data->>'${field}')::numeric >= `).append(sql`${Number(val)}`));
          break;
        case 'lte':
          conditions.push(sql.raw(`(data->>'${field}')::numeric <= `).append(sql`${Number(val)}`));
          break;
        case 'contains':
          conditions.push(
            sql.raw(`data->>'${field}' ILIKE `).append(sql`${'%' + String(val) + '%'}`),
          );
          break;
      }
    }

    // Combine all conditions with AND
    const whereClause = conditions.reduce((acc, cond, idx) =>
      idx === 0 ? cond : sql`${acc} AND ${cond}`,
    );

    const metrics = config.metrics ?? [];
    const groupByField = config.groupBy ? safePgField(config.groupBy) : null;

    let rows: Record<string, unknown>[];

    if (groupByField && metrics.length > 0) {
      const aggParts = metrics.map((m) => buildAggregation(m)).join(', ');
      const queryRes = await db.execute(
        sql
          .raw(
            `SELECT data->>'${groupByField}' AS group_key, ${aggParts} FROM "entityRecords" WHERE `,
          )
          .append(whereClause)
          .append(sql.raw(` GROUP BY data->>'${groupByField}' ORDER BY data->>'${groupByField}'`)),
      );
      rows = queryRes.rows as Record<string, unknown>[];
    } else if (metrics.length > 0) {
      const aggParts = metrics.map((m) => buildAggregation(m)).join(', ');
      const queryRes = await db.execute(
        sql.raw(`SELECT ${aggParts} FROM "entityRecords" WHERE `).append(whereClause),
      );
      rows = queryRes.rows as Record<string, unknown>[];
    } else {
      const queryRes = await db.execute(
        sql.raw(`SELECT COUNT(*) AS count FROM "entityRecords" WHERE `).append(whereClause),
      );
      rows = queryRes.rows as Record<string, unknown>[];
    }

    return c.json({
      reportId: id,
      ranAt: new Date().toISOString(),
      rows,
      summary: { rowCount: rows.length },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── GET /reports/saved/:id/schedules ──────────────────────────

reportsRouter.get('/saved/:id/schedules', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  try {
    const res = await db.execute(sql`
      SELECT rs.*
      FROM "reportSchedules" rs
      JOIN "savedReports" sr ON sr.id = rs."reportId"
      WHERE rs."reportId" = ${id}
        AND sr."tenantId" = ${tenantId}
      ORDER BY rs."createdAt" DESC
    `);
    return c.json(res.rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── POST /reports/saved/:id/schedules ─────────────────────────

reportsRouter.post('/saved/:id/schedules', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  try {
    const reportRes = await db.execute(sql`
      SELECT id FROM "savedReports" WHERE id = ${id} AND "tenantId" = ${tenantId}
    `);
    if (!reportRes.rows[0]) return c.json({ error: 'Report not found' }, 404);

    const body = await c.req.json<{ cronExpr: string; recipients: string[] }>();
    if (!body.cronExpr) return c.json({ error: 'cronExpr is required' }, 400);

    const recipients = Array.isArray(body.recipients) ? body.recipients : [];

    const res = await db.execute(sql`
      INSERT INTO "reportSchedules" ("tenantId", "reportId", "cronExpr", recipients)
      VALUES (
        ${tenantId},
        ${id},
        ${body.cronExpr},
        ${JSON.stringify(recipients)}::jsonb
      )
      RETURNING *
    `);

    return c.json(res.rows[0], 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── DELETE /reports/saved/:id/schedules/:scheduleId ───────────

reportsRouter.delete('/saved/:id/schedules/:scheduleId', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const scheduleId = c.req.param('scheduleId');
  try {
    const res = await db.execute(sql`
      DELETE FROM "reportSchedules" rs
      USING "savedReports" sr
      WHERE rs.id = ${scheduleId}
        AND rs."reportId" = ${id}
        AND sr.id = rs."reportId"
        AND sr."tenantId" = ${tenantId}
      RETURNING rs.id
    `);
    if (!res.rows[0]) return c.json({ error: 'Schedule not found' }, 404);
    return c.json({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});
