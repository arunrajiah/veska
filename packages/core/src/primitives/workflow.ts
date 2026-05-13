import { z } from 'zod';

// ──────────────────────────────────────────────────────────────
// Workflow trigger types
// ──────────────────────────────────────────────────────────────

export const TriggerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('entity.created'),
    entityType: z.string(),
    conditions: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
  z.object({
    type: z.literal('entity.updated'),
    entityType: z.string(),
    fieldChanged: z.string().optional(),
    conditions: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
  z.object({
    type: z.literal('entity.deleted'),
    entityType: z.string(),
  }),
  z.object({
    type: z.literal('schedule'),
    cron: z.string(),
    timezone: z.string().default('UTC'),
  }),
  z.object({
    type: z.literal('inbound_message'),
    channelName: z.string(),
    matchPattern: z.string().optional(),
  }),
  z.object({
    type: z.literal('manual'),
    label: z.string(),
  }),
]);
export type Trigger = z.infer<typeof TriggerSchema>;

// ──────────────────────────────────────────────────────────────
// Workflow action types
// ──────────────────────────────────────────────────────────────

export const ActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('send_message'),
    channel: z.string(),
    recipient: z.string(),
    template: z.string(),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    type: z.literal('create_entity'),
    entityType: z.string(),
    data: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal('update_entity'),
    entityId: z.string(),
    data: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal('require_approval'),
    approvers: z.array(z.string()),
    title: z.string(),
    description: z.string().optional(),
    timeoutHours: z.number().positive().optional(),
  }),
  z.object({
    type: z.literal('call_integration'),
    integrationId: z.string(),
    method: z.string(),
    params: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    type: z.literal('run_agent'),
    agentId: z.string(),
    input: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    type: z.literal('wait'),
    durationMs: z.number().positive(),
  }),
]);
export type Action = z.infer<typeof ActionSchema>;

// ──────────────────────────────────────────────────────────────
// Workflow step
// ──────────────────────────────────────────────────────────────

export const WorkflowStepSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1).max(128),
  action: ActionSchema,
  onSuccess: z.string().optional(),
  onFailure: z.string().optional(),
  onApproved: z.string().optional(),
  onRejected: z.string().optional(),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

// ──────────────────────────────────────────────────────────────
// Workflow definition
// ──────────────────────────────────────────────────────────────

export const WorkflowDefinitionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  trigger: TriggerSchema,
  steps: z.array(WorkflowStepSchema).min(1),
  entryStep: z.string(),
  enabled: z.boolean().default(true),
  isSystem: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

// ──────────────────────────────────────────────────────────────
// Workflow run (execution instance)
// ──────────────────────────────────────────────────────────────

export const WorkflowRunStatus = z.enum([
  'pending',
  'running',
  'awaiting_approval',
  'completed',
  'failed',
  'cancelled',
]);
export type WorkflowRunStatus = z.infer<typeof WorkflowRunStatus>;

export const WorkflowRunSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workflowId: z.string().uuid(),
  status: WorkflowRunStatus,
  currentStep: z.string().optional(),
  context: z.record(z.string(), z.unknown()),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  error: z.string().optional(),
});
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;
