-- Document templates
CREATE TABLE IF NOT EXISTS "documentTemplates" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL, -- 'invoice' | 'quote' | 'purchase-order' | 'contract' | 'receipt' | 'custom'
  description  TEXT,
  htmlBody     TEXT NOT NULL DEFAULT '',   -- HTML with {{variable}} placeholders
  variables    JSONB NOT NULL DEFAULT '[]', -- [{ name, label, defaultValue?, required? }]
  isDefault    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxDocTemplatesTenant" ON "documentTemplates"("tenantId");

-- Generated documents (render history)
CREATE TABLE IF NOT EXISTS "generatedDocuments" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "templateId" TEXT REFERENCES "documentTemplates"(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  variables    JSONB NOT NULL DEFAULT '{}', -- filled values at render time
  htmlOutput   TEXT NOT NULL,
  "entityType" TEXT,   -- e.g. 'invoice'
  "entityId"   TEXT,
  "createdBy"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxGenDocsTenant" ON "generatedDocuments"("tenantId");
CREATE INDEX IF NOT EXISTS "idxGenDocsEntity" ON "generatedDocuments"("tenantId", "entityType", "entityId");

-- Assets
CREATE TABLE IF NOT EXISTS "assets" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT NOT NULL,
  name              TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'equipment', -- equipment|vehicle|property|software|furniture|other
  serialNumber      TEXT,
  purchaseDate      DATE,
  purchasePrice     NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'USD',
  depreciationMethod TEXT NOT NULL DEFAULT 'straight-line', -- straight-line|declining-balance|none
  usefulLifeYears   INTEGER NOT NULL DEFAULT 5,
  salvageValue      NUMERIC(14,2) NOT NULL DEFAULT 0,
  assignedTo        TEXT,   -- userId
  location          TEXT,
  status            TEXT NOT NULL DEFAULT 'active', -- active|disposed|maintenance|retired
  notes             TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxAssetsTenant" ON "assets"("tenantId");
CREATE INDEX IF NOT EXISTS "idxAssetsStatus" ON "assets"("tenantId", status);
