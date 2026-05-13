-- Channel configurations per tenant
CREATE TABLE IF NOT EXISTS "notificationChannels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" text NOT NULL,
  "type" text NOT NULL,           -- email | slack | webhook
  "name" text NOT NULL,           -- display name e.g. "Finance Team Email"
  "config" jsonb NOT NULL DEFAULT '{}',
  "enabled" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Per-event routing: which channels receive which events
CREATE TABLE IF NOT EXISTS "notificationRoutes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" text NOT NULL,
  "event" text NOT NULL,          -- e.g. 'invoice.paid', 'po.approved', '*'
  "channelId" uuid NOT NULL REFERENCES "notificationChannels"("id") ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenantId", "event", "channelId")
);

CREATE INDEX IF NOT EXISTS "notificationChannels_tenantId_idx" ON "notificationChannels"("tenantId");
CREATE INDEX IF NOT EXISTS "notificationRoutes_tenantId_event_idx" ON "notificationRoutes"("tenantId", "event");
