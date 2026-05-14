import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { TenantContext } from '../middleware/tenant-context.js';

export const searchRouter = new Hono<{ Variables: TenantContext }>();

// ── GET /search ───────────────────────────────────────────────
// Full-text search across entityRecords using PostgreSQL FTS.
// Query params:
//   q      - search query string
//   types  - comma-separated entity types to filter (optional)
//   limit  - max results, capped at 50 (default 20)

searchRouter.get('/', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const q = (c.req.query('q') ?? '').trim();
  const typesParam = c.req.query('types') ?? '';
  const limitParam = parseInt(c.req.query('limit') ?? '20', 10);
  const limit = Math.min(isNaN(limitParam) ? 20 : limitParam, 50);

  if (!q) {
    return c.json({ query: q, total: 0, results: [], grouped: {} });
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

    const results = rows.map((row) => ({
      id: row['id'],
      entityType: row['entityType'],
      data: row['data'],
      rank: parseFloat(String(row['rank'] ?? 0)),
      createdAt: row['createdAt'],
    }));

    // Group by entityType
    const grouped: Record<string, typeof results> = {};
    for (const item of results) {
      const et = String(item.entityType ?? 'unknown');
      if (!grouped[et]) grouped[et] = [];
      grouped[et]!.push(item);
    }

    return c.json({
      query: q,
      total: results.length,
      results,
      grouped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
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
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});
