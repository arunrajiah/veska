-- Veska initial schema migration
-- Generated: 2026-05-13

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ── Tenants ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "current_config_id" uuid,
  "timezone" text NOT NULL DEFAULT 'UTC',
  "default_currency" text NOT NULL DEFAULT 'USD',
  "fiscal_year_start" text NOT NULL DEFAULT '01-01',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "tenants_slug_key" UNIQUE ("slug")
);

-- ── Config versions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "config_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "version" text NOT NULL,
  "config" jsonb NOT NULL,
  "applied_by" uuid,
  "natural_language_request" text,
  "diff" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "config_versions_tenant_id_idx" ON "config_versions"("tenant_id");

-- ── Entity definitions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "entity_definitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "plural_name" text NOT NULL,
  "label" text NOT NULL,
  "plural_label" text NOT NULL,
  "description" text,
  "fields" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_system" boolean NOT NULL DEFAULT false,
  "icon" text,
  "ai_description" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "entity_definitions_tenant_name_key" UNIQUE ("tenant_id", "name")
);
CREATE INDEX IF NOT EXISTS "entity_definitions_tenant_id_idx" ON "entity_definitions"("tenant_id");

-- ── Entity records ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "entity_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "entity_type" text NOT NULL,
  "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "deleted_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "entity_records_tenant_type_idx" ON "entity_records"("tenant_id", "entity_type");
CREATE INDEX IF NOT EXISTS "entity_records_tenant_id_idx" ON "entity_records"("tenant_id");
CREATE INDEX IF NOT EXISTS "entity_records_data_gin_idx" ON "entity_records" USING gin("data");

-- ── Workflow definitions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "workflow_definitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "trigger" jsonb NOT NULL,
  "steps" jsonb NOT NULL,
  "entry_step" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "is_system" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "workflow_definitions_tenant_id_idx" ON "workflow_definitions"("tenant_id");

-- ── Workflow runs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "workflow_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "workflow_id" uuid NOT NULL REFERENCES "workflow_definitions"("id"),
  "status" text NOT NULL DEFAULT 'pending',
  "current_step" text,
  "context" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz,
  "error" text
);
CREATE INDEX IF NOT EXISTS "workflow_runs_tenant_workflow_idx" ON "workflow_runs"("tenant_id", "workflow_id");
CREATE INDEX IF NOT EXISTS "workflow_runs_status_idx" ON "workflow_runs"("status");

-- ── Roles ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "capabilities" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_system" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "roles_tenant_name_key" UNIQUE ("tenant_id", "name")
);

-- ── Identities ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "channel_ids" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "role_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "additional_capabilities" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "denied_capabilities" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "entity_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "identities_tenant_id_idx" ON "identities"("tenant_id");

-- ── Channel configs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "channel_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "channel_name" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "credentials_ref" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "channel_configs_tenant_channel_key" UNIQUE ("tenant_id", "channel_name")
);

-- ── Double-entry ledger ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "journal_id" uuid NOT NULL,
  "account_code" text NOT NULL,
  "debit_amount" text NOT NULL DEFAULT '0',
  "credit_amount" text NOT NULL DEFAULT '0',
  "currency" text NOT NULL,
  "description" text NOT NULL,
  "reference_type" text,
  "reference_id" uuid,
  "posted_at" timestamptz NOT NULL,
  "period_year" text NOT NULL,
  "period_month" text NOT NULL,
  "created_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ledger_entries_tenant_journal_idx" ON "ledger_entries"("tenant_id", "journal_id");
CREATE INDEX IF NOT EXISTS "ledger_entries_tenant_account_idx" ON "ledger_entries"("tenant_id", "account_code");
CREATE INDEX IF NOT EXISTS "ledger_entries_posted_at_idx" ON "ledger_entries"("posted_at");

-- Prevent updates to ledger entries (immutability enforced at DB level)
CREATE OR REPLACE RULE ledger_no_update AS
  ON UPDATE TO "ledger_entries" DO INSTEAD NOTHING;

CREATE OR REPLACE RULE ledger_no_delete AS
  ON DELETE TO "ledger_entries" DO INSTEAD NOTHING;

-- ── Audit log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "actor_identity_id" uuid,
  "actor_type" text NOT NULL,
  "channel" text,
  "action" text NOT NULL,
  "resource_type" text,
  "resource_id" uuid,
  "capability" text,
  "before" jsonb,
  "after" jsonb,
  "ai_reasoning_trace" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "audit_log_tenant_id_idx" ON "audit_log"("tenant_id");
CREATE INDEX IF NOT EXISTS "audit_log_actor_idx" ON "audit_log"("actor_identity_id");
CREATE INDEX IF NOT EXISTS "audit_log_resource_idx" ON "audit_log"("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log"("created_at");

-- Audit log is append-only
CREATE OR REPLACE RULE audit_log_no_update AS
  ON UPDATE TO "audit_log" DO INSTEAD NOTHING;

CREATE OR REPLACE RULE audit_log_no_delete AS
  ON DELETE TO "audit_log" DO INSTEAD NOTHING;

-- ── Magic links ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "magic_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "token" text NOT NULL,
  "identity_id" uuid NOT NULL,
  "resource_type" text NOT NULL,
  "resource_id" uuid,
  "action" text NOT NULL,
  "used_at" timestamptz,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "magic_links_token_key" UNIQUE ("token")
);
CREATE INDEX IF NOT EXISTS "magic_links_expires_at_idx" ON "magic_links"("expires_at");

-- Enable Row Level Security on all tenant-scoped tables
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "config_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "entity_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "entity_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_definitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "channel_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "magic_links" ENABLE ROW LEVEL SECURITY;
