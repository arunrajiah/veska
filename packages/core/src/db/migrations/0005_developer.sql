-- Phase 15: Developer tools — webhook endpoints/deliveries + scopes on API keys

-- Add scopes column to existing api_keys table (missing from 0003)
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "scopes" text[] NOT NULL DEFAULT '{}';

-- Add revokedAt to api_keys (soft-delete instead of hard delete)
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "revoked_at" timestamptz;

-- Webhook endpoints (richer than webhook_subscriptions: tracks deliveries)
CREATE TABLE IF NOT EXISTS "webhookEndpoints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" text NOT NULL,
  "url" text NOT NULL,
  "description" text,
  "events" text[] NOT NULL DEFAULT '{}',
  "secret" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "webhookDeliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "endpointId" uuid NOT NULL REFERENCES "webhookEndpoints"("id") ON DELETE CASCADE,
  "event" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "statusCode" int,
  "attempt" int NOT NULL DEFAULT 1,
  "responseBody" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- Developer audit log (looser schema — actorId is text, not UUID FK)
CREATE TABLE IF NOT EXISTS "auditLog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" text NOT NULL,
  "actorId" text,
  "actorType" text NOT NULL DEFAULT 'user',
  "action" text NOT NULL,
  "entityType" text,
  "entityId" text,
  "diff" jsonb,
  "ip" text,
  "userAgent" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "auditLog_tenantId_idx" ON "auditLog"("tenantId");
CREATE INDEX IF NOT EXISTS "auditLog_createdAt_idx" ON "auditLog"("createdAt" DESC);
