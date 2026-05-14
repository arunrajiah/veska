-- Custom field definitions
CREATE TABLE IF NOT EXISTS "customFieldDefs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" text NOT NULL,
  "entityType" text NOT NULL,   -- invoice | expense | employee | purchase_order | project | deal | contact
  "name" text NOT NULL,         -- machine name e.g. 'po_number'
  "label" text NOT NULL,        -- display label e.g. 'PO Number'
  "type" text NOT NULL,         -- text | number | date | boolean | select | textarea
  "options" text[],             -- for select type: the available options
  "required" boolean NOT NULL DEFAULT false,
  "sortOrder" int NOT NULL DEFAULT 0,
  "enabled" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenantId", "entityType", "name")
);

-- Recurring invoice templates
CREATE TABLE IF NOT EXISTS "recurringInvoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" text NOT NULL,
  "name" text NOT NULL,                    -- e.g. "Monthly retainer - Acme Corp"
  "templateData" jsonb NOT NULL,           -- same shape as invoice data
  "frequency" text NOT NULL,              -- weekly | monthly | quarterly | annually
  "startDate" date NOT NULL,
  "endDate" date,                          -- null = runs indefinitely
  "nextRunDate" date NOT NULL,
  "lastRunDate" date,
  "totalRuns" int NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'active', -- active | paused | completed | cancelled
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "customFieldDefs_tenantId_entityType_idx" ON "customFieldDefs"("tenantId", "entityType");
CREATE INDEX IF NOT EXISTS "recurringInvoices_tenantId_idx" ON "recurringInvoices"("tenantId");
CREATE INDEX IF NOT EXISTS "recurringInvoices_nextRunDate_idx" ON "recurringInvoices"("nextRunDate");
