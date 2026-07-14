-- Data subject requests (GDPR)
CREATE TABLE IF NOT EXISTS "dataRequests" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  type         TEXT NOT NULL, -- 'export' | 'erasure' | 'portability' | 'rectification'
  "requestedBy" TEXT NOT NULL,  -- userId or email
  status       TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'processing'|'completed'|'rejected'
  notes        TEXT,
  "completedAt" TIMESTAMPTZ,
  "exportUrl"  TEXT,  -- signed URL or path to exported data
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxDataRequestsTenant" ON "dataRequests"("tenantId");

-- Consent log
CREATE TABLE IF NOT EXISTS "consentLog" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  purpose      TEXT NOT NULL,  -- 'marketing' | 'analytics' | 'functional' | 'ai-training'
  granted      BOOLEAN NOT NULL,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxConsentTenantUser" ON "consentLog"("tenantId", "userId");

-- Data retention policies
CREATE TABLE IF NOT EXISTS "retentionPolicies" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "retainDays" INTEGER NOT NULL DEFAULT 365,
  "autoDelete" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idxRetentionTenantType" ON "retentionPolicies"("tenantId", "entityType");

-- Integration configurations
CREATE TABLE IF NOT EXISTS "integrationConfigs" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  provider     TEXT NOT NULL,  -- 'zapier'|'slack'|'google-calendar'|'google-sheets'|'ms-teams'|'custom'
  name         TEXT NOT NULL,
  config       JSONB NOT NULL DEFAULT '{}', -- provider-specific config (webhookUrl, apiKey, etc.)
  enabled      BOOLEAN NOT NULL DEFAULT true,
  "lastTestedAt" TIMESTAMPTZ,
  "lastTestStatus" TEXT,  -- 'ok' | 'failed'
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxIntegrationsTenant" ON "integrationConfigs"("tenantId");

-- Integration event log
CREATE TABLE IF NOT EXISTS "integrationEvents" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "integrationId" TEXT REFERENCES "integrationConfigs"(id) ON DELETE SET NULL,
  "eventType"    TEXT NOT NULL,  -- e.g. 'invoice.created', 'expense.approved'
  payload        JSONB NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'delivered'|'failed'
  "statusCode"   INTEGER,
  "responseBody" TEXT,
  "deliveredAt"  TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxIntegrationEventsTenant" ON "integrationEvents"("tenantId");
CREATE INDEX IF NOT EXISTS "idxIntegrationEventsIntegration" ON "integrationEvents"("integrationId");
