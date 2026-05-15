-- Time entries
CREATE TABLE IF NOT EXISTS "timeEntries" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "projectId"  TEXT,          -- optional link to entityRecords project
  "taskId"     TEXT,          -- optional link to task entity
  description  TEXT,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes      INTEGER NOT NULL DEFAULT 0,
  billable     BOOLEAN NOT NULL DEFAULT false,
  "hourlyRate" NUMERIC(12,2),
  "startedAt"  TIMESTAMPTZ,   -- for live timer
  "stoppedAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_user ON "timeEntries"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON "timeEntries"("tenantId", date);

-- CRM: contacts
CREATE TABLE IF NOT EXISTS "crmContacts" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  company      TEXT,
  title        TEXT,
  tags         JSONB NOT NULL DEFAULT '[]',
  notes        TEXT,
  "ownerId"    TEXT,          -- userId of owner
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant ON "crmContacts"("tenantId");

-- CRM: deal stages (pipeline definition)
CREATE TABLE IF NOT EXISTS "dealStages" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  name        TEXT NOT NULL,
  "order"     INTEGER NOT NULL DEFAULT 0,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  probability INTEGER NOT NULL DEFAULT 0, -- 0-100
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deal_stages_tenant ON "dealStages"("tenantId");

-- CRM: deals
CREATE TABLE IF NOT EXISTS "crmDeals" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  title        TEXT NOT NULL,
  value        NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency     TEXT NOT NULL DEFAULT 'USD',
  "stageId"    TEXT REFERENCES "dealStages"(id) ON DELETE SET NULL,
  "contactId"  TEXT REFERENCES "crmContacts"(id) ON DELETE SET NULL,
  "ownerId"    TEXT,
  "expectedCloseDate" DATE,
  status       TEXT NOT NULL DEFAULT 'open', -- open | won | lost
  notes        TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_deals_tenant ON "crmDeals"("tenantId");
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON "crmDeals"("tenantId", "stageId");
