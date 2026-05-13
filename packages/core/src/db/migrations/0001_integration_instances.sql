-- Migration 0001: Integration instances
-- Stores configured integrations per tenant (Stripe, QuickBooks, etc.)

CREATE TABLE IF NOT EXISTS integration_instances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                -- integration name e.g. 'stripe'
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  -- Credentials stored as encrypted refs (in production, use a secrets manager)
  config      JSONB NOT NULL DEFAULT '{}'::JSONB,
  last_synced_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX integration_instances_tenant_id_idx ON integration_instances(tenant_id);

-- Enable RLS
ALTER TABLE integration_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_instances_tenant_isolation ON integration_instances
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

-- Immutable rule: credentials cannot be read back in plaintext after storage
-- (Application layer must enforce — DB stores hashed or vault refs only)

COMMENT ON TABLE integration_instances IS
  'Per-tenant integration configurations. config stores non-secret settings; secrets go in vault.';
