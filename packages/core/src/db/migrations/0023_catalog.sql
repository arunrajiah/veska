-- Product variants (extends existing products in entityRecords)
CREATE TABLE IF NOT EXISTS "productVariants" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "productId"     TEXT NOT NULL,  -- references entityRecords id (entityType='product')
  sku             TEXT NOT NULL,
  name            TEXT NOT NULL,
  attributes      JSONB NOT NULL DEFAULT '{}',  -- { color: 'red', size: 'L' }
  price           NUMERIC(14,2) NOT NULL DEFAULT 0,
  "compareAtPrice" NUMERIC(14,2),  -- original/strike-through price
  cost            NUMERIC(14,2),   -- cost of goods
  "stockQuantity" INTEGER NOT NULL DEFAULT 0,
  weight          NUMERIC(8,3),    -- kg
  "isDefault"     BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'active', -- 'active'|'inactive'
  "imageUrl"      TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idxProductVariantsSku" ON "productVariants"("tenantId", sku);
CREATE INDEX IF NOT EXISTS "idxProductVariantsProduct" ON "productVariants"("tenantId", "productId");

-- Price lists (for B2B tiers, regions, customer segments)
CREATE TABLE IF NOT EXISTS "priceLists" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  currency     TEXT NOT NULL DEFAULT 'USD',
  type         TEXT NOT NULL DEFAULT 'fixed', -- 'fixed'|'percentage'
  -- For percentage type: adjust = -10 means 10% off all products
  adjustment   NUMERIC(8,4) DEFAULT 0,
  "startDate"  DATE,
  "endDate"    DATE,
  "isDefault"  BOOLEAN NOT NULL DEFAULT false,
  status       TEXT NOT NULL DEFAULT 'active',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxPriceListsTenant" ON "priceLists"("tenantId");

-- Price list items (product-specific overrides within a price list)
CREATE TABLE IF NOT EXISTS "priceListItems" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "priceListId"   TEXT NOT NULL REFERENCES "priceLists"(id) ON DELETE CASCADE,
  "productId"     TEXT,    -- entityRecords product id (null = applies to all)
  "variantId"     TEXT REFERENCES "productVariants"(id) ON DELETE CASCADE,
  "fixedPrice"    NUMERIC(14,2),
  "percentageAdj" NUMERIC(8,4),  -- e.g. -15 = 15% discount
  "minQuantity"   INTEGER NOT NULL DEFAULT 1,  -- quantity break pricing
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxPriceListItemsList" ON "priceListItems"("tenantId", "priceListId");

-- Discount rules
CREATE TABLE IF NOT EXISTS "discountRules" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  name            TEXT NOT NULL,
  code            TEXT,            -- coupon code (optional)
  type            TEXT NOT NULL DEFAULT 'percentage', -- 'percentage'|'fixed'|'free-shipping'|'bogo'
  value           NUMERIC(10,2) NOT NULL DEFAULT 0,
  "minOrderValue" NUMERIC(14,2),
  "maxUses"       INTEGER,
  "usedCount"     INTEGER NOT NULL DEFAULT 0,
  "startDate"     DATE,
  "endDate"       DATE,
  "applicableTo"  TEXT NOT NULL DEFAULT 'all', -- 'all'|'products'|'categories'
  "productIds"    JSONB NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'active',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxDiscountRulesTenant" ON "discountRules"("tenantId");
CREATE INDEX IF NOT EXISTS "idxDiscountRulesCode" ON "discountRules"("tenantId", code);
