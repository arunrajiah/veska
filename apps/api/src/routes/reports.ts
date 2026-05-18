import { Hono } from 'hono';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { schema } from '@veska/core';
import { aiLimit } from '../lib/rate-limiters.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { sharedLlm } from '../shared.js';

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

// ── Builder ReportDefinition types ───────────────────────────

interface BuilderFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: string | number | string[];
}

interface ReportDefinition {
  entityType: string;
  fields: string[];
  filters: BuilderFilter[];
  groupBy?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  aggregationField?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  limit?: number;
}

export const reportsRouter = new Hono<{ Variables: TenantContext }>();

// ── POST /reports/run ─────────────────────────────────────────
// Execute a dynamic report definition without saving it first.

reportsRouter.post('/run', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const t0 = Date.now();

  let def: ReportDefinition;
  try {
    def = await c.req.json<ReportDefinition>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!def.entityType) {
    return c.json({ error: 'entityType is required' }, 400);
  }

  try {
    // Base WHERE conditions
    const conditions: ReturnType<typeof sql>[] = [
      sql`"tenantId" = ${tenantId}`,
      sql`"entityType" = ${def.entityType}`,
      sql`"deletedAt" IS NULL`,
    ];

    // Apply filters
    for (const filter of def.filters ?? []) {
      const field = safePgField(filter.field);
      const val = filter.value;
      switch (filter.operator) {
        case 'eq':
          conditions.push(sql.raw(`data->>'${field}' = `).append(sql`${String(val)}`));
          break;
        case 'neq':
          conditions.push(sql.raw(`data->>'${field}' != `).append(sql`${String(val)}`));
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
        case 'in': {
          const vals = Array.isArray(val) ? val : [String(val)];
          // Build IN list as a series of ORs since Drizzle sql tagged templates don't support arrays natively here
          const orParts = vals.map((v) =>
            sql.raw(`data->>'${field}' = `).append(sql`${String(v)}`),
          );
          const orClause = orParts.reduce((acc, part, idx) =>
            idx === 0 ? sql`(${part})` : sql`${acc} OR (${part})`,
          );
          conditions.push(sql`(${orClause})`);
          break;
        }
      }
    }

    const whereClause = conditions.reduce((acc, cond, idx) =>
      idx === 0 ? cond : sql`${acc} AND ${cond}`,
    );

    const limit = def.limit ?? 100;
    const groupByField = def.groupBy ? safePgField(def.groupBy) : null;
    const orderByField = def.orderBy ? safePgField(def.orderBy) : null;
    const orderDir = def.orderDir === 'desc' ? 'DESC' : 'ASC';

    let queryResult: Record<string, unknown>[];

    if (groupByField) {
      // Grouped query with aggregation
      const agg = def.aggregation ?? 'count';
      let aggExpr: string;
      if (agg === 'count') {
        aggExpr = 'COUNT(*) AS agg_value';
      } else {
        const aggField = def.aggregationField ? safePgField(def.aggregationField) : (def.fields[0] ? safePgField(def.fields[0]) : 'value');
        aggExpr = `${agg.toUpperCase()}((data->>'${aggField}')::numeric) AS agg_value`;
      }
      const orderExpr = orderByField
        ? `ORDER BY data->>'${orderByField}' ${orderDir}`
        : `ORDER BY agg_value ${orderDir}`;

      const res = await db.execute(
        sql
          .raw(`SELECT data->>'${groupByField}' AS group_key, ${aggExpr} FROM "entityRecords" WHERE `)
          .append(whereClause)
          .append(sql.raw(` GROUP BY data->>'${groupByField}' ${orderExpr} LIMIT ${limit}`)),
      );
      queryResult = res.rows as Record<string, unknown>[];
    } else if (def.fields && def.fields.length > 0) {
      // Select specific fields from JSONB
      const selectParts = def.fields
        .map((f) => `data->>'${safePgField(f)}' AS "${safePgField(f)}"`)
        .join(', ');
      const orderExpr = orderByField
        ? `ORDER BY data->>'${orderByField}' ${orderDir}`
        : '';

      const res = await db.execute(
        sql
          .raw(`SELECT id, ${selectParts} FROM "entityRecords" WHERE `)
          .append(whereClause)
          .append(sql.raw(` ${orderExpr} LIMIT ${limit}`)),
      );
      queryResult = res.rows as Record<string, unknown>[];
    } else {
      // Select all data
      const orderExpr = orderByField
        ? `ORDER BY data->>'${orderByField}' ${orderDir}`
        : `ORDER BY "createdAt" DESC`;

      const res = await db.execute(
        sql
          .raw(`SELECT id, data, "createdAt" FROM "entityRecords" WHERE `)
          .append(whereClause)
          .append(sql.raw(` ${orderExpr} LIMIT ${limit}`)),
      );
      queryResult = res.rows as Record<string, unknown>[];
    }

    const columns = queryResult.length > 0 ? Object.keys(queryResult[0]!) : [];
    const rows = queryResult.map((r) => columns.map((col) => r[col] ?? null));

    return c.json({
      columns,
      rows,
      total: rows.length,
      executionMs: Date.now() - t0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

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
// AI Report Generation
// ═══════════════════════════════════════════════════════════════

// Schema context provided to the LLM
const SCHEMA_CONTEXT = `
entityRecords(id, tenantId, entityType, data JSONB, createdAt, updatedAt)
serviceTickets(id, tenantId, code, title, status, priority, assignedTo, createdAt)
vendors(id, tenantId, code, name, status, avgRating)
timeEntries(id, tenantId, userId, projectId, hours, date)
budgets(id, tenantId, name, totalAmount, status)
budgetLineItems(id, budgetId, category, plannedAmount, actualAmount)
priceLists(id, tenantId, name, type, currency)
contracts(id, tenantId, title, status, startDate, endDate)
payrollRuns(id, tenantId, period, status, totalGross, totalNet)
`.trim();

// Words that must not appear in AI-generated SQL
const DANGEROUS_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|REPLACE|GRANT|REVOKE)\b/i;

// ── POST /reports/ai-generate ─────────────────────────────────

reportsRouter.post('/ai-generate', aiLimit, async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  let body: { prompt?: string; maxRows?: number };
  try {
    body = await c.req.json<{ prompt?: string; maxRows?: number }>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return c.json({ error: 'prompt is required' }, 400);
  }

  const maxRows = body.maxRows ?? 500;

  const systemPrompt = [
    'You are a PostgreSQL expert for an ERP system.',
    `Given this schema:\n${SCHEMA_CONTEXT}`,
    `And a user question, generate a single valid SELECT query.`,
    `The tenant is always filtered with tenantId = '${tenantId}'.`,
    `Return ONLY a JSON object with no markdown fences:`,
    `{ "sql": string, "chartType": "bar"|"line"|"pie"|"table", "title": string, "xAxis"?: string, "yAxis"?: string }`,
    'Never include UPDATE/DELETE/INSERT/DROP/TRUNCATE/ALTER/CREATE statements.',
  ].join('\n');

  const userPrompt = `User question: ${prompt}`;

  let generatedSql: string;
  let chartType: string;
  let title: string;
  let xAxis: string | undefined;
  let yAxis: string | undefined;

  try {
    const completion = await sharedLlm.complete({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1024,
    });

    const rawText = completion.content
      .trim()
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    const parsed = JSON.parse(rawText) as {
      sql: string;
      chartType: string;
      title: string;
      xAxis?: string;
      yAxis?: string;
    };

    generatedSql = parsed.sql;
    chartType = parsed.chartType;
    title = parsed.title;
    xAxis = parsed.xAxis;
    yAxis = parsed.yAxis;
  } catch (err) {
    return c.json(
      { error: 'Could not generate valid SQL', detail: String(err) },
      400,
    );
  }

  // Safety check — reject dangerous statements
  if (DANGEROUS_KEYWORDS.test(generatedSql)) {
    return c.json(
      { error: 'Could not generate valid SQL', detail: 'Generated SQL contains prohibited statements' },
      400,
    );
  }

  // Execute the generated SQL
  let rows: unknown[][];
  let columns: string[];

  try {
    const result = await db.execute(sql.raw(generatedSql));
    const allRows = result.rows as Record<string, unknown>[];

    if (allRows.length === 0) {
      columns = [];
      rows = [];
    } else {
      columns = Object.keys(allRows[0]!);
      rows = allRows.slice(0, maxRows).map((r) => columns.map((col) => r[col] ?? null));
    }
  } catch (err) {
    return c.json(
      { error: 'Could not generate valid SQL', detail: `Query execution failed: ${String(err)}` },
      400,
    );
  }

  return c.json({
    title,
    sql: generatedSql,
    chartType,
    xAxis,
    yAxis,
    columns,
    rows,
    rowCount: rows.length,
  });
});

// ── GET /reports/:id/export ───────────────────────────────────

reportsRouter.get('/:id/export', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const format = c.req.query('format') ?? 'csv';

  try {
    // Fetch the saved report
    const reportRes = await db.execute(sql`
      SELECT config FROM "savedReports"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
    `);
    if (!reportRes.rows[0]) {
      return c.json({ error: 'Report not found' }, 404);
    }

    const config = (reportRes.rows[0] as Record<string, unknown>)['config'] as ReportConfig;

    if (!config.entityType) {
      return c.json({ error: 'Report config is missing entityType' }, 400);
    }

    // Build the base conditions
    const conditions: ReturnType<typeof sql>[] = [
      sql`"tenantId" = ${tenantId}`,
      sql`"entityType" = ${config.entityType}`,
      sql`"deletedAt" IS NULL`,
    ];

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

    const whereClause = conditions.reduce((acc, cond, idx) =>
      idx === 0 ? cond : sql`${acc} AND ${cond}`,
    );

    const metrics = config.metrics ?? [];
    const groupByField = config.groupBy ? safePgField(config.groupBy) : null;

    let dbRows: Record<string, unknown>[];

    if (groupByField && metrics.length > 0) {
      const aggParts = metrics.map((m) => buildAggregation(m)).join(', ');
      const queryRes = await db.execute(
        sql
          .raw(`SELECT data->>'${groupByField}' AS group_key, ${aggParts} FROM "entityRecords" WHERE `)
          .append(whereClause)
          .append(sql.raw(` GROUP BY data->>'${groupByField}' ORDER BY data->>'${groupByField}'`)),
      );
      dbRows = queryRes.rows as Record<string, unknown>[];
    } else if (metrics.length > 0) {
      const aggParts = metrics.map((m) => buildAggregation(m)).join(', ');
      const queryRes = await db.execute(
        sql.raw(`SELECT ${aggParts} FROM "entityRecords" WHERE `).append(whereClause),
      );
      dbRows = queryRes.rows as Record<string, unknown>[];
    } else {
      const queryRes = await db.execute(
        sql.raw(`SELECT * FROM "entityRecords" WHERE `).append(whereClause).append(sql.raw(' LIMIT 10000')),
      );
      dbRows = queryRes.rows as Record<string, unknown>[];
    }

    if (format === 'csv') {
      // Build CSV
      const columns = dbRows.length > 0 ? Object.keys(dbRows[0]!) : [];

      function csvEscape(val: unknown): string {
        if (val === null || val === undefined) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        // Quote if contains comma, double-quote, or newline
        if (/[",\r\n]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }

      const lines: string[] = [];
      lines.push(columns.map(csvEscape).join(','));
      for (const row of dbRows) {
        lines.push(columns.map((col) => csvEscape(row[col])).join(','));
      }
      const csv = lines.join('\r\n');

      c.header('Content-Type', 'text/csv; charset=utf-8');
      c.header('Content-Disposition', `attachment; filename="report-${id}.csv"`);
      return c.text(csv, 200);
    }

    // Default: return JSON
    return c.json({ rows: dbRows, rowCount: dbRows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
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
