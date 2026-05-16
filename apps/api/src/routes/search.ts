import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const searchRouter = new Hono<{ Variables: TenantContext }>();

// ── Helpers ───────────────────────────────────────────────────

function summarize(
  entityType: string,
  data: Record<string, unknown>,
): { title: string; subtitle: string } {
  switch (entityType) {
    case 'Invoice':
      return {
        title: `Invoice ${data['number'] ?? ''}`,
        subtitle: `${data['customerName'] ?? ''} · ${data['status'] ?? ''}`,
      };
    case 'Contact':
      return {
        title: (data['name'] as string) ?? entityType,
        subtitle: (data['email'] as string) ?? '',
      };
    case 'Employee':
      return {
        title: (data['name'] as string) ?? entityType,
        subtitle: (data['role'] as string) ?? '',
      };
    case 'Ticket':
      return {
        title: (data['title'] as string) ?? entityType,
        subtitle: `#${data['number'] ?? ''} · ${data['status'] ?? ''}`,
      };
    case 'Expense':
      return {
        title: (data['title'] as string) ?? entityType,
        subtitle: `${data['amount'] ?? ''} · ${data['status'] ?? ''}`,
      };
    case 'Project':
      return {
        title: (data['name'] as string) ?? entityType,
        subtitle: (data['status'] as string) ?? '',
      };
    case 'Deal':
      return {
        title: (data['name'] as string) ?? entityType,
        subtitle: `${data['stage'] ?? ''} · ${data['value'] ?? ''}`,
      };
    case 'LeaveRequest':
      return {
        title: `${data['employeeName'] ?? ''} leave`,
        subtitle: `${data['startDate'] ?? ''} – ${data['endDate'] ?? ''}`,
      };
    default:
      return {
        title:
          (data['name'] as string) ??
          (data['title'] as string) ??
          entityType,
        subtitle: entityType,
      };
  }
}

function hrefFor(entityType: string, id: string): string {
  const map: Record<string, string> = {
    Invoice: `/dashboard/finance/invoices/${id}`,
    Contact: `/dashboard/crm/contacts/${id}`,
    Employee: `/dashboard/hr/employees/${id}`,
    Ticket: `/dashboard/support/tickets/${id}`,
    Expense: `/dashboard/expenses/${id}`,
    Project: `/dashboard/projects/${id}`,
    Deal: `/dashboard/crm/deals/${id}`,
  };
  return map[entityType] ?? `/dashboard`;
}

// ── GET /search ───────────────────────────────────────────────
// Full-text search across entityRecords using PostgreSQL FTS.
// Query params:
//   q      - search query string (required, min 2 chars)
//   types  - comma-separated entity types to filter (optional)
//   limit  - max results, capped at 50 (default 20)

searchRouter.get('/', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const q = (c.req.query('q') ?? '').trim();
  const typesParam = c.req.query('types') ?? '';
  const limitParam = parseInt(c.req.query('limit') ?? '20', 10);
  const limit = Math.min(isNaN(limitParam) ? 20 : limitParam, 50);

  if (q.length < 2) {
    return c.json({ query: q, total: 0, results: [] });
  }

  const filterTypes = typesParam
    ? typesParam.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  try {
    let rows: Record<string, unknown>[];

    if (filterTypes.length > 0) {
      const res = await db.execute(sql`
        SELECT
          id,
          "entityType",
          data,
          "createdAt",
          ts_rank(
            to_tsvector('english', data::text),
            plainto_tsquery('english', ${q})
          ) AS rank
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = ANY(${filterTypes}::text[])
          AND "deletedAt" IS NULL
          AND to_tsvector('english', data::text) @@ plainto_tsquery('english', ${q})
        ORDER BY rank DESC
        LIMIT ${limit}
      `);
      rows = res.rows as Record<string, unknown>[];
    } else {
      const res = await db.execute(sql`
        SELECT
          id,
          "entityType",
          data,
          "createdAt",
          ts_rank(
            to_tsvector('english', data::text),
            plainto_tsquery('english', ${q})
          ) AS rank
        FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "deletedAt" IS NULL
          AND to_tsvector('english', data::text) @@ plainto_tsquery('english', ${q})
        ORDER BY rank DESC
        LIMIT ${limit}
      `);
      rows = res.rows as Record<string, unknown>[];
    }

    const results = rows.map((row) => {
      const id = String(row['id'] ?? '');
      const entityType = String(row['entityType'] ?? '');
      const data = (row['data'] ?? {}) as Record<string, unknown>;
      const rank = parseFloat(String(row['rank'] ?? 0));
      const { title, subtitle } = summarize(entityType, data);
      const href = hrefFor(entityType, id);

      return { id, entityType, title, subtitle, href, rank };
    });

    return c.json({ query: q, total: results.length, results });
  } catch (err) {
    return handleRouteError(c, err, 'GET /search');
  }
});

// ── GET /search/suggest ───────────────────────────────────────
// Quick autocomplete — returns top 5 entity labels matching the query.
// Extracts label from data->>'name', data->>'title', or data->>'number'.

searchRouter.get('/suggest', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const q = (c.req.query('q') ?? '').trim();

  if (!q) {
    return c.json([]);
  }

  try {
    const res = await db.execute(sql`
      SELECT
        id,
        "entityType",
        COALESCE(
          NULLIF(data->>'name', ''),
          NULLIF(data->>'title', ''),
          NULLIF(data->>'number', ''),
          id
        ) AS label
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "deletedAt" IS NULL
        AND to_tsvector('english', data::text) @@ plainto_tsquery('english', ${q})
      ORDER BY ts_rank(to_tsvector('english', data::text), plainto_tsquery('english', ${q})) DESC
      LIMIT 5
    `);

    const suggestions = (res.rows as Record<string, unknown>[]).map((row) => ({
      id: row['id'],
      entityType: row['entityType'],
      label: row['label'],
    }));

    return c.json(suggestions);
  } catch (err) {
    return handleRouteError(c, err, 'GET /search/suggest');
  }
});
