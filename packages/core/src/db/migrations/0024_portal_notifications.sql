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
CREATE INDEX IF NOT EXISTS "idxPortalTokensToken" ON "portalTokens"(token);
CREATE INDEX IF NOT EXISTS "idxPortalTokensTenant" ON "portalTokens"("tenantId", "contactId");

-- In-app notifications.
-- 0004_notifications.sql already creates a leaner "notifications" table, so the
-- CREATE below no-ops on an existing database. The ALTERs bring that table up to
-- the richer shape the /notifications route actually queries (userId, isRead, …).
-- Without them the CREATE silently skipped and every later statement referencing
-- "userId" failed, aborting this migration.
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

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "userId"     TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "entityId"   TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "actionUrl"  TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "isRead"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "readAt"     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "idxNotificationsUser" ON "notifications"("tenantId", "userId", "isRead");
CREATE INDEX IF NOT EXISTS "idxNotificationsCreated" ON "notifications"("tenantId", "createdAt" DESC);
