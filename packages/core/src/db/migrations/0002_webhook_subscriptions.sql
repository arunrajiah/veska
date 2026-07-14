CREATE TABLE IF NOT EXISTS "webhookSubscriptions" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  events      TEXT[] NOT NULL DEFAULT '{}',  -- e.g. ['entity.created', 'workflow.completed']
  secret      TEXT NOT NULL,                  -- HMAC signing secret
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "webhookSubscriptions"("tenantId");
