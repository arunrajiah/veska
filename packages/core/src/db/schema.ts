import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
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
  currentConfigId: uuid('currentConfigId'),
  timezone: text('timezone').notNull().default('UTC'),
  defaultCurrency: text('defaultCurrency').notNull().default('USD'),
  fiscalYearStart: text('fiscalYearStart').notNull().default('01-01'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deletedAt', { withTimezone: true }),
}, (t) => [
  unique('tenantsSlugKey').on(t.slug),
]);

// ──────────────────────────────────────────────────────────────
// Configuration versioning
// ──────────────────────────────────────────────────────────────

export const configVersions = pgTable('configVersions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  config: jsonb('config').notNull(),
  appliedBy: uuid('appliedBy'),
  naturalLanguageRequest: text('naturalLanguageRequest'),
  diff: jsonb('diff'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('configVersionsTenantIdIdx').on(t.tenantId),
]);

// ──────────────────────────────────────────────────────────────
// Entity definitions (schema-as-data)
// ──────────────────────────────────────────────────────────────

export const entityDefinitions = pgTable('entityDefinitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  pluralName: text('pluralName').notNull(),
  label: text('label').notNull(),
  pluralLabel: text('pluralLabel').notNull(),
  description: text('description'),
  fields: jsonb('fields').notNull().default(sql`'[]'::jsonb`),
  isSystem: boolean('isSystem').notNull().default(false),
  icon: text('icon'),
  aiDescription: text('aiDescription'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('entityDefinitionsTenantNameKey').on(t.tenantId, t.name),
  index('entityDefinitionsTenantIdIdx').on(t.tenantId),
]);

// ──────────────────────────────────────────────────────────────
// Entity records (dynamic rows for all entity types)
// Using JSONB for flexible field storage; strong indexes on common lookups
// ──────────────────────────────────────────────────────────────

export const entityRecords = pgTable('entityRecords', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  entityType: text('entityType').notNull(),
  data: jsonb('data').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('createdBy'),
  deletedAt: timestamp('deletedAt', { withTimezone: true }),
}, (t) => [
  index('entityRecordsTenantTypeIdx').on(t.tenantId, t.entityType),
  index('entityRecordsTenantIdIdx').on(t.tenantId),
  // GIN index for JSONB field queries
  index('entityRecordsDataGinIdx').using('gin', t.data),
]);

// ──────────────────────────────────────────────────────────────
// Workflow definitions
// ──────────────────────────────────────────────────────────────

export const workflowDefinitions = pgTable('workflowDefinitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  trigger: jsonb('trigger').notNull(),
  steps: jsonb('steps').notNull(),
  entryStep: text('entryStep').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  isSystem: boolean('isSystem').notNull().default(false),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('workflowDefinitionsTenantIdIdx').on(t.tenantId),
]);

// ──────────────────────────────────────────────────────────────
// Workflow runs
// ──────────────────────────────────────────────────────────────

export const workflowRuns = pgTable('workflowRuns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  workflowId: uuid('workflowId').notNull().references(() => workflowDefinitions.id),
  status: text('status').notNull().default('pending'),
  currentStep: text('currentStep'),
  context: jsonb('context').notNull().default(sql`'{}'::jsonb`),
  startedAt: timestamp('startedAt', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completedAt', { withTimezone: true }),
  error: text('error'),
}, (t) => [
  index('workflowRunsTenantWorkflowIdx').on(t.tenantId, t.workflowId),
  index('workflowRunsStatusIdx').on(t.status),
]);

// ──────────────────────────────────────────────────────────────
// Roles
// ──────────────────────────────────────────────────────────────

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  capabilities: jsonb('capabilities').notNull().default(sql`'[]'::jsonb`),
  isSystem: boolean('isSystem').notNull().default(false),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('rolesTenantNameKey').on(t.tenantId, t.name),
]);

// ──────────────────────────────────────────────────────────────
// Identities
// ──────────────────────────────────────────────────────────────

export const identities = pgTable('identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  channelIds: jsonb('channelIds').notNull().default(sql`'{}'::jsonb`),
  roleIds: jsonb('roleIds').notNull().default(sql`'[]'::jsonb`),
  additionalCapabilities: jsonb('additionalCapabilities').notNull().default(sql`'[]'::jsonb`),
  deniedCapabilities: jsonb('deniedCapabilities').notNull().default(sql`'[]'::jsonb`),
  entityId: uuid('entityId'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('identitiesTenantIdIdx').on(t.tenantId),
]);

// ──────────────────────────────────────────────────────────────
// Channel configurations
// ──────────────────────────────────────────────────────────────

export const channelConfigs = pgTable('channelConfigs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  channelName: text('channelName').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  credentialsRef: text('credentialsRef').notNull(),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('channelConfigsTenantChannelKey').on(t.tenantId, t.channelName),
]);

// ──────────────────────────────────────────────────────────────
// Double-entry ledger — immutable journal entries
// ──────────────────────────────────────────────────────────────

export const ledgerEntries = pgTable('ledgerEntries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  journalId: uuid('journalId').notNull(),
  accountCode: text('accountCode').notNull(),
  // Debit amount in the smallest currency unit (cents)
  debitAmount: text('debitAmount').notNull().default('0'),
  // Credit amount in the smallest currency unit (cents)
  creditAmount: text('creditAmount').notNull().default('0'),
  currency: text('currency').notNull(),
  description: text('description').notNull(),
  referenceType: text('referenceType'),
  referenceId: uuid('referenceId'),
  postedAt: timestamp('postedAt', { withTimezone: true }).notNull(),
  periodYear: text('periodYear').notNull(),
  periodMonth: text('periodMonth').notNull(),
  createdBy: uuid('createdBy'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  // No updatedAt — ledger entries are immutable
}, (t) => [
  index('ledgerEntriesTenantJournalIdx').on(t.tenantId, t.journalId),
  index('ledgerEntriesTenantAccountIdx').on(t.tenantId, t.accountCode),
  index('ledgerEntriesPostedAtIdx').on(t.postedAt),
]);

// ──────────────────────────────────────────────────────────────
// Audit log — append-only, covers all state changes + AI reasoning
// ──────────────────────────────────────────────────────────────

export const auditLog = pgTable('auditLog', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  actorIdentityId: uuid('actorIdentityId'),
  actorType: text('actorType').notNull(),
  channel: text('channel'),
  action: text('action').notNull(),
  resourceType: text('resourceType'),
  resourceId: uuid('resourceId'),
  capability: text('capability'),
  before: jsonb('before'),
  after: jsonb('after'),
  // AI reasoning trace for LLM-driven actions
  aiReasoningTrace: text('aiReasoningTrace'),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('auditLogTenantIdIdx').on(t.tenantId),
  index('auditLogActorIdx').on(t.actorIdentityId),
  index('auditLogResourceIdx').on(t.resourceType, t.resourceId),
  index('auditLogCreatedAtIdx').on(t.createdAt),
]);

// ──────────────────────────────────────────────────────────────
// Integration instances (per-tenant configured integrations)
// ──────────────────────────────────────────────────────────────

export const integrationInstances = pgTable('integrationInstances', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  config: jsonb('config').notNull().default(sql`'{}'::jsonb`),
  lastSyncedAt: timestamp('lastSyncedAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('integrationInstancesTenantNameKey').on(t.tenantId, t.name),
  index('integrationInstancesTenantIdIdx').on(t.tenantId),
]);

// ──────────────────────────────────────────────────────────────
// Webhook subscriptions — outbound event delivery
// ──────────────────────────────────────────────────────────────

export const webhookSubscriptions = pgTable('webhookSubscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  events: text('events').array().notNull().default([]),
  secret: text('secret').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('webhookSubscriptionsTenantIdIdx').on(t.tenantId),
]);

// ──────────────────────────────────────────────────────────────
// API keys — programmatic access for CI/CD and integrations
// ──────────────────────────────────────────────────────────────

export const apiKeys = pgTable('apiKeys', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyHash: text('keyHash').notNull().unique(),
  keyPrefix: text('keyPrefix').notNull(),
  lastUsedAt: timestamp('lastUsedAt', { withTimezone: true }),
  expiresAt: timestamp('expiresAt', { withTimezone: true }),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('apiKeysTenantIdIdx').on(t.tenantId),
  index('apiKeysKeyHashIdx').on(t.keyHash),
]);

// ──────────────────────────────────────────────────────────────
// Notifications — in-app notification inbox
// ──────────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body'),
  type: text('type').notNull().default('info'),
  link: text('link'),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('notificationsTenantReadIdx').on(t.tenantId, t.read),
  index('notificationsTenantCreatedAtIdx').on(t.tenantId, t.createdAt),
]);

// ──────────────────────────────────────────────────────────────
// Magic links
// ──────────────────────────────────────────────────────────────

export const magicLinks = pgTable('magicLinks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  identityId: uuid('identityId').notNull(),
  resourceType: text('resourceType').notNull(),
  resourceId: uuid('resourceId'),
  action: text('action').notNull(),
  usedAt: timestamp('usedAt', { withTimezone: true }),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('magicLinksTokenKey').on(t.token),
  index('magicLinksExpiresAtIdx').on(t.expiresAt),
]);

// ──────────────────────────────────────────────────────────────
// AI Usage Logs — tracks token usage per LLM call
// ──────────────────────────────────────────────────────────────

export const aiUsageLogs = pgTable('aiUsageLogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull(),
  userId: text('userId'),
  sessionId: text('sessionId'),
  feature: text('feature').notNull(),
  model: text('model').notNull(),
  promptTokens: integer('promptTokens').notNull().default(0),
  completionTokens: integer('completionTokens').notNull().default(0),
  totalTokens: integer('totalTokens').notNull().default(0),
  durationMs: integer('durationMs'),
  toolsUsed: jsonb('toolsUsed').notNull().default(sql`'[]'::jsonb`),
  requestSummary: text('requestSummary'),
  isLocal: boolean('isLocal').notNull().default(false),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('aiUsageLogs_tenantId_idx').on(t.tenantId),
  index('aiUsageLogs_createdAt_idx').on(t.createdAt),
  index('aiUsageLogs_feature_idx').on(t.feature),
]);

// ──────────────────────────────────────────────────────────────
// Recurring Invoice Schedules
// ──────────────────────────────────────────────────────────────

export const recurringInvoiceSchedules = pgTable('recurringInvoiceSchedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  templateInvoiceId: uuid('templateInvoiceId').notNull(),
  frequency: text('frequency').notNull(), // weekly | monthly | quarterly | yearly
  nextRunAt: timestamp('nextRunAt', { withTimezone: true }).notNull(),
  lastRunAt: timestamp('lastRunAt', { withTimezone: true }),
  dayOfMonth: integer('dayOfMonth'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('recurringTenantIdx').on(t.tenantId),
]);

// ──────────────────────────────────────────────────────────────
// Approval Triggers — links entity records to approval flows
// ──────────────────────────────────────────────────────────────

export const approvalTriggers = pgTable('approvalTriggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenantId').notNull(),
  entityType: text('entityType').notNull(),
  entityId: uuid('entityId').notNull(),
  chainId: uuid('chainId'),
  requestedBy: text('requestedBy').notNull(),
  status: text('status').notNull().default('pending'),
  currentStep: integer('currentStep').notNull().default(0),
  approvers: jsonb('approvers').notNull().default(sql`'[]'::jsonb`),
  approvedBy: text('approvedBy'),
  rejectedBy: text('rejectedBy'),
  rejectionReason: text('rejectionReason'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('approvalTriggers_tenantId_idx').on(t.tenantId),
  index('approvalTriggers_entityId_idx').on(t.entityId),
  index('approvalTriggers_status_idx').on(t.status),
]);
