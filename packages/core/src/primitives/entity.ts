import { z } from 'zod';

// ──────────────────────────────────────────────────────────────
// Field type definitions
// ──────────────────────────────────────────────────────────────

export const FieldType = z.enum([
  'text',
  'number',
  'money',
  'date',
  'datetime',
  'boolean',
  'reference',
  'enum',
  'json',
  'file',
  'email',
  'phone',
  'url',
]);
export type FieldType = z.infer<typeof FieldType>;

export const FieldDefinitionSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z][a-z0-9_]*$/),
  type: FieldType,
  label: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  indexed: z.boolean().default(false),
  defaultValue: z.unknown().optional(),
  // For reference fields
  referenceTo: z.string().optional(),
  // For enum fields
  enumValues: z.array(z.string()).optional(),
  // For money fields
  currencyField: z.string().optional(),
  // For number/money fields
  precision: z.number().int().min(0).max(20).optional(),
  // Channel rendering hints — how to display this field in chat
  channelHint: z.enum(['short', 'long', 'hidden', 'currency', 'percentage']).optional(),
  // AI description so the LLM understands the semantic meaning of this field
  aiDescription: z.string().max(1024).optional(),
});
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;

// ──────────────────────────────────────────────────────────────
// Entity definition
// ──────────────────────────────────────────────────────────────

export const EntityDefinitionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(64).regex(/^[A-Z][a-zA-Z0-9]*$/),
  pluralName: z.string().min(1).max(64),
  label: z.string().min(1).max(128),
  pluralLabel: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  fields: z.array(FieldDefinitionSchema),
  // System entities cannot be deleted or have their built-in fields removed
  isSystem: z.boolean().default(false),
  // Icon name from the icon library (used in admin UI)
  icon: z.string().optional(),
  // AI description for the config and action agents
  aiDescription: z.string().max(2048).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type EntityDefinition = z.infer<typeof EntityDefinitionSchema>;

// ──────────────────────────────────────────────────────────────
// Runtime entity record (a row in a dynamically-typed entity table)
// ──────────────────────────────────────────────────────────────

export const EntityRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  entityType: z.string(),
  data: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().optional(),
  deletedAt: z.date().optional(),
});
export type EntityRecord = z.infer<typeof EntityRecordSchema>;
