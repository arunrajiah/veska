CREATE TABLE IF NOT EXISTS "apiKeys" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  "keyHash"    TEXT NOT NULL UNIQUE,   -- SHA-256 of the actual key
  "keyPrefix"  TEXT NOT NULL,          -- first 8 chars of key for display (e.g. "vskLive")
  "lastUsedAt" TIMESTAMPTZ,
  "expiresAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "apiKeys"("tenantId");
CREATE INDEX ON "apiKeys"("keyHash");
