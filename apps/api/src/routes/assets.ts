import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import type { TenantContext } from '../middleware/tenant-context.js';

export const assetsRouter = new Hono<{ Variables: TenantContext }>();

// ── Depreciation helpers ──────────────────────────────────────

interface ScheduleEntry {
  year: number;
  depreciation: number;
  bookValue: number;
  accumulatedDepreciation: number;
}

interface DepreciationResult {
  assetId: string;
  method: string;
  purchasePrice: number;
  salvageValue: number;
  usefulLifeYears: number;
  annualDepreciation: number | null;
  schedule: ScheduleEntry[];
  currentBookValue: number;
  currentYear: number;
}

function calcDepreciation(
  assetId: string,
  method: string,
  purchasePrice: number,
  salvageValue: number,
  usefulLifeYears: number,
  purchaseDate: string | null,
): DepreciationResult {
  const schedule: ScheduleEntry[] = [];
  const today = new Date();
  let currentYear = 0;

  if (purchaseDate) {
    const purchase = new Date(purchaseDate);
    const diffMs = today.getTime() - purchase.getTime();
    currentYear = Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
  }

  let annualDepreciation: number | null = null;
  let bookValue = purchasePrice;
  let accumulatedDepreciation = 0;

  if (method === 'straight-line') {
    annualDepreciation = usefulLifeYears > 0 ? (purchasePrice - salvageValue) / usefulLifeYears : 0;

    for (let year = 1; year <= usefulLifeYears; year++) {
      const dep = Math.min(annualDepreciation, bookValue - salvageValue);
      accumulatedDepreciation += dep;
      bookValue -= dep;
      schedule.push({
        year,
        depreciation: Math.round(dep * 100) / 100,
        bookValue: Math.round(bookValue * 100) / 100,
        accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
      });
    }
  } else if (method === 'declining-balance') {
    const rate = usefulLifeYears > 0 ? 2 / usefulLifeYears : 0;
    annualDepreciation = null; // variable per year

    for (let year = 1; year <= usefulLifeYears; year++) {
      // Double-declining balance: switch to straight-line when SL > DB
      const remainingYears = usefulLifeYears - year + 1;
      const slAmount = remainingYears > 0 ? (bookValue - salvageValue) / remainingYears : 0;
      const dbAmount = bookValue * rate;
      const dep = Math.min(Math.max(dbAmount, slAmount), bookValue - salvageValue);

      accumulatedDepreciation += dep;
      bookValue -= dep;
      schedule.push({
        year,
        depreciation: Math.round(dep * 100) / 100,
        bookValue: Math.round(bookValue * 100) / 100,
        accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
      });
    }
  }
  // method === 'none': empty schedule, book value stays at purchase price

  const clampedCurrentYear = Math.min(currentYear, usefulLifeYears);
  const currentBookValue =
    clampedCurrentYear > 0 && schedule[clampedCurrentYear - 1]
      ? schedule[clampedCurrentYear - 1]!.bookValue
      : purchasePrice;

  return {
    assetId,
    method,
    purchasePrice,
    salvageValue,
    usefulLifeYears,
    annualDepreciation:
      method === 'straight-line' && annualDepreciation !== null
        ? Math.round(annualDepreciation * 100) / 100
        : null,
    schedule,
    currentBookValue,
    currentYear: clampedCurrentYear,
  };
}

// ── Schemas ───────────────────────────────────────────────────

const assetCreateSchema = z.object({
  name: z.string().min(1),
  category: z
    .enum(['equipment', 'vehicle', 'property', 'software', 'furniture', 'other'])
    .default('equipment'),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(), // ISO date string
  purchasePrice: z.number().min(0).default(0),
  currency: z.string().default('USD'),
  depreciationMethod: z
    .enum(['straight-line', 'declining-balance', 'none'])
    .default('straight-line'),
  usefulLifeYears: z.number().int().min(1).default(5),
  salvageValue: z.number().min(0).default(0),
  assignedTo: z.string().optional(),
  location: z.string().optional(),
  status: z
    .enum(['active', 'disposed', 'maintenance', 'retired'])
    .default('active'),
  notes: z.string().optional(),
});

const assetUpdateSchema = assetCreateSchema.partial();

// ── GET /assets/summary — must be before /:id ─────────────────

assetsRouter.get('/summary', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const result = await db.execute(sql`
    SELECT
      COUNT(*) AS "totalAssets",
      COALESCE(SUM("purchasePrice"), 0) AS "totalPurchaseValue",
      status,
      category
    FROM "assets"
    WHERE "tenantId" = ${tenantId}
    GROUP BY status, category
  `);

  const rows = (result.rows ?? []) as Array<Record<string, unknown>>;

  let totalAssets = 0;
  let totalPurchaseValue = 0;
  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const row of rows) {
    const count = Number(row['totalAssets'] ?? 0);
    const value = Number(row['totalPurchaseValue'] ?? 0);
    const category = String(row['category'] ?? 'other');
    const status = String(row['status'] ?? 'active');

    totalAssets += count;
    totalPurchaseValue += value;
    byCategory[category] = (byCategory[category] ?? 0) + count;
    byStatus[status] = (byStatus[status] ?? 0) + count;
  }

  // Calculate current book values across all assets (simplified — uses purchase price as proxy;
  // detailed per-asset depreciation is available via /:id/depreciation)
  const allAssets = await db.execute(sql`
    SELECT id, "purchasePrice", "salvageValue", "usefulLifeYears",
           "depreciationMethod", "purchaseDate"
    FROM "assets"
    WHERE "tenantId" = ${tenantId}
      AND status != 'disposed'
  `);

  let totalCurrentBookValue = 0;
  for (const asset of (allAssets.rows ?? []) as Array<Record<string, unknown>>) {
    const dep = calcDepreciation(
      String(asset['id']),
      String(asset['depreciationMethod'] ?? 'none'),
      Number(asset['purchasePrice'] ?? 0),
      Number(asset['salvageValue'] ?? 0),
      Number(asset['usefulLifeYears'] ?? 5),
      asset['purchaseDate'] ? String(asset['purchaseDate']) : null,
    );
    totalCurrentBookValue += dep.currentBookValue;
  }

  return c.json({
    totalAssets,
    totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
    totalCurrentBookValue: Math.round(totalCurrentBookValue * 100) / 100,
    byCategory,
    byStatus,
  });
});

// ── GET /assets ───────────────────────────────────────────────

assetsRouter.get('/', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const status = c.req.query('status');
  const category = c.req.query('category');
  const assignedTo = c.req.query('assignedTo');

  let result;
  if (status && category && assignedTo) {
    result = await db.execute(sql`
      SELECT * FROM "assets"
      WHERE "tenantId" = ${tenantId}
        AND status = ${status}
        AND category = ${category}
        AND "assignedTo" = ${assignedTo}
      ORDER BY "createdAt" DESC
    `);
  } else if (status && category) {
    result = await db.execute(sql`
      SELECT * FROM "assets"
      WHERE "tenantId" = ${tenantId}
        AND status = ${status}
        AND category = ${category}
      ORDER BY "createdAt" DESC
    `);
  } else if (status && assignedTo) {
    result = await db.execute(sql`
      SELECT * FROM "assets"
      WHERE "tenantId" = ${tenantId}
        AND status = ${status}
        AND "assignedTo" = ${assignedTo}
      ORDER BY "createdAt" DESC
    `);
  } else if (category && assignedTo) {
    result = await db.execute(sql`
      SELECT * FROM "assets"
      WHERE "tenantId" = ${tenantId}
        AND category = ${category}
        AND "assignedTo" = ${assignedTo}
      ORDER BY "createdAt" DESC
    `);
  } else if (status) {
    result = await db.execute(sql`
      SELECT * FROM "assets"
      WHERE "tenantId" = ${tenantId}
        AND status = ${status}
      ORDER BY "createdAt" DESC
    `);
  } else if (category) {
    result = await db.execute(sql`
      SELECT * FROM "assets"
      WHERE "tenantId" = ${tenantId}
        AND category = ${category}
      ORDER BY "createdAt" DESC
    `);
  } else if (assignedTo) {
    result = await db.execute(sql`
      SELECT * FROM "assets"
      WHERE "tenantId" = ${tenantId}
        AND "assignedTo" = ${assignedTo}
      ORDER BY "createdAt" DESC
    `);
  } else {
    result = await db.execute(sql`
      SELECT * FROM "assets"
      WHERE "tenantId" = ${tenantId}
      ORDER BY "createdAt" DESC
    `);
  }

  return c.json({ assets: result.rows ?? [] });
});

// ── POST /assets ──────────────────────────────────────────────

assetsRouter.post('/', zValidator('json', assetCreateSchema), async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const body = c.req.valid('json');

  const result = await db.execute(sql`
    INSERT INTO "assets" (
      "tenantId", name, category, "serialNumber", "purchaseDate",
      "purchasePrice", currency, "depreciationMethod", "usefulLifeYears",
      "salvageValue", "assignedTo", location, status, notes
    ) VALUES (
      ${tenantId},
      ${body.name},
      ${body.category},
      ${body.serialNumber ?? null},
      ${body.purchaseDate ? body.purchaseDate + '::date' : null},
      ${body.purchasePrice},
      ${body.currency},
      ${body.depreciationMethod},
      ${body.usefulLifeYears},
      ${body.salvageValue},
      ${body.assignedTo ?? null},
      ${body.location ?? null},
      ${body.status},
      ${body.notes ?? null}
    )
    RETURNING *
  `);

  const row = (result.rows ?? [])[0];
  if (!row) return c.json({ error: 'Failed to create asset' }, 500);
  return c.json(row, 201);
});

// ── GET /assets/:id/depreciation — before /:id ────────────────

assetsRouter.get('/:id/depreciation', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const result = await db.execute(sql`
    SELECT * FROM "assets"
    WHERE id = ${id}
      AND "tenantId" = ${tenantId}
    LIMIT 1
  `);

  const row = (result.rows ?? [])[0] as Record<string, unknown> | undefined;
  if (!row) return c.json({ error: 'Not found' }, 404);

  const dep = calcDepreciation(
    id,
    String(row['depreciationMethod'] ?? 'none'),
    Number(row['purchasePrice'] ?? 0),
    Number(row['salvageValue'] ?? 0),
    Number(row['usefulLifeYears'] ?? 5),
    row['purchaseDate'] ? String(row['purchaseDate']) : null,
  );

  return c.json(dep);
});

// ── GET /assets/:id ───────────────────────────────────────────

assetsRouter.get('/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const result = await db.execute(sql`
    SELECT * FROM "assets"
    WHERE id = ${id}
      AND "tenantId" = ${tenantId}
    LIMIT 1
  `);

  const row = (result.rows ?? [])[0];
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

// ── PUT /assets/:id ───────────────────────────────────────────

assetsRouter.put('/:id', zValidator('json', assetUpdateSchema), async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const existing = await db.execute(sql`
    SELECT * FROM "assets"
    WHERE id = ${id}
      AND "tenantId" = ${tenantId}
    LIMIT 1
  `);

  const row = (existing.rows ?? [])[0] as Record<string, unknown> | undefined;
  if (!row) return c.json({ error: 'Not found' }, 404);

  const name = body.name ?? String(row['name'] ?? '');
  const category = body.category ?? String(row['category'] ?? 'equipment');
  const serialNumber = body.serialNumber !== undefined ? body.serialNumber : (row['serialNumber'] as string | null);
  const purchaseDate =
    body.purchaseDate !== undefined
      ? body.purchaseDate ?? null
      : (row['purchaseDate'] as string | null);
  const purchasePrice = body.purchasePrice !== undefined ? body.purchasePrice : Number(row['purchasePrice'] ?? 0);
  const currency = body.currency ?? String(row['currency'] ?? 'USD');
  const depreciationMethod = body.depreciationMethod ?? String(row['depreciationMethod'] ?? 'straight-line');
  const usefulLifeYears = body.usefulLifeYears !== undefined ? body.usefulLifeYears : Number(row['usefulLifeYears'] ?? 5);
  const salvageValue = body.salvageValue !== undefined ? body.salvageValue : Number(row['salvageValue'] ?? 0);
  const assignedTo = body.assignedTo !== undefined ? body.assignedTo : (row['assignedTo'] as string | null);
  const location = body.location !== undefined ? body.location : (row['location'] as string | null);
  const status = body.status ?? String(row['status'] ?? 'active');
  const notes = body.notes !== undefined ? body.notes : (row['notes'] as string | null);

  const result = await db.execute(sql`
    UPDATE "assets"
    SET
      name = ${name},
      category = ${category},
      "serialNumber" = ${serialNumber ?? null},
      "purchaseDate" = ${purchaseDate ?? null},
      "purchasePrice" = ${purchasePrice},
      currency = ${currency},
      "depreciationMethod" = ${depreciationMethod},
      "usefulLifeYears" = ${usefulLifeYears},
      "salvageValue" = ${salvageValue},
      "assignedTo" = ${assignedTo ?? null},
      location = ${location ?? null},
      status = ${status},
      notes = ${notes ?? null},
      "updatedAt" = now()
    WHERE id = ${id}
      AND "tenantId" = ${tenantId}
    RETURNING *
  `);

  const updated = (result.rows ?? [])[0];
  if (!updated) return c.json({ error: 'Update failed' }, 500);
  return c.json(updated);
});

// ── DELETE /assets/:id (soft-delete → status = 'disposed') ────

assetsRouter.delete('/:id', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const result = await db.execute(sql`
    UPDATE "assets"
    SET status = 'disposed', "updatedAt" = now()
    WHERE id = ${id}
      AND "tenantId" = ${tenantId}
    RETURNING id
  `);

  if ((result.rows ?? []).length === 0) return c.json({ error: 'Not found' }, 404);
  return c.json({ deleted: true, id, status: 'disposed' });
});
