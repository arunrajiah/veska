import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import type { TenantContext } from '../middleware/tenant-context.js';

export const approvalChainsRouter = new Hono<{ Variables: TenantContext }>();

// ── List ──────────────────────────────────────────────────────

approvalChainsRouter.get('/', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const result = await db.execute(sql`
    SELECT * FROM "approvalChains"
    WHERE "tenantId" = ${tenantId}
    ORDER BY "createdAt" ASC
  `);

  return c.json({ chains: result.rows ?? [] });
});

// ── Create ────────────────────────────────────────────────────

const createSchema = z.object({
  tenantId: z.string().optional(),
  name: z.string().min(1),
  entityType: z.string().min(1),
  conditionField: z.string().optional(),
  conditionOp: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'always']).optional(),
  conditionValue: z.number().optional(),
  steps: z.array(
    z.object({
      order: z.number(),
      approverRole: z.string(),
      approverUserId: z.string().optional(),
      label: z.string(),
    }),
  ).default([]),
  enabled: z.boolean().optional().default(true),
});

approvalChainsRouter.post('/', zValidator('json', createSchema), async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const body = c.req.valid('json');

  const result = await db.execute(sql`
    INSERT INTO "approvalChains" (
      "tenantId", "name", "entityType",
      "conditionField", "conditionOp", "conditionValue",
      "steps", "enabled"
    ) VALUES (
      ${tenantId},
      ${body.name},
      ${body.entityType},
      ${body.conditionField ?? null},
      ${body.conditionOp ?? null},
      ${body.conditionValue ?? null},
      ${JSON.stringify(body.steps)}::jsonb,
      ${body.enabled ?? true}
    )
    RETURNING *
  `);

  const chain = (result.rows ?? [])[0];
  if (!chain) return c.json({ error: 'Failed to create approval chain' }, 500);
  return c.json(chain, 201);
});

// ── Get single ────────────────────────────────────────────────

approvalChainsRouter.get('/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const result = await db.execute(sql`
    SELECT * FROM "approvalChains"
    WHERE "id" = ${id}::uuid
      AND "tenantId" = ${tenantId}
  `);

  const chain = (result.rows ?? [])[0];
  if (!chain) return c.json({ error: 'Not found' }, 404);
  return c.json(chain);
});

// ── Update ────────────────────────────────────────────────────

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  conditionField: z.string().optional().nullable(),
  conditionOp: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'always']).optional().nullable(),
  conditionValue: z.number().optional().nullable(),
  steps: z.array(
    z.object({
      order: z.number(),
      approverRole: z.string(),
      approverUserId: z.string().optional(),
      label: z.string(),
    }),
  ).optional(),
  enabled: z.boolean().optional(),
});

approvalChainsRouter.patch('/:id', zValidator('json', updateSchema), async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  // Build dynamic SET clauses
  const setClauses: string[] = ['"updatedAt" = now()'];
  const values: unknown[] = [];
  let idx = 1;

  if (body.name !== undefined) {
    setClauses.push(`"name" = $${idx++}`);
    values.push(body.name);
  }
  if ('conditionField' in body) {
    setClauses.push(`"conditionField" = $${idx++}`);
    values.push(body.conditionField ?? null);
  }
  if ('conditionOp' in body) {
    setClauses.push(`"conditionOp" = $${idx++}`);
    values.push(body.conditionOp ?? null);
  }
  if ('conditionValue' in body) {
    setClauses.push(`"conditionValue" = $${idx++}`);
    values.push(body.conditionValue ?? null);
  }
  if (body.steps !== undefined) {
    setClauses.push(`"steps" = $${idx++}::jsonb`);
    values.push(JSON.stringify(body.steps));
  }
  if (body.enabled !== undefined) {
    setClauses.push(`"enabled" = $${idx++}`);
    values.push(body.enabled);
  }

  values.push(id);
  values.push(tenantId);

  const query = `
    UPDATE "approvalChains"
    SET ${setClauses.join(', ')}
    WHERE "id" = $${idx++}::uuid
      AND "tenantId" = $${idx}
    RETURNING *
  `;

  const result = await db.execute(sql.raw(
    query.replace(/\$(\d+)/g, (_, n) => {
      const val = values[Number(n) - 1];
      if (val === null) return 'NULL';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      if (typeof val === 'number') return String(val);
      return `'${String(val).replace(/'/g, "''")}'`;
    }),
  ));

  const chain = (result.rows ?? [])[0];
  if (!chain) return c.json({ error: 'Not found' }, 404);
  return c.json(chain);
});

// ── Delete ────────────────────────────────────────────────────

approvalChainsRouter.delete('/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const result = await db.execute(sql`
    DELETE FROM "approvalChains"
    WHERE "id" = ${id}::uuid
      AND "tenantId" = ${tenantId}
    RETURNING "id"
  `);

  if ((result.rows ?? []).length === 0) return c.json({ error: 'Not found' }, 404);
  return c.json({ deleted: true });
});

// ── Helper: find applicable chain ────────────────────────────

export async function findApplicableChain(
  db: any,
  tenantId: string,
  entityType: string,
  entityData: Record<string, unknown>,
): Promise<{ id: string; steps: any[]; name: string } | null> {
  const result = await db.execute(sql`
    SELECT * FROM "approvalChains"
    WHERE "tenantId" = ${tenantId}
      AND "entityType" = ${entityType}
      AND "enabled" = true
    ORDER BY "createdAt" ASC
    LIMIT 10
  `);

  for (const chain of (result.rows ?? [])) {
    const op = chain.conditionOp as string;
    const field = chain.conditionField as string;
    const threshold = Number(chain.conditionValue);

    if (op === 'always') return chain as any;
    if (!field || !op) continue;

    const entityVal = Number(entityData[field]);
    if (isNaN(entityVal)) continue;

    const matches =
      op === 'gt' ? entityVal > threshold :
      op === 'gte' ? entityVal >= threshold :
      op === 'lt' ? entityVal < threshold :
      op === 'lte' ? entityVal <= threshold :
      op === 'eq' ? entityVal === threshold : false;

    if (matches) return chain as any;
  }
  return null;
}
