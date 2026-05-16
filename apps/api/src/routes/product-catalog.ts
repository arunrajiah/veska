import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const productCatalogRouter = new Hono<{ Variables: TenantContext }>();

// ── Schemas ───────────────────────────────────────────────────

const ProductCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  basePrice: z.number().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

const ProductUpdateSchema = ProductCreateSchema.partial();

const VariantCreateSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  attributes: z.record(z.string()).optional().default({}),
  price: z.number().min(0).default(0),
  compareAtPrice: z.number().optional().nullable(),
  cost: z.number().optional().nullable(),
  stockQuantity: z.number().int().default(0),
  weight: z.number().optional().nullable(),
  isDefault: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
  imageUrl: z.string().optional().nullable(),
});

const VariantUpdateSchema = VariantCreateSchema.partial();

const PriceListCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  currency: z.string().default('USD'),
  type: z.enum(['fixed', 'percentage']).default('fixed'),
  adjustment: z.number().optional().default(0),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
});

const PriceListUpdateSchema = PriceListCreateSchema.partial();

const PriceListItemCreateSchema = z.object({
  productId: z.string().optional().nullable(),
  variantId: z.string().optional().nullable(),
  fixedPrice: z.number().optional().nullable(),
  percentageAdj: z.number().optional().nullable(),
  minQuantity: z.number().int().min(1).default(1),
});

const PriceListItemUpdateSchema = PriceListItemCreateSchema.partial();

const ResolvePriceSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  priceListId: z.string().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
});

const DiscountCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional().nullable(),
  type: z.enum(['percentage', 'fixed', 'free-shipping', 'bogo']).default('percentage'),
  value: z.number().min(0).default(0),
  minOrderValue: z.number().optional().nullable(),
  maxUses: z.number().int().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  applicableTo: z.enum(['all', 'products', 'categories']).default('all'),
  productIds: z.array(z.string()).optional().default([]),
  status: z.enum(['active', 'inactive']).default('active'),
});

const DiscountUpdateSchema = DiscountCreateSchema.partial();

const ValidateDiscountSchema = z.object({
  code: z.string().min(1),
  orderValue: z.number().min(0),
  productIds: z.array(z.string()).optional().default([]),
});

// ── Products (via entityRecords) ──────────────────────────────

const productsQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// GET /catalog/products
productCatalogRouter.get('/products', zValidator('query', productsQuerySchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { search } = c.req.valid('query');

    const searchClause = search
      ? sql`AND er.data->>'name' ILIKE ${'%' + search + '%'}`
      : sql``;

    const rows = await sharedDb.execute(sql`
      SELECT
        er.*,
        COUNT(pv.id)::int AS "variantCount",
        (
          SELECT pv2.price
          FROM "productVariants" pv2
          WHERE pv2."productId" = er.id
            AND pv2."tenantId" = ${tenantId}
            AND pv2."isDefault" = true
          LIMIT 1
        ) AS "defaultVariantPrice"
      FROM "entityRecords" er
      LEFT JOIN "productVariants" pv
        ON pv."productId" = er.id AND pv."tenantId" = ${tenantId}
      WHERE er."tenantId" = ${tenantId}
        AND er."entityType" = 'product'
        AND er."deletedAt" IS NULL
        ${searchClause}
      GROUP BY er.id
      ORDER BY er."createdAt" DESC
    `);

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /catalog/products');
  }
});

// GET /catalog/products/:id
productCatalogRouter.get('/products/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const [productRows, variantRows] = await Promise.all([
      sharedDb.execute(sql`
        SELECT * FROM "entityRecords"
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'product'
          AND id = ${id}
          AND "deletedAt" IS NULL
        LIMIT 1
      `),
      sharedDb.execute(sql`
        SELECT * FROM "productVariants"
        WHERE "tenantId" = ${tenantId}
          AND "productId" = ${id}
        ORDER BY "isDefault" DESC, "createdAt" ASC
      `),
    ]);

    const product = (productRows as Record<string, unknown>[])[0];
    if (!product) return c.json({ error: 'Product not found' }, 404);

    return c.json({ ...product, variants: variantRows });
  } catch (err) {
    return handleRouteError(c, err, 'GET /catalog/products/:id');
  }
});

// POST /catalog/products
productCatalogRouter.post(
  '/products',
  zValidator('json', ProductCreateSchema),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const body = c.req.valid('json');

      const rows = await sharedDb.execute(sql`
        INSERT INTO "entityRecords" (
          "tenantId", "entityType", data, "createdAt", "updatedAt"
        )
        VALUES (
          ${tenantId},
          'product',
          ${JSON.stringify(body)}::jsonb,
          now(),
          now()
        )
        RETURNING *
      `);

      return c.json((rows as Record<string, unknown>[])[0], 201);
    } catch (err) {
      return handleRouteError(c, err, 'POST /catalog/products');
    }
  },
);

// PUT /catalog/products/:id
productCatalogRouter.put(
  '/products/:id',
  zValidator('json', ProductUpdateSchema),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const id = c.req.param('id');
      const body = c.req.valid('json');

      const rows = await sharedDb.execute(sql`
        UPDATE "entityRecords"
        SET
          data = data || ${JSON.stringify(body)}::jsonb,
          "updatedAt" = now()
        WHERE "tenantId" = ${tenantId}
          AND "entityType" = 'product'
          AND id = ${id}
          AND "deletedAt" IS NULL
        RETURNING *
      `);

      const updated = (rows as Record<string, unknown>[])[0];
      if (!updated) return c.json({ error: 'Product not found' }, 404);
      return c.json(updated);
    } catch (err) {
      return handleRouteError(c, err, 'PUT /catalog/products/:id');
    }
  },
);

// ── Variants ──────────────────────────────────────────────────

// GET /catalog/products/:productId/variants
productCatalogRouter.get('/products/:productId/variants', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const productId = c.req.param('productId');

    const rows = await sharedDb.execute(sql`
      SELECT * FROM "productVariants"
      WHERE "tenantId" = ${tenantId}
        AND "productId" = ${productId}
      ORDER BY "isDefault" DESC, "createdAt" ASC
    `);

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /catalog/products/:productId/variants');
  }
});

// POST /catalog/products/:productId/variants
productCatalogRouter.post(
  '/products/:productId/variants',
  zValidator('json', VariantCreateSchema),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const productId = c.req.param('productId');
      const body = c.req.valid('json');

      // If isDefault, unset other defaults first
      if (body.isDefault) {
        await sharedDb.execute(sql`
          UPDATE "productVariants"
          SET "isDefault" = false, "updatedAt" = now()
          WHERE "tenantId" = ${tenantId}
            AND "productId" = ${productId}
            AND "isDefault" = true
        `);
      }

      const rows = await sharedDb.execute(sql`
        INSERT INTO "productVariants" (
          "tenantId", "productId", sku, name, attributes, price,
          "compareAtPrice", cost, "stockQuantity", weight,
          "isDefault", status, "imageUrl", "createdAt", "updatedAt"
        )
        VALUES (
          ${tenantId},
          ${productId},
          ${body.sku},
          ${body.name},
          ${JSON.stringify(body.attributes ?? {})}::jsonb,
          ${body.price ?? 0},
          ${body.compareAtPrice ?? null},
          ${body.cost ?? null},
          ${body.stockQuantity ?? 0},
          ${body.weight ?? null},
          ${body.isDefault ?? false},
          ${body.status ?? 'active'},
          ${body.imageUrl ?? null},
          now(),
          now()
        )
        RETURNING *
      `);

      return c.json((rows as Record<string, unknown>[])[0], 201);
    } catch (err) {
      return handleRouteError(c, err, 'POST /catalog/products/:productId/variants');
    }
  },
);

// PUT /catalog/variants/:id
productCatalogRouter.put(
  '/variants/:id',
  zValidator('json', VariantUpdateSchema),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const id = c.req.param('id');
      const body = c.req.valid('json');

      // If setting isDefault, unset others for the same product
      if (body.isDefault) {
        const existing = await sharedDb.execute(sql`
          SELECT "productId" FROM "productVariants"
          WHERE id = ${id} AND "tenantId" = ${tenantId}
          LIMIT 1
        `);
        const variant = (existing as Record<string, unknown>[])[0];
        if (variant) {
          await sharedDb.execute(sql`
            UPDATE "productVariants"
            SET "isDefault" = false, "updatedAt" = now()
            WHERE "tenantId" = ${tenantId}
              AND "productId" = ${variant['productId'] as string}
              AND "isDefault" = true
              AND id != ${id}
          `);
        }
      }

      // Build dynamic SET from provided fields
      const setClauses: string[] = [];
      const vals: Record<string, unknown> = {};

      if (body.sku !== undefined) { setClauses.push(`sku = '${body.sku}'`); }
      if (body.name !== undefined) { setClauses.push(`name = '${body.name}'`); }
      if (body.attributes !== undefined) { vals['attributes'] = JSON.stringify(body.attributes); }
      if (body.price !== undefined) { setClauses.push(`price = ${body.price}`); }
      if (body.compareAtPrice !== undefined) { setClauses.push(`"compareAtPrice" = ${body.compareAtPrice ?? 'NULL'}`); }
      if (body.cost !== undefined) { setClauses.push(`cost = ${body.cost ?? 'NULL'}`); }
      if (body.stockQuantity !== undefined) { setClauses.push(`"stockQuantity" = ${body.stockQuantity}`); }
      if (body.weight !== undefined) { setClauses.push(`weight = ${body.weight ?? 'NULL'}`); }
      if (body.isDefault !== undefined) { setClauses.push(`"isDefault" = ${body.isDefault}`); }
      if (body.status !== undefined) { setClauses.push(`status = '${body.status}'`); }
      if (body.imageUrl !== undefined) { setClauses.push(`"imageUrl" = ${body.imageUrl ? `'${body.imageUrl}'` : 'NULL'}`); }

      const rows = await sharedDb.execute(sql`
        UPDATE "productVariants"
        SET
          sku             = COALESCE(${body.sku ?? null}, sku),
          name            = COALESCE(${body.name ?? null}, name),
          attributes      = CASE WHEN ${vals['attributes'] !== undefined} THEN ${vals['attributes'] !== undefined ? (vals['attributes'] as string) : '{}'}::jsonb ELSE attributes END,
          price           = COALESCE(${body.price ?? null}, price),
          "compareAtPrice" = CASE WHEN ${body.compareAtPrice !== undefined} THEN ${body.compareAtPrice ?? null} ELSE "compareAtPrice" END,
          cost            = CASE WHEN ${body.cost !== undefined} THEN ${body.cost ?? null} ELSE cost END,
          "stockQuantity" = COALESCE(${body.stockQuantity ?? null}, "stockQuantity"),
          weight          = CASE WHEN ${body.weight !== undefined} THEN ${body.weight ?? null} ELSE weight END,
          "isDefault"     = COALESCE(${body.isDefault ?? null}, "isDefault"),
          status          = COALESCE(${body.status ?? null}, status),
          "imageUrl"      = CASE WHEN ${body.imageUrl !== undefined} THEN ${body.imageUrl ?? null} ELSE "imageUrl" END,
          "updatedAt"     = now()
        WHERE id = ${id}
          AND "tenantId" = ${tenantId}
        RETURNING *
      `);

      const updated = (rows as Record<string, unknown>[])[0];
      if (!updated) return c.json({ error: 'Variant not found' }, 404);
      return c.json(updated);
    } catch (err) {
      return handleRouteError(c, err, 'PUT /catalog/variants/:id');
    }
  },
);

// DELETE /catalog/variants/:id
productCatalogRouter.delete('/variants/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    // Check if it's the default and other variants exist
    const variantRows = await sharedDb.execute(sql`
      SELECT id, "isDefault", "productId" FROM "productVariants"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      LIMIT 1
    `);

    const variant = (variantRows as Record<string, unknown>[])[0];
    if (!variant) return c.json({ error: 'Variant not found' }, 404);

    if (variant['isDefault']) {
      const otherRows = await sharedDb.execute(sql`
        SELECT COUNT(*) AS count FROM "productVariants"
        WHERE "tenantId" = ${tenantId}
          AND "productId" = ${variant['productId'] as string}
          AND id != ${id}
      `);
      const otherCount = Number((otherRows as Record<string, unknown>[])[0]?.['count'] ?? 0);
      if (otherCount > 0) {
        return c.json({ error: 'Cannot delete default variant while other variants exist. Set another variant as default first.' }, 400);
      }
    }

    await sharedDb.execute(sql`
      DELETE FROM "productVariants"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
    `);

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /catalog/variants/:id');
  }
});

// ── Price Lists ───────────────────────────────────────────────

// GET /catalog/price-lists
productCatalogRouter.get('/price-lists', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');

    const rows = await sharedDb.execute(sql`
      SELECT
        pl.*,
        COUNT(pli.id)::int AS "itemCount"
      FROM "priceLists" pl
      LEFT JOIN "priceListItems" pli
        ON pli."priceListId" = pl.id AND pli."tenantId" = ${tenantId}
      WHERE pl."tenantId" = ${tenantId}
      GROUP BY pl.id
      ORDER BY pl."isDefault" DESC, pl."createdAt" DESC
    `);

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /catalog/price-lists');
  }
});

// POST /catalog/price-lists
productCatalogRouter.post(
  '/price-lists',
  zValidator('json', PriceListCreateSchema),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const body = c.req.valid('json');

      if (body.isDefault) {
        await sharedDb.execute(sql`
          UPDATE "priceLists"
          SET "isDefault" = false, "updatedAt" = now()
          WHERE "tenantId" = ${tenantId} AND "isDefault" = true
        `);
      }

      const rows = await sharedDb.execute(sql`
        INSERT INTO "priceLists" (
          "tenantId", name, description, currency, type,
          adjustment, "startDate", "endDate", "isDefault", status,
          "createdAt", "updatedAt"
        )
        VALUES (
          ${tenantId},
          ${body.name},
          ${body.description ?? null},
          ${body.currency ?? 'USD'},
          ${body.type ?? 'fixed'},
          ${body.adjustment ?? 0},
          ${body.startDate ?? null},
          ${body.endDate ?? null},
          ${body.isDefault ?? false},
          ${body.status ?? 'active'},
          now(),
          now()
        )
        RETURNING *
      `);

      return c.json((rows as Record<string, unknown>[])[0], 201);
    } catch (err) {
      return handleRouteError(c, err, 'POST /catalog/price-lists');
    }
  },
);

// GET /catalog/price-lists/:id
productCatalogRouter.get('/price-lists/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const [listRows, itemRows] = await Promise.all([
      sharedDb.execute(sql`
        SELECT * FROM "priceLists"
        WHERE id = ${id} AND "tenantId" = ${tenantId}
        LIMIT 1
      `),
      sharedDb.execute(sql`
        SELECT pli.*, pv.sku AS "variantSku", pv.name AS "variantName"
        FROM "priceListItems" pli
        LEFT JOIN "productVariants" pv ON pv.id = pli."variantId"
        WHERE pli."priceListId" = ${id} AND pli."tenantId" = ${tenantId}
        ORDER BY pli."createdAt" ASC
      `),
    ]);

    const list = (listRows as Record<string, unknown>[])[0];
    if (!list) return c.json({ error: 'Price list not found' }, 404);

    return c.json({ ...list, items: itemRows });
  } catch (err) {
    return handleRouteError(c, err, 'GET /catalog/price-lists/:id');
  }
});

// PUT /catalog/price-lists/:id
productCatalogRouter.put(
  '/price-lists/:id',
  zValidator('json', PriceListUpdateSchema),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const id = c.req.param('id');
      const body = c.req.valid('json');

      if (body.isDefault) {
        await sharedDb.execute(sql`
          UPDATE "priceLists"
          SET "isDefault" = false, "updatedAt" = now()
          WHERE "tenantId" = ${tenantId} AND "isDefault" = true AND id != ${id}
        `);
      }

      const rows = await sharedDb.execute(sql`
        UPDATE "priceLists"
        SET
          name        = COALESCE(${body.name ?? null}, name),
          description = CASE WHEN ${body.description !== undefined} THEN ${body.description ?? null} ELSE description END,
          currency    = COALESCE(${body.currency ?? null}, currency),
          type        = COALESCE(${body.type ?? null}, type),
          adjustment  = COALESCE(${body.adjustment ?? null}, adjustment),
          "startDate" = CASE WHEN ${body.startDate !== undefined} THEN ${body.startDate ?? null} ELSE "startDate" END,
          "endDate"   = CASE WHEN ${body.endDate !== undefined} THEN ${body.endDate ?? null} ELSE "endDate" END,
          "isDefault" = COALESCE(${body.isDefault ?? null}, "isDefault"),
          status      = COALESCE(${body.status ?? null}, status),
          "updatedAt" = now()
        WHERE id = ${id} AND "tenantId" = ${tenantId}
        RETURNING *
      `);

      const updated = (rows as Record<string, unknown>[])[0];
      if (!updated) return c.json({ error: 'Price list not found' }, 404);
      return c.json(updated);
    } catch (err) {
      return handleRouteError(c, err, 'PUT /catalog/price-lists/:id');
    }
  },
);

// DELETE /catalog/price-lists/:id
productCatalogRouter.delete('/price-lists/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const listRows = await sharedDb.execute(sql`
      SELECT id, "isDefault" FROM "priceLists"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      LIMIT 1
    `);

    const list = (listRows as Record<string, unknown>[])[0];
    if (!list) return c.json({ error: 'Price list not found' }, 404);

    if (list['isDefault']) {
      return c.json({ error: 'Cannot delete the default price list.' }, 400);
    }

    await sharedDb.execute(sql`
      DELETE FROM "priceLists" WHERE id = ${id} AND "tenantId" = ${tenantId}
    `);

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /catalog/price-lists/:id');
  }
});

// ── Price List Items ──────────────────────────────────────────

// POST /catalog/price-lists/:id/items
productCatalogRouter.post(
  '/price-lists/:id/items',
  zValidator('json', PriceListItemCreateSchema),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const priceListId = c.req.param('id');
      const body = c.req.valid('json');

      // Verify price list belongs to tenant
      const listRows = await sharedDb.execute(sql`
        SELECT id FROM "priceLists"
        WHERE id = ${priceListId} AND "tenantId" = ${tenantId}
        LIMIT 1
      `);
      if (!(listRows as unknown[]).length) return c.json({ error: 'Price list not found' }, 404);

      const rows = await sharedDb.execute(sql`
        INSERT INTO "priceListItems" (
          "tenantId", "priceListId", "productId", "variantId",
          "fixedPrice", "percentageAdj", "minQuantity", "createdAt"
        )
        VALUES (
          ${tenantId},
          ${priceListId},
          ${body.productId ?? null},
          ${body.variantId ?? null},
          ${body.fixedPrice ?? null},
          ${body.percentageAdj ?? null},
          ${body.minQuantity ?? 1},
          now()
        )
        RETURNING *
      `);

      return c.json((rows as Record<string, unknown>[])[0], 201);
    } catch (err) {
      return handleRouteError(c, err, 'POST /catalog/price-lists/:id/items');
    }
  },
);

// PUT /catalog/price-lists/:id/items/:itemId
productCatalogRouter.put(
  '/price-lists/:id/items/:itemId',
  zValidator('json', PriceListItemUpdateSchema),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const priceListId = c.req.param('id');
      const itemId = c.req.param('itemId');
      const body = c.req.valid('json');

      const rows = await sharedDb.execute(sql`
        UPDATE "priceListItems"
        SET
          "productId"     = CASE WHEN ${body.productId !== undefined} THEN ${body.productId ?? null} ELSE "productId" END,
          "variantId"     = CASE WHEN ${body.variantId !== undefined} THEN ${body.variantId ?? null} ELSE "variantId" END,
          "fixedPrice"    = CASE WHEN ${body.fixedPrice !== undefined} THEN ${body.fixedPrice ?? null} ELSE "fixedPrice" END,
          "percentageAdj" = CASE WHEN ${body.percentageAdj !== undefined} THEN ${body.percentageAdj ?? null} ELSE "percentageAdj" END,
          "minQuantity"   = COALESCE(${body.minQuantity ?? null}, "minQuantity")
        WHERE id = ${itemId}
          AND "priceListId" = ${priceListId}
          AND "tenantId" = ${tenantId}
        RETURNING *
      `);

      const updated = (rows as Record<string, unknown>[])[0];
      if (!updated) return c.json({ error: 'Price list item not found' }, 404);
      return c.json(updated);
    } catch (err) {
      return handleRouteError(c, err, 'PUT /catalog/price-lists/:id/items/:itemId');
    }
  },
);

// DELETE /catalog/price-lists/:id/items/:itemId
productCatalogRouter.delete('/price-lists/:id/items/:itemId', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const priceListId = c.req.param('id');
    const itemId = c.req.param('itemId');

    const result = await sharedDb.execute(sql`
      DELETE FROM "priceListItems"
      WHERE id = ${itemId}
        AND "priceListId" = ${priceListId}
        AND "tenantId" = ${tenantId}
      RETURNING id
    `);

    if (!(result as unknown[]).length) return c.json({ error: 'Price list item not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /catalog/price-lists/:id/items/:itemId');
  }
});

// ── Price Resolution ──────────────────────────────────────────

// POST /catalog/resolve-price
productCatalogRouter.post(
  '/resolve-price',
  zValidator('json', ResolvePriceSchema),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const { productId, variantId, priceListId, quantity } = c.req.valid('json');
      const qty = quantity ?? 1;

      // 1. Get base price: variant price if variantId provided, else product basePrice from entityRecords
      let basePrice = 0;

      if (variantId) {
        const vRows = await sharedDb.execute(sql`
          SELECT price FROM "productVariants"
          WHERE id = ${variantId} AND "tenantId" = ${tenantId}
          LIMIT 1
        `);
        const v = (vRows as Record<string, unknown>[])[0];
        if (v) basePrice = Number(v['price'] ?? 0);
      } else {
        const pRows = await sharedDb.execute(sql`
          SELECT data->>'basePrice' AS "basePrice"
          FROM "entityRecords"
          WHERE id = ${productId}
            AND "tenantId" = ${tenantId}
            AND "entityType" = 'product'
            AND "deletedAt" IS NULL
          LIMIT 1
        `);
        const p = (pRows as Record<string, unknown>[])[0];
        if (p && p['basePrice'] !== null && p['basePrice'] !== undefined) {
          basePrice = Number(p['basePrice']);
        }
      }

      if (!priceListId) {
        return c.json({
          basePrice,
          effectivePrice: basePrice,
          discount: 0,
          discountPct: 0,
          priceListName: null,
        });
      }

      // 2. Get price list metadata
      const listRows = await sharedDb.execute(sql`
        SELECT name, type, adjustment FROM "priceLists"
        WHERE id = ${priceListId} AND "tenantId" = ${tenantId} AND status = 'active'
        LIMIT 1
      `);
      const list = (listRows as Record<string, unknown>[])[0];
      if (!list) {
        return c.json({
          basePrice,
          effectivePrice: basePrice,
          discount: 0,
          discountPct: 0,
          priceListName: null,
        });
      }

      // 3. Find best matching priceListItem: variant match > product match, at valid quantity break
      const itemRows = await sharedDb.execute(sql`
        SELECT *
        FROM "priceListItems"
        WHERE "priceListId" = ${priceListId}
          AND "tenantId" = ${tenantId}
          AND "minQuantity" <= ${qty}
          AND (
            ("variantId" = ${variantId ?? null} AND ${variantId ?? null} IS NOT NULL)
            OR ("productId" = ${productId} AND "variantId" IS NULL)
            OR ("productId" IS NULL AND "variantId" IS NULL)
          )
        ORDER BY
          CASE WHEN "variantId" IS NOT NULL THEN 0
               WHEN "productId" IS NOT NULL THEN 1
               ELSE 2
          END ASC,
          "minQuantity" DESC
        LIMIT 1
      `);

      const item = (itemRows as Record<string, unknown>[])[0];

      let effectivePrice = basePrice;

      if (item) {
        if (item['fixedPrice'] !== null && item['fixedPrice'] !== undefined) {
          effectivePrice = Number(item['fixedPrice']);
        } else if (item['percentageAdj'] !== null && item['percentageAdj'] !== undefined) {
          const adj = Number(item['percentageAdj']);
          effectivePrice = basePrice * (1 + adj / 100);
        }
      } else if (list['type'] === 'percentage') {
        // 4. Apply list-level percentage adjustment
        const adj = Number(list['adjustment'] ?? 0);
        effectivePrice = basePrice * (1 + adj / 100);
      }

      effectivePrice = Math.max(0, Math.round(effectivePrice * 100) / 100);
      const discount = Math.max(0, Math.round((basePrice - effectivePrice) * 100) / 100);
      const discountPct = basePrice > 0
        ? Math.round((discount / basePrice) * 10000) / 100
        : 0;

      return c.json({
        basePrice,
        effectivePrice,
        discount,
        discountPct,
        priceListName: list['name'] ?? null,
      });
    } catch (err) {
      return handleRouteError(c, err, 'POST /catalog/resolve-price');
    }
  },
);

// ── Discount Rules ────────────────────────────────────────────

// Static route: POST /catalog/discounts/validate — must be BEFORE /:id
productCatalogRouter.post(
  '/discounts/validate',
  zValidator('json', ValidateDiscountSchema),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const { code, orderValue, productIds } = c.req.valid('json');
      const today = new Date().toISOString().slice(0, 10);

      const rows = await sharedDb.execute(sql`
        SELECT * FROM "discountRules"
        WHERE "tenantId" = ${tenantId}
          AND code = ${code}
          AND status = 'active'
        LIMIT 1
      `);

      const discount = (rows as Record<string, unknown>[])[0];

      if (!discount) {
        return c.json({ valid: false, error: 'Discount code not found or inactive' });
      }

      // Validate date range
      if (discount['startDate'] && String(discount['startDate']) > today) {
        return c.json({ valid: false, error: 'Discount code is not yet active' });
      }
      if (discount['endDate'] && String(discount['endDate']) < today) {
        return c.json({ valid: false, error: 'Discount code has expired' });
      }

      // Validate max uses
      if (
        discount['maxUses'] !== null &&
        discount['maxUses'] !== undefined &&
        Number(discount['usedCount']) >= Number(discount['maxUses'])
      ) {
        return c.json({ valid: false, error: 'Discount code usage limit reached' });
      }

      // Validate min order value
      if (
        discount['minOrderValue'] !== null &&
        discount['minOrderValue'] !== undefined &&
        orderValue < Number(discount['minOrderValue'])
      ) {
        return c.json({
          valid: false,
          error: `Minimum order value of ${discount['minOrderValue']} required`,
        });
      }

      // Validate product applicability
      if (discount['applicableTo'] === 'products' && productIds && productIds.length > 0) {
        const applicableIds = (discount['productIds'] as string[]) ?? [];
        const hasMatch = productIds.some((id) => applicableIds.includes(id));
        if (!hasMatch) {
          return c.json({ valid: false, error: 'Discount code does not apply to these products' });
        }
      }

      // Calculate savings
      let savings = 0;
      const discountType = String(discount['type']);
      const discountValue = Number(discount['value']);

      if (discountType === 'percentage') {
        savings = Math.round(orderValue * (discountValue / 100) * 100) / 100;
      } else if (discountType === 'fixed') {
        savings = Math.min(discountValue, orderValue);
      } else if (discountType === 'free-shipping') {
        savings = 0; // shipping amount not known here; caller handles it
      } else if (discountType === 'bogo') {
        savings = 0; // complex, return type info and let caller compute
      }

      // Increment usedCount
      await sharedDb.execute(sql`
        UPDATE "discountRules"
        SET "usedCount" = "usedCount" + 1, "updatedAt" = now()
        WHERE id = ${discount['id'] as string} AND "tenantId" = ${tenantId}
      `);

      return c.json({
        valid: true,
        discount: {
          type: discount['type'],
          value: discount['value'],
          code: discount['code'],
        },
        savings,
      });
    } catch (err) {
      return handleRouteError(c, err, 'POST /catalog/discounts/validate');
    }
  },
);

const discountsQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// GET /catalog/discounts
productCatalogRouter.get('/discounts', zValidator('query', discountsQuerySchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { status } = c.req.valid('query');

    const statusClause = status
      ? sql`AND status = ${status}`
      : sql``;

    const rows = await sharedDb.execute(sql`
      SELECT * FROM "discountRules"
      WHERE "tenantId" = ${tenantId}
        ${statusClause}
      ORDER BY "createdAt" DESC
    `);

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /catalog/discounts');
  }
});

// POST /catalog/discounts
productCatalogRouter.post(
  '/discounts',
  zValidator('json', DiscountCreateSchema),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const body = c.req.valid('json');

      const rows = await sharedDb.execute(sql`
        INSERT INTO "discountRules" (
          "tenantId", name, code, type, value,
          "minOrderValue", "maxUses", "usedCount",
          "startDate", "endDate", "applicableTo", "productIds",
          status, "createdAt", "updatedAt"
        )
        VALUES (
          ${tenantId},
          ${body.name},
          ${body.code ?? null},
          ${body.type ?? 'percentage'},
          ${body.value ?? 0},
          ${body.minOrderValue ?? null},
          ${body.maxUses ?? null},
          0,
          ${body.startDate ?? null},
          ${body.endDate ?? null},
          ${body.applicableTo ?? 'all'},
          ${JSON.stringify(body.productIds ?? [])}::jsonb,
          ${body.status ?? 'active'},
          now(),
          now()
        )
        RETURNING *
      `);

      return c.json((rows as Record<string, unknown>[])[0], 201);
    } catch (err) {
      return handleRouteError(c, err, 'POST /catalog/discounts');
    }
  },
);

// GET /catalog/discounts/:id
productCatalogRouter.get('/discounts/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const rows = await sharedDb.execute(sql`
      SELECT * FROM "discountRules"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      LIMIT 1
    `);

    const discount = (rows as Record<string, unknown>[])[0];
    if (!discount) return c.json({ error: 'Discount not found' }, 404);
    return c.json(discount);
  } catch (err) {
    return handleRouteError(c, err, 'GET /catalog/discounts/:id');
  }
});

// PUT /catalog/discounts/:id
productCatalogRouter.put(
  '/discounts/:id',
  zValidator('json', DiscountUpdateSchema),
  async (c) => {
    try {
      const { tenantId } = c.get('tenantCtx');
      const id = c.req.param('id');
      const body = c.req.valid('json');

      const rows = await sharedDb.execute(sql`
        UPDATE "discountRules"
        SET
          name            = COALESCE(${body.name ?? null}, name),
          code            = CASE WHEN ${body.code !== undefined} THEN ${body.code ?? null} ELSE code END,
          type            = COALESCE(${body.type ?? null}, type),
          value           = COALESCE(${body.value ?? null}, value),
          "minOrderValue" = CASE WHEN ${body.minOrderValue !== undefined} THEN ${body.minOrderValue ?? null} ELSE "minOrderValue" END,
          "maxUses"       = CASE WHEN ${body.maxUses !== undefined} THEN ${body.maxUses ?? null} ELSE "maxUses" END,
          "startDate"     = CASE WHEN ${body.startDate !== undefined} THEN ${body.startDate ?? null} ELSE "startDate" END,
          "endDate"       = CASE WHEN ${body.endDate !== undefined} THEN ${body.endDate ?? null} ELSE "endDate" END,
          "applicableTo"  = COALESCE(${body.applicableTo ?? null}, "applicableTo"),
          "productIds"    = CASE WHEN ${body.productIds !== undefined} THEN ${JSON.stringify(body.productIds ?? [])}::jsonb ELSE "productIds" END,
          status          = COALESCE(${body.status ?? null}, status),
          "updatedAt"     = now()
        WHERE id = ${id} AND "tenantId" = ${tenantId}
        RETURNING *
      `);

      const updated = (rows as Record<string, unknown>[])[0];
      if (!updated) return c.json({ error: 'Discount not found' }, 404);
      return c.json(updated);
    } catch (err) {
      return handleRouteError(c, err, 'PUT /catalog/discounts/:id');
    }
  },
);

// DELETE /catalog/discounts/:id
productCatalogRouter.delete('/discounts/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const result = await sharedDb.execute(sql`
      DELETE FROM "discountRules"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING id
    `);

    if (!(result as unknown[]).length) return c.json({ error: 'Discount not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /catalog/discounts/:id');
  }
});
