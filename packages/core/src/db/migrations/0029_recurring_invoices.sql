CREATE TABLE IF NOT EXISTS "recurringInvoiceSchedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "templateInvoiceId" uuid NOT NULL,
  "frequency" text NOT NULL CHECK (frequency IN ('weekly','monthly','quarterly','yearly')),
  "nextRunAt" timestamptz NOT NULL,
  "lastRunAt" timestamptz,
  "dayOfMonth" int,
  "enabled" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "recurring_tenant_idx" ON "recurringInvoiceSchedules"("tenantId");
CREATE INDEX IF NOT EXISTS "recurring_next_run_idx" ON "recurringInvoiceSchedules"("nextRunAt") WHERE "enabled" = true;
