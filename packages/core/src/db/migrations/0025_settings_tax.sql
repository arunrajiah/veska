-- Tenant-level settings (one row per tenant, upserted)
CREATE TABLE IF NOT EXISTS "tenantSettings" (
  "tenantId"        TEXT PRIMARY KEY,
  -- Company profile
  "companyName"     TEXT,
  "companyEmail"    TEXT,
  "companyPhone"    TEXT,
  "companyAddress"  TEXT,
  "companyCity"     TEXT,
  "companyCountry"  TEXT,
  "companyPostcode" TEXT,
  "logoUrl"         TEXT,
  "website"         TEXT,
  "taxId"           TEXT,           -- VAT/EIN/etc
  -- Locale
  timezone          TEXT NOT NULL DEFAULT 'UTC',
  currency          TEXT NOT NULL DEFAULT 'USD',
  dateFormat        TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
  -- Branding
  "primaryColor"    TEXT NOT NULL DEFAULT '#6366f1',
  "accentColor"     TEXT NOT NULL DEFAULT '#8b5cf6',
  -- Email (SMTP)
  "smtpHost"        TEXT,
  "smtpPort"        INTEGER DEFAULT 587,
  "smtpUser"        TEXT,
  "smtpPassEncrypted" TEXT,   -- store AES-256-GCM encrypted, key from env
  "smtpFromName"    TEXT,
  "smtpFromEmail"   TEXT,
  -- Modules enabled (JSON array of module names)
  "enabledModules"  JSONB NOT NULL DEFAULT '["crm","finance","hr","inventory","projects"]',
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tax rates
CREATE TABLE IF NOT EXISTS "taxRates" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  name            TEXT NOT NULL,       -- e.g. "Standard VAT", "GST", "Sales Tax"
  rate            NUMERIC(6,4) NOT NULL, -- e.g. 0.2000 = 20%
  type            TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' only for now
  jurisdiction    TEXT,                -- e.g. "UK", "California", "EU"
  "appliesTo"     TEXT NOT NULL DEFAULT 'all', -- 'all'|'products'|'services'
  "isDefault"     BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'active',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tax_rates_tenant ON "taxRates"("tenantId");

-- Email send log (records every email attempt)
CREATE TABLE IF NOT EXISTS "emailLog" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "jobName"     TEXT NOT NULL,    -- which queue job triggered this
  "toEmail"     TEXT NOT NULL,
  subject       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending', -- 'sent'|'failed'|'skipped'
  "errorMessage" TEXT,
  "sentAt"      TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_log_tenant ON "emailLog"("tenantId", "createdAt" DESC);
