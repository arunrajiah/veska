import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import type { TenantContext } from '../middleware/tenant-context.js';

export const customFieldsRouter = new Hono<{ Variables: TenantContext }>();

// ── Helper ────────────────────────────────────────────────────

export async function getCustomFieldDefs(db: any, tenantId: string, entityType: string) {
  const result = await db.execute(sql`
    SELECT * FROM "customFieldDefs"
    WHERE "tenantId" = ${tenantId}
      AND "entityType" = ${entityType}
      AND "enabled" = true
    ORDER BY "sortOrder" ASC
  `);
  return result.rows ?? [];
}

// ── Validators ────────────────────────────────────────────────

const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;

const createDefSchema = z.object({
  tenantId: z.string().min(1),
  entityType: z.string().min(1),
  name: z.string().regex(SNAKE_CASE, 'name must be snake_case (lowercase letters, digits, underscores)'),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'date', 'boolean', 'select', 'textarea']),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
});

const patchDefSchema = z.object({
  label: z.string().min(1).optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

// ── GET /defs ─────────────────────────────────────────────────

customFieldsRouter.get('/defs', async (c) => {
  const { db } = c.get('tenantCtx');
  const tenantId = c.req.query('tenantId');
  const entityType = c.req.query('entityType');

  if (!tenantId) {
    return c.json({ error: 'tenantId is required' }, 400);
  }

  const result = await db.execute(sql`
    SELECT * FROM "customFieldDefs"
    WHERE "tenantId" = ${tenantId}
      ${entityType ? sql`AND "entityType" = ${entityType}` : sql``}
      AND "enabled" = true
    ORDER BY "entityType" ASC, "sortOrder" ASC
  `);

  return c.json(result.rows ?? []);
});

// ── POST /defs ────────────────────────────────────────────────

customFieldsRouter.post('/defs', zValidator('json', createDefSchema), async (c) => {
  const { db } = c.get('tenantCtx');
  const body = c.req.valid('json');

  const result = await db.execute(sql`
    INSERT INTO "customFieldDefs"
      ("tenantId", "entityType", "name", "label", "type", "options", "required", "sortOrder")
    VALUES
      (${body.tenantId}, ${body.entityType}, ${body.name}, ${body.label}, ${body.type},
       ${body.options ?? null}, ${body.required}, ${body.sortOrder})
    RETURNING *
  `);

  const row = result.rows?.[0];
  if (!row) return c.json({ error: 'Insert failed' }, 500);
  return c.json(row, 201);
});

// ── GET /defs/:id ─────────────────────────────────────────────

customFieldsRouter.get('/defs/:id', async (c) => {
  const { db } = c.get('tenantCtx');
  const id = c.req.param('id');

  const result = await db.execute(sql`
    SELECT * FROM "customFieldDefs" WHERE "id" = ${id}
  `);

  const row = result.rows?.[0];
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

// ── PATCH /defs/:id ───────────────────────────────────────────

customFieldsRouter.patch('/defs/:id', zValidator('json', patchDefSchema), async (c) => {
  const { db } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  // Build dynamic SET clause only for provided fields
  const setClauses: any[] = [];
  if (body.label !== undefined) setClauses.push(sql`"label" = ${body.label}`);
  if (body.options !== undefined) setClauses.push(sql`"options" = ${body.options}`);
  if (body.required !== undefined) setClauses.push(sql`"required" = ${body.required}`);
  if (body.sortOrder !== undefined) setClauses.push(sql`"sortOrder" = ${body.sortOrder}`);
  if (body.enabled !== undefined) setClauses.push(sql`"enabled" = ${body.enabled}`);

  if (setClauses.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  setClauses.push(sql`"updatedAt" = now()`);

  const setFragment = setClauses.reduce((acc, clause, i) =>
    i === 0 ? clause : sql`${acc}, ${clause}`
  );

  const result = await db.execute(sql`
    UPDATE "customFieldDefs"
    SET ${setFragment}
    WHERE "id" = ${id}
    RETURNING *
  `);

  const row = result.rows?.[0];
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

// ── DELETE /defs/:id ──────────────────────────────────────────

customFieldsRouter.delete('/defs/:id', async (c) => {
  const { db } = c.get('tenantCtx');
  const id = c.req.param('id');

  const result = await db.execute(sql`
    DELETE FROM "customFieldDefs" WHERE "id" = ${id} RETURNING "id"
  `);

  if (!result.rows?.[0]) return c.json({ error: 'Not found' }, 404);
  return c.json({ deleted: true });
});
