import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const vendorsRouter = new Hono<{ Variables: TenantContext }>();

// ── Summary (before /:id) ──────────────────────────────────────

vendorsRouter.get('/summary', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const [totalsResult, outstandingResult] = await Promise.all([
    sharedDb.execute(sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'active') AS active,
        ROUND(AVG(rating)::numeric, 2) AS "avgRating"
      FROM "vendors"
      WHERE "tenantId" = ${tenantId}
    `),
    sharedDb.execute(sql`
      SELECT COALESCE(SUM((data->>'amount')::numeric), 0) AS "outstandingAmount"
      FROM "entityRecords"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" = 'invoice'
        AND (data->>'status' IS NULL OR data->>'status' NOT IN ('paid', 'cancelled'))
        AND (data->>'vendorId' IS NOT NULL OR data->>'supplierId' IS NOT NULL)
    `),
  ]);

  type TotalsRow = { total: string; active: string; avgRating: string | null };
  type OutstandingRow = { outstandingAmount: string };

  const t = totalsResult.rows[0] as TotalsRow | undefined;
  const o = outstandingResult.rows[0] as OutstandingRow | undefined;

  return c.json({
    total: Number(t?.total ?? 0),
    active: Number(t?.active ?? 0),
    avgRating: t?.avgRating != null ? Number(t.avgRating) : null,
    totalOutstandingInvoices: Number(o?.outstandingAmount ?? 0),
  });
});

// ── List vendors ───────────────────────────────────────────────

vendorsRouter.get('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const status = c.req.query('status') ?? null;
  const category = c.req.query('category') ?? null;
  const search = c.req.query('search') ?? null;
  const searchPattern = search ? `%${search}%` : null;

  const result = await sharedDb.execute(sql`
    SELECT *
    FROM "vendors"
    WHERE "tenantId" = ${tenantId}
      AND (${status} IS NULL OR status = ${status})
      AND (${category} IS NULL OR category = ${category})
      AND (${searchPattern} IS NULL OR (
        name ILIKE ${searchPattern}
        OR code ILIKE ${searchPattern}
        OR email ILIKE ${searchPattern}
      ))
    ORDER BY name ASC
  `);

  return c.json(result.rows);
});

// ── Create vendor ──────────────────────────────────────────────

const createVendorSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['supplier', 'contractor', 'service-provider', 'utility', 'general']).default('general'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().default('USD'),
  paymentTerms: z.number().int().nonnegative().default(30),
  taxId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'blacklisted']).default('active'),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

vendorsRouter.post('/', zValidator('json', createVendorSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = c.req.valid('json');

  // Auto-generate code: VEN-<padded sequence>
  const countResult = await sharedDb.execute(sql`
    SELECT COUNT(*) AS cnt FROM "vendors" WHERE "tenantId" = ${tenantId}
  `);
  const cnt = Number((countResult.rows[0] as { cnt: string } | undefined)?.cnt ?? 0);
  const code = `VEN-${String(cnt + 1).padStart(4, '0')}`;

  const result = await sharedDb.execute(sql`
    INSERT INTO "vendors" (
      "tenantId", name, code, category, email, phone, website, address,
      currency, "paymentTerms", "taxId", status, notes, tags
    ) VALUES (
      ${tenantId},
      ${body.name},
      ${code},
      ${body.category},
      ${body.email ?? null},
      ${body.phone ?? null},
      ${body.website ?? null},
      ${body.address ?? null},
      ${body.currency},
      ${body.paymentTerms},
      ${body.taxId ?? null},
      ${body.status},
      ${body.notes ?? null},
      ${JSON.stringify(body.tags)}::jsonb
    )
    RETURNING *
  `);

  const vendor = result.rows[0];
  if (!vendor) return c.json({ error: 'Failed to create vendor' }, 500);

  return c.json(vendor, 201);
});

// ── Get vendor with contacts + avg ratings ─────────────────────

vendorsRouter.get('/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const [vendorResult, contactsResult, ratingsResult] = await Promise.all([
    sharedDb.execute(sql`
      SELECT * FROM "vendors" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `),
    sharedDb.execute(sql`
      SELECT * FROM "vendorContacts"
      WHERE "vendorId" = ${id} AND "tenantId" = ${tenantId}
      ORDER BY "isPrimary" DESC, "createdAt" ASC
    `),
    sharedDb.execute(sql`
      SELECT category, ROUND(AVG(score)::numeric, 2) AS "avgScore", COUNT(*) AS count
      FROM "vendorRatings"
      WHERE "vendorId" = ${id} AND "tenantId" = ${tenantId}
      GROUP BY category
    `),
  ]);

  if (!vendorResult.rows[0]) return c.json({ error: 'Vendor not found' }, 404);

  return c.json({
    ...vendorResult.rows[0],
    contacts: contactsResult.rows,
    ratingsByCategory: ratingsResult.rows,
  });
});

// ── Update vendor ──────────────────────────────────────────────

const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(['supplier', 'contractor', 'service-provider', 'utility', 'general']).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().optional(),
  paymentTerms: z.number().int().nonnegative().optional(),
  taxId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'blacklisted']).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

vendorsRouter.put('/:id', zValidator('json', updateVendorSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "vendors" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
  `);
  if (!check.rows[0]) return c.json({ error: 'Vendor not found' }, 404);

  const result = await sharedDb.execute(sql`
    UPDATE "vendors"
    SET
      name           = COALESCE(${body.name ?? null}, name),
      category       = COALESCE(${body.category ?? null}, category),
      email          = COALESCE(${body.email ?? null}, email),
      phone          = COALESCE(${body.phone ?? null}, phone),
      website        = COALESCE(${body.website ?? null}, website),
      address        = COALESCE(${body.address ?? null}, address),
      currency       = COALESCE(${body.currency ?? null}, currency),
      "paymentTerms" = COALESCE(${body.paymentTerms ?? null}::integer, "paymentTerms"),
      "taxId"        = COALESCE(${body.taxId ?? null}, "taxId"),
      status         = COALESCE(${body.status ?? null}, status),
      notes          = COALESCE(${body.notes ?? null}, notes),
      tags           = COALESCE(${body.tags != null ? JSON.stringify(body.tags) : null}::jsonb, tags),
      "updatedAt"    = now()
    WHERE id = ${id} AND "tenantId" = ${tenantId}
    RETURNING *
  `);

  return c.json(result.rows[0]);
});

// ── Soft-delete vendor ─────────────────────────────────────────

vendorsRouter.delete('/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "vendors" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
  `);
  if (!check.rows[0]) return c.json({ error: 'Vendor not found' }, 404);

  await sharedDb.execute(sql`
    UPDATE "vendors"
    SET status = 'inactive', "updatedAt" = now()
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);

  return c.json({ success: true });
});

// ── Vendor contacts ────────────────────────────────────────────

vendorsRouter.get('/:id/contacts', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "vendors" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
  `);
  if (!check.rows[0]) return c.json({ error: 'Vendor not found' }, 404);

  const result = await sharedDb.execute(sql`
    SELECT * FROM "vendorContacts"
    WHERE "vendorId" = ${id} AND "tenantId" = ${tenantId}
    ORDER BY "isPrimary" DESC, "createdAt" ASC
  `);

  return c.json(result.rows);
});

const createContactSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

vendorsRouter.post('/:id/contacts', zValidator('json', createContactSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const vendorId = c.req.param('id');
  const body = c.req.valid('json');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "vendors" WHERE id = ${vendorId} AND "tenantId" = ${tenantId} LIMIT 1
  `);
  if (!check.rows[0]) return c.json({ error: 'Vendor not found' }, 404);

  // If marking as primary, unset other primary contacts first
  if (body.isPrimary) {
    await sharedDb.execute(sql`
      UPDATE "vendorContacts"
      SET "isPrimary" = false
      WHERE "vendorId" = ${vendorId} AND "tenantId" = ${tenantId}
    `);
  }

  const result = await sharedDb.execute(sql`
    INSERT INTO "vendorContacts" ("tenantId", "vendorId", name, title, email, phone, "isPrimary")
    VALUES (${tenantId}, ${vendorId}, ${body.name}, ${body.title ?? null}, ${body.email ?? null}, ${body.phone ?? null}, ${body.isPrimary})
    RETURNING *
  `);

  return c.json(result.rows[0], 201);
});

const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

vendorsRouter.put('/:id/contacts/:contactId', zValidator('json', updateContactSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const vendorId = c.req.param('id');
  const contactId = c.req.param('contactId');
  const body = c.req.valid('json');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "vendorContacts"
    WHERE id = ${contactId} AND "vendorId" = ${vendorId} AND "tenantId" = ${tenantId}
    LIMIT 1
  `);
  if (!check.rows[0]) return c.json({ error: 'Contact not found' }, 404);

  // If marking as primary, unset other primary contacts first
  if (body.isPrimary) {
    await sharedDb.execute(sql`
      UPDATE "vendorContacts"
      SET "isPrimary" = false
      WHERE "vendorId" = ${vendorId} AND "tenantId" = ${tenantId} AND id != ${contactId}
    `);
  }

  const result = await sharedDb.execute(sql`
    UPDATE "vendorContacts"
    SET
      name       = COALESCE(${body.name ?? null}, name),
      title      = COALESCE(${body.title ?? null}, title),
      email      = COALESCE(${body.email ?? null}, email),
      phone      = COALESCE(${body.phone ?? null}, phone),
      "isPrimary" = COALESCE(${body.isPrimary ?? null}, "isPrimary")
    WHERE id = ${contactId} AND "vendorId" = ${vendorId} AND "tenantId" = ${tenantId}
    RETURNING *
  `);

  return c.json(result.rows[0]);
});

vendorsRouter.delete('/:id/contacts/:contactId', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const vendorId = c.req.param('id');
  const contactId = c.req.param('contactId');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "vendorContacts"
    WHERE id = ${contactId} AND "vendorId" = ${vendorId} AND "tenantId" = ${tenantId}
    LIMIT 1
  `);
  if (!check.rows[0]) return c.json({ error: 'Contact not found' }, 404);

  await sharedDb.execute(sql`
    DELETE FROM "vendorContacts"
    WHERE id = ${contactId} AND "vendorId" = ${vendorId} AND "tenantId" = ${tenantId}
  `);

  return c.json({ success: true });
});

// ── Vendor ratings ─────────────────────────────────────────────

const addRatingSchema = z.object({
  category: z.enum(['quality', 'delivery', 'pricing', 'support', 'overall']),
  score: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  ratedBy: z.string().optional(),
});

vendorsRouter.post('/:id/ratings', zValidator('json', addRatingSchema), async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const vendorId = c.req.param('id');
  const body = c.req.valid('json');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "vendors" WHERE id = ${vendorId} AND "tenantId" = ${tenantId} LIMIT 1
  `);
  if (!check.rows[0]) return c.json({ error: 'Vendor not found' }, 404);

  const result = await sharedDb.execute(sql`
    INSERT INTO "vendorRatings" ("tenantId", "vendorId", category, score, comment, "ratedBy")
    VALUES (${tenantId}, ${vendorId}, ${body.category}, ${body.score}, ${body.comment ?? null}, ${body.ratedBy ?? null})
    RETURNING *
  `);

  // Recalculate average rating on vendor: use 'overall' category if present, otherwise all scores
  await sharedDb.execute(sql`
    UPDATE "vendors"
    SET
      rating = (
        SELECT ROUND(AVG(score)::numeric, 2)
        FROM "vendorRatings"
        WHERE "vendorId" = ${vendorId}
          AND "tenantId" = ${tenantId}
          AND CASE
            WHEN EXISTS (
              SELECT 1 FROM "vendorRatings"
              WHERE "vendorId" = ${vendorId} AND "tenantId" = ${tenantId} AND category = 'overall'
            ) THEN category = 'overall'
            ELSE true
          END
      ),
      "updatedAt" = now()
    WHERE id = ${vendorId} AND "tenantId" = ${tenantId}
  `);

  return c.json(result.rows[0], 201);
});

vendorsRouter.get('/:id/ratings', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const vendorId = c.req.param('id');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "vendors" WHERE id = ${vendorId} AND "tenantId" = ${tenantId} LIMIT 1
  `);
  if (!check.rows[0]) return c.json({ error: 'Vendor not found' }, 404);

  const [ratingsResult, avgResult] = await Promise.all([
    sharedDb.execute(sql`
      SELECT * FROM "vendorRatings"
      WHERE "vendorId" = ${vendorId} AND "tenantId" = ${tenantId}
      ORDER BY "createdAt" DESC
    `),
    sharedDb.execute(sql`
      SELECT category, ROUND(AVG(score)::numeric, 2) AS "avgScore", COUNT(*) AS count
      FROM "vendorRatings"
      WHERE "vendorId" = ${vendorId} AND "tenantId" = ${tenantId}
      GROUP BY category
    `),
  ]);

  return c.json({
    ratings: ratingsResult.rows,
    averagesByCategory: avgResult.rows,
  });
});

// ── Vendor invoices ────────────────────────────────────────────

vendorsRouter.get('/:id/invoices', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const vendorId = c.req.param('id');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "vendors" WHERE id = ${vendorId} AND "tenantId" = ${tenantId} LIMIT 1
  `);
  if (!check.rows[0]) return c.json({ error: 'Vendor not found' }, 404);

  const result = await sharedDb.execute(sql`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM((data->>'amount')::numeric), 0) AS "totalAmount",
      COUNT(*) FILTER (WHERE data->>'status' = 'paid') AS "paidCount",
      COALESCE(
        SUM((data->>'amount')::numeric) FILTER (
          WHERE data->>'status' NOT IN ('paid', 'cancelled')
        ),
        0
      ) AS "outstandingAmount"
    FROM "entityRecords"
    WHERE "tenantId" = ${tenantId}
      AND "entityType" = 'invoice'
      AND (data->>'vendorId' = ${vendorId} OR data->>'supplierId' = ${vendorId})
  `);

  type InvoiceSummary = {
    total: string;
    totalAmount: string;
    paidCount: string;
    outstandingAmount: string;
  };
  const row = result.rows[0] as InvoiceSummary | undefined;

  return c.json({
    total: Number(row?.total ?? 0),
    totalAmount: Number(row?.totalAmount ?? 0),
    paidCount: Number(row?.paidCount ?? 0),
    outstandingAmount: Number(row?.outstandingAmount ?? 0),
  });
});
