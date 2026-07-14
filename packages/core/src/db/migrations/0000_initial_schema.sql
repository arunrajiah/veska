-- Veska initial schema migration
-- Generated: 2026-05-13

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ── Tenants ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "currentConfigId" uuid,
  "timezone" text NOT NULL DEFAULT 'UTC',
  "defaultCurrency" text NOT NULL DEFAULT 'USD',
  "fiscalYearStart" text NOT NULL DEFAULT '01-01',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "deletedAt" timestamptz,
  CONSTRAINT "tenantsSlugKey" UNIQUE ("slug")
);

-- ── Config versions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "configVersions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "version" text NOT NULL,
  "config" jsonb NOT NULL,
  "appliedBy" uuid,
  "naturalLanguageRequest" text,
  "diff" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "configVersionsTenantIdIdx" ON "configVersions"("tenantId");

-- ── Entity definitions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "entityDefinitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "pluralName" text NOT NULL,
  "label" text NOT NULL,
  "pluralLabel" text NOT NULL,
  "description" text,
  "fields" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "isSystem" boolean NOT NULL DEFAULT false,
  "icon" text,
  "aiDescription" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "entityDefinitionsTenantNameKey" UNIQUE ("tenantId", "name")
);
CREATE INDEX IF NOT EXISTS "entityDefinitionsTenantIdIdx" ON "entityDefinitions"("tenantId");

-- ── Entity records ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "entityRecords" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "entityType" text NOT NULL,
  "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "deletedAt" timestamptz
);
CREATE INDEX IF NOT EXISTS "entityRecordsTenantTypeIdx" ON "entityRecords"("tenantId", "entityType");
CREATE INDEX IF NOT EXISTS "entityRecordsTenantIdIdx" ON "entityRecords"("tenantId");
CREATE INDEX IF NOT EXISTS "entityRecordsDataGinIdx" ON "entityRecords" USING gin("data");

-- ── Workflow definitions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "workflowDefinitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "trigger" jsonb NOT NULL,
  "steps" jsonb NOT NULL,
  "entryStep" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "isSystem" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "workflowDefinitionsTenantIdIdx" ON "workflowDefinitions"("tenantId");

-- ── Workflow runs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "workflowRuns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "workflowId" uuid NOT NULL REFERENCES "workflowDefinitions"("id"),
  "status" text NOT NULL DEFAULT 'pending',
  "currentStep" text,
  "context" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "startedAt" timestamptz NOT NULL DEFAULT now(),
  "completedAt" timestamptz,
  "error" text
);
CREATE INDEX IF NOT EXISTS "workflowRunsTenantWorkflowIdx" ON "workflowRuns"("tenantId", "workflowId");
CREATE INDEX IF NOT EXISTS "workflowRunsStatusIdx" ON "workflowRuns"("status");

-- ── Roles ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "capabilities" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "isSystem" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "rolesTenantNameKey" UNIQUE ("tenantId", "name")
);

-- ── Identities ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "channelIds" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "roleIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "additionalCapabilities" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "deniedCapabilities" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "entityId" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "identitiesTenantIdIdx" ON "identities"("tenantId");

-- ── Channel configs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "channelConfigs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "channelName" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "credentialsRef" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "channelConfigsTenantChannelKey" UNIQUE ("tenantId", "channelName")
);

-- ── Double-entry ledger ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ledgerEntries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "journalId" uuid NOT NULL,
  "accountCode" text NOT NULL,
  "debitAmount" text NOT NULL DEFAULT '0',
  "creditAmount" text NOT NULL DEFAULT '0',
  "currency" text NOT NULL,
  "description" text NOT NULL,
  "referenceType" text,
  "referenceId" uuid,
  "postedAt" timestamptz NOT NULL,
  "periodYear" text NOT NULL,
  "periodMonth" text NOT NULL,
  "createdBy" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ledgerEntriesTenantJournalIdx" ON "ledgerEntries"("tenantId", "journalId");
CREATE INDEX IF NOT EXISTS "ledgerEntriesTenantAccountIdx" ON "ledgerEntries"("tenantId", "accountCode");
CREATE INDEX IF NOT EXISTS "ledgerEntriesPostedAtIdx" ON "ledgerEntries"("postedAt");

-- Prevent updates to ledger entries (immutability enforced at DB level)
CREATE OR REPLACE RULE "ledgerNoUpdate" AS
  ON UPDATE TO "ledgerEntries" DO INSTEAD NOTHING;

CREATE OR REPLACE RULE "ledgerNoDelete" AS
  ON DELETE TO "ledgerEntries" DO INSTEAD NOTHING;

-- ── Audit log ─────────────────────────────────────────────────
-- Single canonical audit table. Columns are the union of what the core
-- AuditService writes (actorIdentityId / resourceType / aiReasoningTrace) and what
-- the /audit API route writes (actorId / entityType / diff / ip / userAgent).
CREATE TABLE IF NOT EXISTS "auditLog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "actorIdentityId" uuid,
  "actorId" text,
  "actorType" text NOT NULL DEFAULT 'system',
  "channel" text,
  "action" text NOT NULL,
  "resourceType" text,
  "resourceId" uuid,
  "entityType" text,
  "entityId" text,
  "capability" text,
  "before" jsonb,
  "after" jsonb,
  "diff" jsonb,
  "ip" text,
  "userAgent" text,
  "aiReasoningTrace" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "auditLogTenantIdIdx" ON "auditLog"("tenantId");
CREATE INDEX IF NOT EXISTS "auditLogActorIdx" ON "auditLog"("actorIdentityId");
CREATE INDEX IF NOT EXISTS "auditLogResourceIdx" ON "auditLog"("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "auditLogCreatedAtIdx" ON "auditLog"("createdAt");

-- Audit log is append-only
CREATE OR REPLACE RULE "auditLogNoUpdate" AS
  ON UPDATE TO "auditLog" DO INSTEAD NOTHING;

CREATE OR REPLACE RULE "auditLogNoDelete" AS
  ON DELETE TO "auditLog" DO INSTEAD NOTHING;

-- ── Magic links ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "magicLinks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "token" text NOT NULL,
  "identityId" uuid NOT NULL,
  "resourceType" text NOT NULL,
  "resourceId" uuid,
  "action" text NOT NULL,
  "usedAt" timestamptz,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "magicLinksTokenKey" UNIQUE ("token")
);
CREATE INDEX IF NOT EXISTS "magicLinksExpiresAtIdx" ON "magicLinks"("expiresAt");

-- Enable Row Level Security on all tenant-scoped tables
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "configVersions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "entityDefinitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "entityRecords" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflowDefinitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflowRuns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "channelConfigs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledgerEntries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "magicLinks" ENABLE ROW LEVEL SECURITY;
