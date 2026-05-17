-- Add base currency to tenant settings (stored in TenantSettings entityRecord)
-- No schema change needed — stored in JSONB data field
-- This migration adds an exchange_rate_cache table for persistence
CREATE TABLE IF NOT EXISTS "exchangeRateCache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "baseCurrency" text NOT NULL,
  "rates" jsonb NOT NULL,
  "fetchedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "exchange_rate_base_idx" ON "exchangeRateCache"("baseCurrency");
