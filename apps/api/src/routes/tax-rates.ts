import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const taxRatesRouter = new Hono<{ Variables: TenantContext }>();

// ── Schemas ───────────────────────────────────────────────────

const CreateTaxRateSchema = z.object({
  name: z.string().min(1),
  rate: z.number().min(0).max(1),
  type: z.enum(['percentage']).default('percentage'),
  jurisdiction: z.string().optional().nullable(),
  appliesTo: z.enum(['all', 'products', 'services']).default('all'),
  isDefault: z.boolean().default(false),
});

const UpdateTaxRateSchema = CreateTaxRateSchema.partial();

const CalculateSchema = z.object({
  amount: z.number().min(0),
  taxRateId: z.string().optional(),
});

// ── Routes ────────────────────────────────────────────────────

// GET /tax-rates — list all active tax rates for tenant
taxRatesRouter.get('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  try {
    const rows = await sharedDb.execute(sql`
      SELECT * FROM "taxRates"
      WHERE "tenantId" = ${tenantId}
      ORDER BY "isDefault" DESC, name ASC
    `);
    return c.json(rows);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// GET /tax-rates/default — static route before /:id
taxRatesRouter.get('/default', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  try {
    const rows = await sharedDb.execute(sql`
      SELECT * FROM "taxRates"
      WHERE "tenantId" = ${tenantId}
        AND "isDefault" = true
        AND status = 'active'
      LIMIT 1
    `);
    const row = (rows as unknown[])[0];
    if (!row) {
      return c.json({ error: 'No default tax rate configured' }, 404);
    }
    return c.json(row);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// POST /tax-rates/calculate — static route before /:id
taxRatesRouter.post('/calculate', zValidator('json', CalculateSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const { amount, taxRateId } = c.req.valid('json');
  try {
    let rateRow: Record<string, unknown> | undefined;

    if (taxRateId) {
      const rows = await sharedDb.execute(sql`
        SELECT * FROM "taxRates"
        WHERE id = ${taxRateId} AND "tenantId" = ${tenantId} AND status = 'active'
        LIMIT 1
      `);
      rateRow = (rows as unknown[])[0] as Record<string, unknown> | undefined;
      if (!rateRow) {
        return c.json({ error: 'Tax rate not found' }, 404);
      }
    } else {
      const rows = await sharedDb.execute(sql`
        SELECT * FROM "taxRates"
        WHERE "tenantId" = ${tenantId} AND "isDefault" = true AND status = 'active'
        LIMIT 1
      `);
      rateRow = (rows as unknown[])[0] as Record<string, unknown> | undefined;
    }

    // Get currency from tenant settings
    const settingsRows = await sharedDb.execute(sql`
      SELECT currency FROM "tenantSettings" WHERE "tenantId" = ${tenantId}
    `);
    const currency =
      ((settingsRows as unknown[])[0] as Record<string, unknown> | undefined)?.['currency'] ??
      'USD';

    if (!rateRow) {
      // No tax rate — return zero tax
      return c.json({
        subtotal: amount,
        taxAmount: 0,
        taxRate: 0,
        total: amount,
        currency,
      });
    }

    const rate = Number(rateRow['rate'] ?? 0);
    const taxAmount = Math.round(amount * rate * 100) / 100;
    const total = Math.round((amount + taxAmount) * 100) / 100;

    return c.json({
      subtotal: amount,
      taxAmount,
      taxRate: rate,
      total,
      currency,
      taxRateId: rateRow['id'],
      taxRateName: rateRow['name'],
    });
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// POST /tax-rates — create
taxRatesRouter.post('/', zValidator('json', CreateTaxRateSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = c.req.valid('json');
  try {
    // If setting as default, unset existing defaults first
    if (body.isDefault) {
      await sharedDb.execute(sql`
        UPDATE "taxRates" SET "isDefault" = false WHERE "tenantId" = ${tenantId}
      `);
    }

    const rows = await sharedDb.execute(sql`
      INSERT INTO "taxRates" ("tenantId", name, rate, type, jurisdiction, "appliesTo", "isDefault")
      VALUES (
        ${tenantId},
        ${body.name},
        ${body.rate},
        ${body.type},
        ${body.jurisdiction ?? null},
        ${body.appliesTo},
        ${body.isDefault}
      )
      RETURNING *
    `);
    return c.json((rows as unknown[])[0], 201);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// GET /tax-rates/:id
taxRatesRouter.get('/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  try {
    const rows = await sharedDb.execute(sql`
      SELECT * FROM "taxRates" WHERE id = ${id} AND "tenantId" = ${tenantId}
    `);
    const row = (rows as unknown[])[0];
    if (!row) return c.json({ error: 'Not found' }, 404);
    return c.json(row);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// PUT /tax-rates/:id
taxRatesRouter.put('/:id', zValidator('json', UpdateTaxRateSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = c.req.valid('json');
  try {
    // If setting as default, unset existing defaults first
    if (body.isDefault) {
      await sharedDb.execute(sql`
        UPDATE "taxRates" SET "isDefault" = false WHERE "tenantId" = ${tenantId} AND id != ${id}
      `);
    }

    const rows = await sharedDb.execute(sql`
      UPDATE "taxRates" SET
        name         = COALESCE(${body.name ?? null}, name),
        rate         = COALESCE(${body.rate ?? null}, rate),
        type         = COALESCE(${body.type ?? null}, type),
        jurisdiction = CASE WHEN ${body.jurisdiction !== undefined} THEN ${body.jurisdiction ?? null} ELSE jurisdiction END,
        "appliesTo"  = COALESCE(${body.appliesTo ?? null}, "appliesTo"),
        "isDefault"  = COALESCE(${body.isDefault ?? null}, "isDefault"),
        "updatedAt"  = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);
    const row = (rows as unknown[])[0];
    if (!row) return c.json({ error: 'Not found' }, 404);
    return c.json(row);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// DELETE /tax-rates/:id — soft delete
taxRatesRouter.delete('/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  try {
    const rows = await sharedDb.execute(sql`
      UPDATE "taxRates" SET status = 'inactive', "updatedAt" = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);
    const row = (rows as unknown[])[0];
    if (!row) return c.json({ error: 'Not found' }, 404);
    return c.json(row);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// POST /tax-rates/:id/set-default
taxRatesRouter.post('/:id/set-default', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  try {
    // Unset all existing defaults for this tenant
    await sharedDb.execute(sql`
      UPDATE "taxRates" SET "isDefault" = false, "updatedAt" = now()
      WHERE "tenantId" = ${tenantId}
    `);

    const rows = await sharedDb.execute(sql`
      UPDATE "taxRates" SET "isDefault" = true, "updatedAt" = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);
    const row = (rows as unknown[])[0];
    if (!row) return c.json({ error: 'Not found' }, 404);
    return c.json(row);
  } catch (error) {
    return c.json({ error }, 500);
  }
});
