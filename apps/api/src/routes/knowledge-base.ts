import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const knowledgeBaseRouter = new Hono<{ Variables: TenantContext }>();

// ── Slug helpers ──────────────────────────────────────────────

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uniqueSlug(
  base: string,
  tenantId: string,
  table: 'kbCategories' | 'kbArticles',
  excludeId?: string,
): Promise<string> {
  let slug = base;
  let counter = 1;

  while (true) {
    const rows = await sharedDb.execute(sql`
      SELECT id FROM ${sql.raw(`"${table}"`)}
      WHERE "tenantId" = ${tenantId}
        AND slug = ${slug}
        ${excludeId ? sql`AND id != ${excludeId}` : sql``}
      LIMIT 1
    `);

    if ((rows as unknown as unknown[]).length === 0) return slug;
    counter++;
    slug = `${base}-${counter}`;
  }
}

// ── Categories ────────────────────────────────────────────────

const CategoryCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  icon: z.string().optional(),
});

const CategoryUpdateSchema = CategoryCreateSchema.partial();

// GET /kb/categories — hierarchical list
knowledgeBaseRouter.get('/categories', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');

    const rows = await sharedDb.execute(sql`
      SELECT * FROM "kbCategories"
      WHERE "tenantId" = ${tenantId}
      ORDER BY "sortOrder" ASC, name ASC
    `);

    // Build hierarchy
    type Cat = { id: string; parentId: string | null; children: Cat[]; [key: string]: unknown };
    const all = (rows as unknown as Cat[]).map((r) => ({ ...r, children: [] as Cat[] }));
    const byId = new Map<string, Cat>(all.map((r) => [r.id, r]));
    const roots: Cat[] = [];

    for (const cat of all) {
      const parentId = cat.parentId;
      if (parentId && byId.has(parentId)) {
        byId.get(parentId)!.children.push(cat);
      } else {
        roots.push(cat);
      }
    }

    return c.json(roots);
  } catch (err) {
    return handleRouteError(c, err, 'GET /kb/categories');
  }
});

// POST /kb/categories
knowledgeBaseRouter.post('/categories', zValidator('json', CategoryCreateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const slug = await uniqueSlug(toSlug(body.name), tenantId, 'kbCategories');

    const rows = await sharedDb.execute(sql`
      INSERT INTO "kbCategories" ("tenantId", name, slug, description, "parentId", "sortOrder", icon)
      VALUES (
        ${tenantId},
        ${body.name},
        ${slug},
        ${body.description ?? null},
        ${body.parentId ?? null},
        ${body.sortOrder ?? 0},
        ${body.icon ?? 'BookOpen'}
      )
      RETURNING *
    `);

    return c.json((rows as unknown as unknown[])[0], 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /kb/categories');
  }
});

// PUT /kb/categories/:id
knowledgeBaseRouter.put('/categories/:id', zValidator('json', CategoryUpdateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();
    const body = c.req.valid('json');

    // Check exists
    const existing = await sharedDb.execute(sql`
      SELECT id FROM "kbCategories" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if ((existing as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    const parts: ReturnType<typeof sql>[] = [];

    if (body.name !== undefined) {
      const slug = await uniqueSlug(toSlug(body.name), tenantId, 'kbCategories', id);
      parts.push(sql`name = ${body.name}`, sql`slug = ${slug}`);
    }
    if (body.description !== undefined) parts.push(sql`description = ${body.description}`);
    if (body.parentId !== undefined) parts.push(sql`"parentId" = ${body.parentId}`);
    if (body.sortOrder !== undefined) parts.push(sql`"sortOrder" = ${body.sortOrder}`);
    if (body.icon !== undefined) parts.push(sql`icon = ${body.icon}`);

    if (parts.length === 0) {
      const rows = await sharedDb.execute(sql`SELECT * FROM "kbCategories" WHERE id = ${id}`);
      return c.json((rows as unknown as unknown[])[0]);
    }

    const setClauses = parts.map((p) => p).reduce((acc, p) => sql`${acc}, ${p}`);
    const rows = await sharedDb.execute(sql`
      UPDATE "kbCategories"
      SET ${setClauses}
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    return c.json((rows as unknown as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /kb/categories/:id');
  }
});

// DELETE /kb/categories/:id
knowledgeBaseRouter.delete('/categories/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const articles = await sharedDb.execute(sql`
      SELECT id FROM "kbArticles" WHERE "categoryId" = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if ((articles as unknown as unknown[]).length > 0) {
      return c.json({ error: 'Category has articles — reassign or delete them first' }, 409);
    }

    await sharedDb.execute(sql`
      DELETE FROM "kbCategories" WHERE id = ${id} AND "tenantId" = ${tenantId}
    `);

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /kb/categories/:id');
  }
});

// ── Articles ──────────────────────────────────────────────────

const ArticleCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  excerpt: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tags: z.array(z.string()).optional(),
  authorId: z.string().optional().nullable(),
});

const ArticleUpdateSchema = ArticleCreateSchema.partial();

// GET /kb/summary — before /:id to avoid param collision
knowledgeBaseRouter.get('/summary', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');

    const [statusRows, topViewedRows, recentRows] = await Promise.all([
      sharedDb.execute(sql`
        SELECT status, COUNT(*) AS count
        FROM "kbArticles"
        WHERE "tenantId" = ${tenantId}
        GROUP BY status
      `),
      sharedDb.execute(sql`
        SELECT id, title, slug, "viewCount", status
        FROM "kbArticles"
        WHERE "tenantId" = ${tenantId}
        ORDER BY "viewCount" DESC
        LIMIT 5
      `),
      sharedDb.execute(sql`
        SELECT id, title, slug, status, "updatedAt"
        FROM "kbArticles"
        WHERE "tenantId" = ${tenantId}
        ORDER BY "updatedAt" DESC
        LIMIT 5
      `),
    ]);

    return c.json({
      byStatus: statusRows,
      topViewed: topViewedRows,
      recentActivity: recentRows,
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /kb/summary');
  }
});

// GET /kb/articles/by-slug/:slug — before /:id
knowledgeBaseRouter.get('/articles/by-slug/:slug', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { slug } = c.req.param();

    const rows = await sharedDb.execute(sql`
      SELECT a.*, c.name AS "categoryName"
      FROM "kbArticles" a
      LEFT JOIN "kbCategories" c ON c.id = a."categoryId"
      WHERE a."tenantId" = ${tenantId} AND a.slug = ${slug}
      LIMIT 1
    `);

    if ((rows as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    const firstRow = (rows as unknown as Record<string, unknown>[])[0];
    if (!firstRow) return c.json({ error: 'Not found' }, 404);

    // Fire-and-forget view count increment
    void sharedDb.execute(sql`
      UPDATE "kbArticles" SET "viewCount" = "viewCount" + 1
      WHERE id = ${firstRow['id']}
    `);

    return c.json(firstRow);
  } catch (err) {
    return handleRouteError(c, err, 'GET /kb/articles/by-slug/:slug');
  }
});

const articlesQuerySchema = z.object({
  status: z.string().optional(),
  categoryId: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// GET /kb/articles
knowledgeBaseRouter.get('/articles', zValidator('query', articlesQuerySchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { status, categoryId, search } = c.req.valid('query');

    const effectiveStatus = status ?? 'published';

    let rows: unknown[];

    if (search) {
      rows = await sharedDb.execute(sql`
        SELECT a.*, c.name AS "categoryName"
        FROM "kbArticles" a
        LEFT JOIN "kbCategories" c ON c.id = a."categoryId"
        WHERE a."tenantId" = ${tenantId}
          AND (${effectiveStatus !== 'all' ? sql`a.status = ${effectiveStatus}` : sql`TRUE`})
          AND (${categoryId ? sql`a."categoryId" = ${categoryId}` : sql`TRUE`})
          AND to_tsvector('english', a.title || ' ' || a.content) @@ plainto_tsquery('english', ${search})
        ORDER BY a."updatedAt" DESC
      `) as unknown as unknown[];
    } else {
      rows = await sharedDb.execute(sql`
        SELECT a.*, c.name AS "categoryName"
        FROM "kbArticles" a
        LEFT JOIN "kbCategories" c ON c.id = a."categoryId"
        WHERE a."tenantId" = ${tenantId}
          AND (${effectiveStatus !== 'all' ? sql`a.status = ${effectiveStatus}` : sql`TRUE`})
          AND (${categoryId ? sql`a."categoryId" = ${categoryId}` : sql`TRUE`})
        ORDER BY a."updatedAt" DESC
      `) as unknown as unknown[];
    }

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /kb/articles');
  }
});

// POST /kb/articles
knowledgeBaseRouter.post('/articles', zValidator('json', ArticleCreateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const slug = await uniqueSlug(toSlug(body.title), tenantId, 'kbArticles');
    const tags = JSON.stringify(body.tags ?? []);
    const status = body.status ?? 'draft';
    const publishedAt = status === 'published' ? new Date().toISOString() : null;

    const rows = await sharedDb.execute(sql`
      INSERT INTO "kbArticles" (
        "tenantId", "categoryId", title, slug, content, excerpt,
        status, tags, "authorId", "publishedAt"
      )
      VALUES (
        ${tenantId},
        ${body.categoryId ?? null},
        ${body.title},
        ${slug},
        ${body.content ?? ''},
        ${body.excerpt ?? null},
        ${status},
        ${tags}::jsonb,
        ${body.authorId ?? null},
        ${publishedAt}
      )
      RETURNING *
    `);

    return c.json((rows as unknown as unknown[])[0], 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /kb/articles');
  }
});

// GET /kb/articles/:id
knowledgeBaseRouter.get('/articles/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const rows = await sharedDb.execute(sql`
      SELECT a.*, c.name AS "categoryName"
      FROM "kbArticles" a
      LEFT JOIN "kbCategories" c ON c.id = a."categoryId"
      WHERE a.id = ${id} AND a."tenantId" = ${tenantId}
      LIMIT 1
    `);

    if ((rows as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    // Fire-and-forget view count increment
    void sharedDb.execute(sql`
      UPDATE "kbArticles" SET "viewCount" = "viewCount" + 1
      WHERE id = ${id}
    `);

    return c.json((rows as unknown as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'GET /kb/articles/:id');
  }
});

// PUT /kb/articles/:id
knowledgeBaseRouter.put('/articles/:id', zValidator('json', ArticleUpdateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const existing = await sharedDb.execute(sql`
      SELECT * FROM "kbArticles" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if ((existing as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    const current = (existing as unknown as Record<string, unknown>[])[0];
    if (!current) return c.json({ error: 'Not found' }, 404);
    const contentChanged = body.content !== undefined && body.content !== current['content'];
    const newVersion = contentChanged ? (Number(current['version']) + 1) : Number(current['version']);

    const parts: ReturnType<typeof sql>[] = [sql`"updatedAt" = now()`, sql`version = ${newVersion}`];

    if (body.title !== undefined) {
      const slug = await uniqueSlug(toSlug(body.title), tenantId, 'kbArticles', id);
      parts.push(sql`title = ${body.title}`, sql`slug = ${slug}`);
    }
    if (body.content !== undefined) parts.push(sql`content = ${body.content}`);
    if (body.excerpt !== undefined) parts.push(sql`excerpt = ${body.excerpt}`);
    if (body.categoryId !== undefined) parts.push(sql`"categoryId" = ${body.categoryId}`);
    if (body.status !== undefined) parts.push(sql`status = ${body.status}`);
    if (body.tags !== undefined) parts.push(sql`tags = ${JSON.stringify(body.tags)}::jsonb`);
    if (body.authorId !== undefined) parts.push(sql`"authorId" = ${body.authorId}`);

    const setClauses = parts.reduce((acc, p) => sql`${acc}, ${p}`);

    const rows = await sharedDb.execute(sql`
      UPDATE "kbArticles"
      SET ${setClauses}
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    return c.json((rows as unknown as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /kb/articles/:id');
  }
});

// DELETE /kb/articles/:id
knowledgeBaseRouter.delete('/articles/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const existing = await sharedDb.execute(sql`
      SELECT status FROM "kbArticles" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if ((existing as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    const existingRow = (existing as unknown as Record<string, unknown>[])[0];
    if (!existingRow) return c.json({ error: 'Not found' }, 404);
    const status = existingRow['status'] as string;
    if (status === 'published') {
      return c.json({ error: 'Cannot delete a published article — archive it first' }, 409);
    }

    await sharedDb.execute(sql`
      DELETE FROM "kbArticles" WHERE id = ${id} AND "tenantId" = ${tenantId}
    `);

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /kb/articles/:id');
  }
});

// PUT /kb/articles/:id/publish
knowledgeBaseRouter.put('/articles/:id/publish', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const rows = await sharedDb.execute(sql`
      UPDATE "kbArticles"
      SET status = 'published', "publishedAt" = now(), "updatedAt" = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    if ((rows as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);
    return c.json((rows as unknown as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /kb/articles/:id/publish');
  }
});

// PUT /kb/articles/:id/archive
knowledgeBaseRouter.put('/articles/:id/archive', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const rows = await sharedDb.execute(sql`
      UPDATE "kbArticles"
      SET status = 'archived', "updatedAt" = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    if ((rows as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);
    return c.json((rows as unknown as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /kb/articles/:id/archive');
  }
});

// POST /kb/articles/:id/feedback
knowledgeBaseRouter.post(
  '/articles/:id/feedback',
  zValidator('json', z.object({ helpful: z.boolean() })),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const { id } = c.req.param();
      const { helpful } = c.req.valid('json');

      const rows = await sharedDb.execute(
        helpful
          ? sql`
            UPDATE "kbArticles"
            SET "helpfulCount" = "helpfulCount" + 1
            WHERE id = ${id} AND "tenantId" = ${tenantId}
            RETURNING id, "helpfulCount", "notHelpfulCount"
          `
          : sql`
            UPDATE "kbArticles"
            SET "notHelpfulCount" = "notHelpfulCount" + 1
            WHERE id = ${id} AND "tenantId" = ${tenantId}
            RETURNING id, "helpfulCount", "notHelpfulCount"
          `,
      );

      if ((rows as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);
      return c.json((rows as unknown as unknown[])[0]);
    } catch (err) {
      return handleRouteError(c, err, 'POST /kb/articles/:id/feedback');
    }
  },
);
