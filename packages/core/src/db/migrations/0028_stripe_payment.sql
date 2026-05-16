-- Add Stripe payment tracking fields to invoice entities
-- (stored in entityRecords.data JSONB, no schema change needed)
-- This migration adds a webhooks config table for Stripe events
CREATE TABLE IF NOT EXISTS "stripeWebhookEvents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES "tenants"("id"),
  "stripeEventId" text NOT NULL UNIQUE,
  "type" text NOT NULL,
  "processedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "stripeWebhookEvents_tenantId_idx" ON "stripeWebhookEvents"("tenantId");
