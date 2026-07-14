-- Migration 0001: Integration instances
-- Stores configured integrations per tenant (Stripe, QuickBooks, etc.)

CREATE TABLE IF NOT EXISTS "integrationInstances" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                -- integration name e.g. 'stripe'
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  -- Credentials stored as encrypted refs (in production, use a secrets manager)
  config      JSONB NOT NULL DEFAULT '{}'::JSONB,
  "lastSyncedAt" TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("tenantId", name)
);

CREATE INDEX "integrationInstancesTenantIdIdx" ON "integrationInstances"("tenantId");

-- Enable RLS
ALTER TABLE "integrationInstances" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrationInstancesTenantIsolation" ON "integrationInstances"
  USING ("tenantId" = current_setting('app.tenant_id', TRUE)::UUID);

-- Immutable rule: credentials cannot be read back in plaintext after storage
-- (Application layer must enforce — DB stores hashed or vault refs only)

COMMENT ON TABLE "integrationInstances" IS
  'Per-tenant integration configurations. config stores non-secret settings; secrets go in vault.';
