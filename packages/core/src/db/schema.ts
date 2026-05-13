import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ──────────────────────────────────────────────────────────────
// Tenants
// ──────────────────────────────────────────────────────────────

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  currentConfigId: uuid('current_config_id'),
  timezone: text('timezone').notNull().default('UTC'),
  defaultCurrency: text('default_currency').notNull().default('USD'),
  fiscalYearStart: text('fiscal_year_start').notNull().default('01-01'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  unique('tenants_slug_key').on(t.slug),
]);

// ──────────────────────────────────────────────────────────────
// Configuration versioning
// ──────────────────────────────────────────────────────────────

export const configVersions = pgTable('config_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  config: jsonb('config').notNull(),
  appliedBy: uuid('applied_by'),
  naturalLanguageRequest: text('natural_language_request'),
  diff: jsonb('diff'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('config_versions_tenant_id_idx').on(t.tenantId),
]);

// ──────────────────────────────────────────────────────────────
// Entity definitions (schema-as-data)
// ──────────────────────────────────────────────────────────────

export const entityDefinitions = pgTable('entity_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  pluralName: text('plural_name').notNull(),
  label: text('label').notNull(),
  pluralLabel: text('plural_label').notNull(),
  description: text('description'),
  fields: jsonb('fields').notNull().default(sql`'[]'::jsonb`),
  isSystem: boolean('is_system').notNull().default(false),
  icon: text('icon'),
  aiDescription: text('ai_description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('entity_definitions_tenant_name_key').on(t.tenantId, t.name),
  index('entity_definitions_tenant_id_idx').on(t.tenantId),
]);

// ──────────────────────────────────────────────────────────────
// Entity records (dynamic rows for all entity types)
// Using JSONB for flexible field storage; strong indexes on common lookups
// ──────────────────────────────────────────────────────────────

export const entityRecords = pgTable('entity_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  data: jsonb('data').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('entity_records_tenant_type_idx').on(t.tenantId, t.entityType),
  index('entity_records_tenant_id_idx').on(t.tenantId),
  // GIN index for JSONB field queries
  index('entity_records_data_gin_idx').using('gin', t.data),
]);

// ──────────────────────────────────────────────────────────────
// Workflow definitions
// ──────────────────────────────────────────────────────────────

export const workflowDefinitions = pgTable('workflow_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  trigger: jsonb('trigger').notNull(),
  steps: jsonb('steps').notNull(),
  entryStep: text('entry_step').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('workflow_definitions_tenant_id_idx').on(t.tenantId),
]);

// ──────────────────────────────────────────────────────────────
// Workflow runs
// ──────────────────────────────────────────────────────────────

export const workflowRuns = pgTable('workflow_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflow_id').notNull().references(() => workflowDefinitions.id),
  status: text('status').notNull().default('pending'),
  currentStep: text('current_step'),
  context: jsonb('context').notNull().default(sql`'{}'::jsonb`),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  error: text('error'),
}, (t) => [
  index('workflow_runs_tenant_workflow_idx').on(t.tenantId, t.workflowId),
  index('workflow_runs_status_idx').on(t.status),
]);

// ──────────────────────────────────────────────────────────────
// Roles
// ──────────────────────────────────────────────────────────────

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  capabilities: jsonb('capabilities').notNull().default(sql`'[]'::jsonb`),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('roles_tenant_name_key').on(t.tenantId, t.name),
]);

// ──────────────────────────────────────────────────────────────
// Identities
// ──────────────────────────────────────────────────────────────

export const identities = pgTable('identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  channelIds: jsonb('channel_ids').notNull().default(sql`'{}'::jsonb`),
  roleIds: jsonb('role_ids').notNull().default(sql`'[]'::jsonb`),
  additionalCapabilities: jsonb('additional_capabilities').notNull().default(sql`'[]'::jsonb`),
  deniedCapabilities: jsonb('denied_capabilities').notNull().default(sql`'[]'::jsonb`),
  entityId: uuid('entity_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('identities_tenant_id_idx').on(t.tenantId),
]);

// ──────────────────────────────────────────────────────────────
// Channel configurations
// ──────────────────────────────────────────────────────────────

export const channelConfigs = pgTable('channel_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  channelName: text('channel_name').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  credentialsRef: text('credentials_ref').notNull(),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('channel_configs_tenant_channel_key').on(t.tenantId, t.channelName),
]);

// ──────────────────────────────────────────────────────────────
// Double-entry ledger — immutable journal entries
// ──────────────────────────────────────────────────────────────

export const ledgerEntries = pgTable('ledger_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  journalId: uuid('journal_id').notNull(),
  accountCode: text('account_code').notNull(),
  // Debit amount in the smallest currency unit (cents)
  debitAmount: text('debit_amount').notNull().default('0'),
  // Credit amount in the smallest currency unit (cents)
  creditAmount: text('credit_amount').notNull().default('0'),
  currency: text('currency').notNull(),
  description: text('description').notNull(),
  referenceType: text('reference_type'),
  referenceId: uuid('reference_id'),
  postedAt: timestamp('posted_at', { withTimezone: true }).notNull(),
  periodYear: text('period_year').notNull(),
  periodMonth: text('period_month').notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // No updatedAt — ledger entries are immutable
}, (t) => [
  index('ledger_entries_tenant_journal_idx').on(t.tenantId, t.journalId),
  index('ledger_entries_tenant_account_idx').on(t.tenantId, t.accountCode),
  index('ledger_entries_posted_at_idx').on(t.postedAt),
]);

// ──────────────────────────────────────────────────────────────
// Audit log — append-only, covers all state changes + AI reasoning
// ──────────────────────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  actorIdentityId: uuid('actor_identity_id'),
  actorType: text('actor_type').notNull(),
  channel: text('channel'),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: uuid('resource_id'),
  capability: text('capability'),
  before: jsonb('before'),
  after: jsonb('after'),
  // AI reasoning trace for LLM-driven actions
  aiReasoningTrace: text('ai_reasoning_trace'),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('audit_log_tenant_id_idx').on(t.tenantId),
  index('audit_log_actor_idx').on(t.actorIdentityId),
  index('audit_log_resource_idx').on(t.resourceType, t.resourceId),
  index('audit_log_created_at_idx').on(t.createdAt),
]);

// ──────────────────────────────────────────────────────────────
// Integration instances (per-tenant configured integrations)
// ──────────────────────────────────────────────────────────────

export const integrationInstances = pgTable('integration_instances', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  config: jsonb('config').notNull().default(sql`'{}'::jsonb`),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('integration_instances_tenant_name_key').on(t.tenantId, t.name),
  index('integration_instances_tenant_id_idx').on(t.tenantId),
]);

// ──────────────────────────────────────────────────────────────
// Webhook subscriptions — outbound event delivery
// ──────────────────────────────────────────────────────────────

export const webhookSubscriptions = pgTable('webhook_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  events: text('events').array().notNull().default([]),
  secret: text('secret').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('webhook_subscriptions_tenant_id_idx').on(t.tenantId),
]);

// ──────────────────────────────────────────────────────────────
// API keys — programmatic access for CI/CD and integrations
// ──────────────────────────────────────────────────────────────

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('api_keys_tenant_id_idx').on(t.tenantId),
  index('api_keys_key_hash_idx').on(t.keyHash),
]);

// ──────────────────────────────────────────────────────────────
// Magic links
// ──────────────────────────────────────────────────────────────

export const magicLinks = pgTable('magic_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  identityId: uuid('identity_id').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: uuid('resource_id'),
  action: text('action').notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('magic_links_token_key').on(t.token),
  index('magic_links_expires_at_idx').on(t.expiresAt),
]);
