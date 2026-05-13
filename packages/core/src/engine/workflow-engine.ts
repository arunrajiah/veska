import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';
import type { QueueService } from '../queue/queue.service.js';
import type { AuditService } from '../services/audit.service.js';
import type { LLMProvider } from '../ai/provider.js';
import { ActionAgent } from '../ai/action-agent.js';
import type { WorkflowStep } from '../primitives/workflow.js';
import type { IncomingMessage } from '../primitives/channel.js';
import type { MagicLinkService } from '../services/magic-link.service.js';
import type { Identity } from '../primitives/permission.js';

// ──────────────────────────────────────────────────────────────
// Template rendering helper — replaces {{key}} tokens from context
// ──────────────────────────────────────────────────────────────

function renderTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
    const trimmed = key.trim();
    const value = context[trimmed];
    return value !== undefined ? String(value) : `{{${trimmed}}}`;
  });
}

// ──────────────────────────────────────────────────────────────
// WorkflowEngine
// ──────────────────────────────────────────────────────────────

export class WorkflowEngine {
  constructor(
    private db: Database,
    private queueService: QueueService,
    private auditService: AuditService,
    private llm?: LLMProvider,
    private magicLinkService?: MagicLinkService,
  ) {}

  // ── executeStep ──────────────────────────────────────────────

  async executeStep(params: {
    tenantId: string;
    workflowRunId: string;
    stepId: string;
  }): Promise<void> {
    const { tenantId, workflowRunId, stepId } = params;

    // 1. Load the workflow run
    const run = await this.db.query.workflowRuns.findFirst({
      where: and(
        eq(schema.workflowRuns.id, workflowRunId),
        eq(schema.workflowRuns.tenantId, tenantId),
      ),
    });

    if (!run || run.status !== 'running') {
      return;
    }

    // 2. Load the workflow definition
    const definition = await this.db.query.workflowDefinitions.findFirst({
      where: and(
        eq(schema.workflowDefinitions.id, run.workflowId),
        eq(schema.workflowDefinitions.tenantId, tenantId),
      ),
    });

    if (!definition) {
      await this.markRunFailed(workflowRunId, 'Workflow definition not found');
      return;
    }

    // 3. Find the step by stepId (steps stored as JSONB)
    const steps = definition.steps as WorkflowStep[];
    const step = steps.find((s) => s.id === stepId);

    if (!step) {
      await this.markRunFailed(workflowRunId, `Step "${stepId}" not found in workflow definition`);
      return;
    }

    // 4. Update run: currentStep + status = running
    await this.db
      .update(schema.workflowRuns)
      .set({ currentStep: stepId, status: 'running' })
      .where(eq(schema.workflowRuns.id, workflowRunId));

    const context = (run.context ?? {}) as Record<string, unknown>;

    // 5. Execute the action
    try {
      const action = step.action;

      switch (action.type) {
        case 'send_message': {
          await this.queueService.enqueue('channel.send_message', {
            tenantId,
            channelName: action.channel,
            recipientChannelId: action.recipient,
            message: {
              text: renderTemplate(action.template, context),
            },
          });
          break;
        }

        case 'create_entity': {
          const [created] = await this.db
            .insert(schema.entityRecords)
            .values({
              tenantId,
              entityType: action.entityType,
              data: action.data,
            })
            .returning();

          if (created) {
            // Store new record's id in context as ${entityType}_id
            const newContext = { ...context, [`${action.entityType}_id`]: created.id };
            await this.db
              .update(schema.workflowRuns)
              .set({ context: newContext })
              .where(eq(schema.workflowRuns.id, workflowRunId));
            context[`${action.entityType}_id`] = created.id;
          }
          break;
        }

        case 'update_entity': {
          // Look up the actual UUID from context
          const entityId = context[action.entityId] as string | undefined;
          if (!entityId) {
            throw new Error(`Entity ID for key "${action.entityId}" not found in run context`);
          }
          await this.db
            .update(schema.entityRecords)
            .set({ data: action.data, updatedAt: new Date() })
            .where(
              and(
                eq(schema.entityRecords.id, entityId),
                eq(schema.entityRecords.tenantId, tenantId),
              ),
            );
          break;
        }

        case 'require_approval': {
          // Set run to awaiting_approval
          await this.db
            .update(schema.workflowRuns)
            .set({ status: 'awaiting_approval' })
            .where(eq(schema.workflowRuns.id, workflowRunId));

          // Notify each approver
          for (const approver of action.approvers) {
            const approvalText = [
              `Approval required: ${action.title}`,
              action.description ? action.description : null,
              `Run ID: ${workflowRunId}`,
            ]
              .filter(Boolean)
              .join('\n');

            await this.queueService.enqueue('channel.send_message', {
              tenantId,
              channelName: 'default',
              recipientChannelId: approver,
              message: { text: approvalText },
            });
          }

          // Do not advance — return early
          return;
        }

        case 'wait': {
          if (!step.onSuccess) {
            // Nothing to advance to after wait; complete the run
            break;
          }
          await this.queueService.enqueue(
            'workflow.execute_step',
            {
              tenantId,
              workflowRunId,
              stepId: step.onSuccess,
            },
            { delay: action.durationMs },
          );
          return;
        }

        case 'run_agent': {
          if (this.llm) {
            // Build a synthetic IncomingMessage to pass to the ActionAgent
            const syntheticMessage: IncomingMessage = {
              id: randomUUID(),
              tenantId,
              channelName: 'workflow',
              channelMessageId: randomUUID(),
              senderChannelId: 'workflow-engine',
              text: JSON.stringify(action.input ?? {}),
              attachments: [],
              receivedAt: new Date(),
              raw: { workflowRunId, stepId, action },
            };

            // ActionAgent requires MagicLinkService — construct a minimal identity
            if (!this.magicLinkService) {
              console.warn(
                `[WorkflowEngine] run_agent step "${stepId}": MagicLinkService not provided, skipping agent.`,
              );
              break;
            }

            const agent = new ActionAgent(
              this.db,
              this.llm,
              this.auditService,
              this.magicLinkService,
            );

            // Resolve a system identity for the agent
            const now = new Date();
            const systemIdentity: Identity = {
              id: randomUUID(),
              tenantId,
              type: 'agent',
              channelIds: {},
              roleIds: [],
              additionalCapabilities: [],
              deniedCapabilities: [],
              entityId: undefined,
              createdAt: now,
              updatedAt: now,
            };

            await agent.process(syntheticMessage, systemIdentity);
          } else {
            console.warn(
              `[WorkflowEngine] run_agent step "${stepId}": no LLMProvider configured, treating as success.`,
            );
          }
          break;
        }

        case 'call_integration': {
          console.log(
            `[WorkflowEngine] call_integration step "${stepId}": integration calls not yet implemented (integrationId=${action.integrationId}, method=${action.method}). Skipping.`,
          );
          break;
        }

        default: {
          // Exhaustive check — TypeScript will catch unhandled cases at compile time
          const _exhaustive: never = action;
          throw new Error(`Unknown action type: ${(_exhaustive as { type: string }).type}`);
        }
      }

      // 6. On success: audit + advance
      await this.auditService.log({
        tenantId,
        actorType: 'system',
        action: 'workflow.step.completed',
        resourceType: 'WorkflowRun',
        resourceId: workflowRunId,
        metadata: { stepId, workflowId: run.workflowId },
      });

      if (step.onSuccess) {
        await this.queueService.enqueue('workflow.execute_step', {
          tenantId,
          workflowRunId,
          stepId: step.onSuccess,
        });
      } else {
        // No next step — complete the run
        await this.db
          .update(schema.workflowRuns)
          .set({ status: 'completed', completedAt: new Date() })
          .where(eq(schema.workflowRuns.id, workflowRunId));

        await this.auditService.log({
          tenantId,
          actorType: 'system',
          action: 'workflow.run.completed',
          resourceType: 'WorkflowRun',
          resourceId: workflowRunId,
          metadata: { workflowId: run.workflowId, finalStep: stepId },
        });
      }
    } catch (err: unknown) {
      // 7. On failure: audit + advance or mark failed
      const errMessage = err instanceof Error ? err.message : String(err);

      await this.auditService.log({
        tenantId,
        actorType: 'system',
        action: 'workflow.step.failed',
        resourceType: 'WorkflowRun',
        resourceId: workflowRunId,
        metadata: { stepId, error: errMessage, workflowId: run.workflowId },
      });

      if (step.onFailure) {
        // Mark running again before enqueuing the failure handler
        await this.db
          .update(schema.workflowRuns)
          .set({ status: 'running' })
          .where(eq(schema.workflowRuns.id, workflowRunId));

        await this.queueService.enqueue('workflow.execute_step', {
          tenantId,
          workflowRunId,
          stepId: step.onFailure,
        });
      } else {
        await this.markRunFailed(workflowRunId, errMessage);
      }
    }
  }

  // ── triggerWorkflow ──────────────────────────────────────────

  async triggerWorkflow(params: {
    tenantId: string;
    workflowName: string;
    context: Record<string, unknown>;
  }): Promise<{ runId: string }> {
    const { tenantId, workflowName, context } = params;

    // Find the workflow definition by tenantId + name
    const definition = await this.db.query.workflowDefinitions.findFirst({
      where: and(
        eq(schema.workflowDefinitions.tenantId, tenantId),
        eq(schema.workflowDefinitions.name, workflowName),
        eq(schema.workflowDefinitions.enabled, true),
      ),
    });

    if (!definition) {
      throw new Error(`Workflow "${workflowName}" not found for tenant ${tenantId}`);
    }

    // Create a workflow run record
    const [run] = await this.db
      .insert(schema.workflowRuns)
      .values({
        tenantId,
        workflowId: definition.id,
        status: 'running',
        currentStep: definition.entryStep,
        context,
      })
      .returning();

    if (!run) {
      throw new Error('Failed to create workflow run');
    }

    // Enqueue the first step
    await this.queueService.enqueue('workflow.execute_step', {
      tenantId,
      workflowRunId: run.id,
      stepId: definition.entryStep,
    });

    return { runId: run.id };
  }

  // ── approveStep ──────────────────────────────────────────────

  async approveStep(params: {
    tenantId: string;
    workflowRunId: string;
    approved: boolean;
  }): Promise<void> {
    const { tenantId, workflowRunId, approved } = params;

    const run = await this.db.query.workflowRuns.findFirst({
      where: and(
        eq(schema.workflowRuns.id, workflowRunId),
        eq(schema.workflowRuns.tenantId, tenantId),
      ),
    });

    if (!run) {
      throw new Error(`Workflow run ${workflowRunId} not found`);
    }

    if (run.status !== 'awaiting_approval') {
      throw new Error(
        `Workflow run ${workflowRunId} is not awaiting approval (current status: ${run.status})`,
      );
    }

    const definition = await this.db.query.workflowDefinitions.findFirst({
      where: eq(schema.workflowDefinitions.id, run.workflowId),
    });

    if (!definition) {
      throw new Error(`Workflow definition not found for run ${workflowRunId}`);
    }

    const steps = definition.steps as WorkflowStep[];
    const step = steps.find((s) => s.id === run.currentStep);

    if (!step) {
      throw new Error(`Current step "${run.currentStep}" not found in workflow definition`);
    }

    if (approved) {
      if (step.onApproved) {
        await this.db
          .update(schema.workflowRuns)
          .set({ status: 'running' })
          .where(eq(schema.workflowRuns.id, workflowRunId));

        await this.queueService.enqueue('workflow.execute_step', {
          tenantId,
          workflowRunId,
          stepId: step.onApproved,
        });
      } else {
        // Approved but no next step — complete the run
        await this.db
          .update(schema.workflowRuns)
          .set({ status: 'completed', completedAt: new Date() })
          .where(eq(schema.workflowRuns.id, workflowRunId));

        await this.auditService.log({
          tenantId,
          actorType: 'system',
          action: 'workflow.run.completed',
          resourceType: 'WorkflowRun',
          resourceId: workflowRunId,
          metadata: { workflowId: run.workflowId, approvedAt: new Date().toISOString() },
        });
      }
    } else {
      // Rejected
      if (step.onRejected) {
        await this.db
          .update(schema.workflowRuns)
          .set({ status: 'running' })
          .where(eq(schema.workflowRuns.id, workflowRunId));

        await this.queueService.enqueue('workflow.execute_step', {
          tenantId,
          workflowRunId,
          stepId: step.onRejected,
        });
      } else {
        await this.markRunFailed(workflowRunId, 'Approval rejected and no onRejected handler defined');
      }
    }
  }

  // ── Private helpers ──────────────────────────────────────────

  private async markRunFailed(workflowRunId: string, errorMessage: string): Promise<void> {
    await this.db
      .update(schema.workflowRuns)
      .set({ status: 'failed', error: errorMessage })
      .where(eq(schema.workflowRuns.id, workflowRunId));
  }
}
