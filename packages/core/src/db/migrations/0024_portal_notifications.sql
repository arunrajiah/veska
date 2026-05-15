-- Portal tokens (issued per contact/customer, scoped to tenant)
CREATE TABLE IF NOT EXISTS "portalTokens" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  token        TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  "contactId"  TEXT NOT NULL,   -- entityRecords id of the CRM contact
  email        TEXT NOT NULL,
  "expiresAt"  TIMESTAMPTZ,     -- null = never expires
  "lastUsedAt" TIMESTAMPTZ,
  "isActive"   BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON "portalTokens"(token);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_tenant ON "portalTokens"("tenantId", "contactId");

-- In-app notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'info', -- 'info'|'success'|'warning'|'error'|'ai_insight'|'anomaly'|'approval'
  title        TEXT NOT NULL,
  body         TEXT,
  "entityType" TEXT,  -- optional link back to an ERP entity
  "entityId"   TEXT,
  "actionUrl"  TEXT,  -- deep link e.g. /dashboard/service-desk/TKT-0042
  "isRead"     BOOLEAN NOT NULL DEFAULT false,
  "readAt"     TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON "notifications"("tenantId", "userId", "isRead");
CREATE INDEX IF NOT EXISTS idx_notifications_created ON "notifications"("tenantId", "createdAt" DESC);
