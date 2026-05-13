CREATE TABLE IF NOT EXISTS "exchangeRates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" text NOT NULL,
  "baseCurrency" text NOT NULL DEFAULT 'USD',
  "targetCurrency" text NOT NULL,
  "rate" numeric(18, 6) NOT NULL,          -- 1 USD = rate targetCurrency
  "source" text NOT NULL DEFAULT 'manual', -- manual | api
  "effectiveDate" date NOT NULL DEFAULT CURRENT_DATE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenantId", "baseCurrency", "targetCurrency", "effectiveDate")
);

-- Tenant currency settings
CREATE TABLE IF NOT EXISTS "tenantCurrencySettings" (
  "tenantId" text PRIMARY KEY,
  "baseCurrency" text NOT NULL DEFAULT 'USD',
  "supportedCurrencies" text[] NOT NULL DEFAULT '{"USD","EUR","GBP","CAD","AUD"}',
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "exchangeRates_tenantId_idx" ON "exchangeRates"("tenantId");
