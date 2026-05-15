import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { schema, WorkflowEngine } from '@veska/core';
import {
  sharedDb,
  sharedQueueService,
  sharedAuditService,
  sharedLlm,
  sharedMagicLinkService,
} from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { aiLimit } from '@veska-cloud/rate-limit';

// Construct the engine once at module level
const workflowEngine = new WorkflowEngine(
  sharedDb,
  sharedQueueService,
  sharedAuditService,
  sharedLlm,
  sharedMagicLinkService,
);

export const workflowsRouter = new Hono<{ Variables: TenantContext }>();

// ── Workflow definitions ───────────────────────────────────────

// GET / — list workflow definitions for tenant
workflowsRouter.get('/', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const definitions = await db.query.workflowDefinitions.findMany({
    where: and(
      eq(schema.workflowDefinitions.tenantId, tenantId),
      eq(schema.workflowDefinitions.enabled, true),
    ),
  });

  return c.json(definitions);
});

// POST / — create workflow definition
workflowsRouter.post(
  '/',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(128),
      description: z.string().max(1024).optional(),
      trigger: z.record(z.string(), z.unknown()),
      steps: z.array(z.record(z.string(), z.unknown())).min(1),
      entryStep: z.string().min(1),
      enabled: z.boolean().default(true),
      isSystem: z.boolean().default(false),
    }),
  ),
  async (c) => {
    const { db, tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [definition] = await db
      .insert(schema.workflowDefinitions)
      .values({
        tenantId,
        name: body.name,
        description: body.description,
        trigger: body.trigger,
        steps: body.steps,
        entryStep: body.entryStep,
        enabled: body.enabled,
        isSystem: body.isSystem,
      })
      .returning();

    if (!definition) {
      return c.json({ error: 'Failed to create workflow definition' }, 500);
    }

    return c.json(definition, 201);
  },
);

// ── Static routes (must come before /:id) ─────────────────────

// GET /templates — list workflow templates
workflowsRouter.get('/templates', async (c) => {
  try {
    const rows = await sharedDb.execute(
      sql`SELECT * FROM "workflowTemplates" ORDER BY category, name`,
    );
    const templates = rows.rows ?? (rows as unknown as unknown[]);

    if (Array.isArray(templates) && templates.length > 0) {
      return c.json(templates);
    }

    // DB is empty — return hardcoded built-in templates
    return c.json([
      {
        id: 'tpl-1',
        name: 'Invoice Overdue Reminder',
        category: 'finance',
        description: 'Send email reminder when invoice is 7+ days overdue',
        config: {
          trigger: { type: 'schedule', cron: '0 9 * * *' },
          conditions: [{ field: 'daysOverdue', op: 'gte', value: 7 }],
          actions: [{ type: 'send_email', template: 'invoice_reminder' }],
        },
      },
      {
        id: 'tpl-2',
        name: 'New Lead Auto-Assign',
        category: 'sales',
        description: 'Assign new CRM contacts to the team round-robin',
        config: {
          trigger: { type: 'entity_created', entityType: 'CRMContact' },
          conditions: [],
          actions: [{ type: 'assign_record', strategy: 'round_robin' }],
        },
      },
      {
        id: 'tpl-3',
        name: 'High Priority Ticket Escalation',
        category: 'support',
        description: 'Escalate tickets open >4h with priority=critical',
        config: {
          trigger: { type: 'schedule', cron: '0 * * * *' },
          conditions: [
            { field: 'priority', op: 'eq', value: 'critical' },
            { field: 'hoursOpen', op: 'gte', value: 4 },
          ],
          actions: [
            { type: 'send_notification', message: 'Critical ticket unresolved for 4+ hours' },
            { type: 'update_field', field: 'status', value: 'escalated' },
          ],
        },
      },
      {
        id: 'tpl-4',
        name: 'Contract Expiry Alert',
        category: 'finance',
        description: 'Notify team 30 days before contract expires',
        config: {
          trigger: { type: 'schedule', cron: '0 8 * * *' },
          conditions: [{ field: 'daysUntilExpiry', op: 'lte', value: 30 }],
          actions: [
            { type: 'send_notification', message: 'Contract expiring in 30 days' },
            { type: 'send_email', template: 'contract_expiry' },
          ],
        },
      },
      {
        id: 'tpl-5',
        name: 'Expense Auto-Approve',
        category: 'finance',
        description: 'Auto-approve expenses under $100',
        config: {
          trigger: { type: 'entity_created', entityType: 'Expense' },
          conditions: [{ field: 'amount', op: 'lt', value: 100 }],
          actions: [{ type: 'update_field', field: 'status', value: 'approved' }],
        },
      },
      {
        id: 'tpl-6',
        name: 'New Employee Onboarding',
        category: 'hr',
        description: 'Create onboarding tasks when a new employee is added',
        config: {
          trigger: { type: 'entity_created', entityType: 'Employee' },
          conditions: [],
          actions: [
            {
              type: 'create_record',
              entityType: 'Task',
              data: { title: 'Complete HR paperwork', assignTo: 'hr_team' },
            },
            { type: 'send_email', template: 'welcome_employee' },
          ],
        },
      },
      {
        id: 'tpl-7',
        name: 'Budget Overrun Alert',
        category: 'finance',
        description: 'Alert when a budget line item exceeds 90% utilization',
        config: {
          trigger: { type: 'schedule', cron: '0 18 * * *' },
          conditions: [{ field: 'utilizationPct', op: 'gte', value: 90 }],
          actions: [
            { type: 'send_notification', message: 'Budget line item at 90%+ utilization' },
          ],
        },
      },
      {
        id: 'tpl-8',
        name: 'Deal Won → Create Invoice',
        category: 'sales',
        description: 'Automatically create a draft invoice when a deal is marked Won',
        config: {
          trigger: {
            type: 'entity_updated',
            entityType: 'CRMDeal',
            field: 'status',
            value: 'won',
          },
          conditions: [],
          actions: [
            {
              type: 'create_record',
              entityType: 'Invoice',
              data: { status: 'draft', source: 'workflow' },
            },
          ],
        },
      },
    ]);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// POST /ai-suggest — generate a workflow config from a natural-language description
workflowsRouter.post('/ai-suggest', aiLimit(), async (c) => {
  let body: { description: string; context?: string };
  try {
    body = await c.req.json<{ description: string; context?: string }>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.description || typeof body.description !== 'string') {
    return c.json({ error: 'description is required' }, 400);
  }

  const systemPrompt =
    'You are a workflow automation expert for a business ERP. Given a business process description, generate a workflow configuration as JSON. Return ONLY valid JSON matching this schema: { name: string, description: string, trigger: { type: \'entity_created\'|\'entity_updated\'|\'schedule\'|\'webhook\'|\'manual\', entityType?: string, field?: string, value?: string, cron?: string }, conditions: Array<{ field: string, op: \'eq\'|\'ne\'|\'gt\'|\'gte\'|\'lt\'|\'lte\'|\'contains\', value: unknown }>, actions: Array<{ type: \'send_email\'|\'send_notification\'|\'update_field\'|\'create_record\'|\'call_webhook\'|\'ai_analysis\', [key: string]: unknown }> }';

  const userMessage =
    body.description + (body.context ? '\n\nContext: ' + body.context : '');

  let response: string;
  try {
    const completion = await sharedLlm.complete({
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 1024,
    });
    response = completion.content;
  } catch (error) {
    return c.json({ error }, 500);
  }

  try {
    const jsonText = response
      .trim()
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();
    const parsedWorkflow = JSON.parse(jsonText) as unknown;
    return c.json({ suggested: parsedWorkflow });
  } catch {
    return c.json({ error: 'Could not generate workflow', raw: response }, 422);
  }
});

// GET /:id — get single workflow with its recent runs
workflowsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const definition = await db.query.workflowDefinitions.findFirst({
    where: and(
      eq(schema.workflowDefinitions.id, id),
      eq(schema.workflowDefinitions.tenantId, tenantId),
    ),
  });

  if (!definition) {
    return c.json({ error: 'Workflow definition not found' }, 404);
  }

  const runs = await db.query.workflowRuns.findMany({
    where: and(
      eq(schema.workflowRuns.workflowId, id),
      eq(schema.workflowRuns.tenantId, tenantId),
    ),
  });

  return c.json({ ...definition, recentRuns: runs });
});

// GET /:id/runs — list run history with per-run step detail
workflowsRouter.get('/:id/runs', async (c) => {
  const id = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');

  try {
    // Verify workflow exists for this tenant
    const defRows = await sharedDb.execute(
      sql`SELECT id FROM workflow_definitions WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`,
    );
    const defs = defRows.rows ?? (defRows as unknown as unknown[]);
    if (!Array.isArray(defs) || defs.length === 0) {
      return c.json({ error: 'Workflow definition not found' }, 404);
    }

    // Fetch up to 50 most recent runs
    const runRows = await sharedDb.execute(
      sql`SELECT * FROM workflow_runs WHERE workflow_id = ${id} AND tenant_id = ${tenantId} ORDER BY started_at DESC LIMIT 50`,
    );
    const runs = (runRows.rows ?? (runRows as unknown as unknown[])) as Record<string, unknown>[];

    // For each run, fetch its steps (if workflowRunSteps table exists)
    const runsWithSteps = await Promise.all(
      runs.map(async (run) => {
        try {
          const stepRows = await sharedDb.execute(
            sql`SELECT * FROM "workflowRunSteps" WHERE "workflowRunId" = ${run['id'] as string} ORDER BY "createdAt" ASC`,
          );
          const steps = stepRows.rows ?? (stepRows as unknown as unknown[]);
          return { ...run, steps: Array.isArray(steps) ? steps : [] };
        } catch {
          return { ...run, steps: [] };
        }
      }),
    );

    return c.json({ runs: runsWithSteps });
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// POST /:id/test-run — manually trigger a test run for a workflow
workflowsRouter.post('/:id/test-run', async (c) => {
  const id = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');

  try {
    // Verify workflow exists for this tenant
    const defRows = await sharedDb.execute(
      sql`SELECT id FROM workflow_definitions WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`,
    );
    const defs = defRows.rows ?? (defRows as unknown as unknown[]);
    if (!Array.isArray(defs) || defs.length === 0) {
      return c.json({ error: 'Workflow definition not found' }, 404);
    }

    // Insert a workflowRun row with status='running' and triggeredBy='manual_test'
    let runId: string | null = null;
    try {
      const insertRows = await sharedDb.execute(
        sql`INSERT INTO workflow_runs (tenant_id, workflow_id, status, context, started_at)
            VALUES (${tenantId}, ${id}, 'running', '{"triggeredBy":"manual_test"}'::jsonb, now())
            RETURNING id`,
      );
      const inserted = insertRows.rows ?? (insertRows as unknown as unknown[]);
      if (Array.isArray(inserted) && inserted.length > 0) {
        runId = (inserted[0] as Record<string, unknown>)['id'] as string;
      }
    } catch {
      // workflowRuns table may not exist — proceed without persisting
    }

    // Enqueue BullMQ job
    await sharedQueueService.enqueue('workflow.test_run', {
      tenantId,
      workflowId: id,
      triggeredBy: 'manual_test',
    });

    return c.json({ runId, message: 'Test run started' }, 201);
  } catch (error) {
    return c.json({ error }, 500);
  }
});

// DELETE /:id — soft-delete (set enabled = false)
workflowsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const existing = await db.query.workflowDefinitions.findFirst({
    where: and(
      eq(schema.workflowDefinitions.id, id),
      eq(schema.workflowDefinitions.tenantId, tenantId),
    ),
  });

  if (!existing) {
    return c.json({ error: 'Workflow definition not found' }, 404);
  }

  const [updated] = await db
    .update(schema.workflowDefinitions)
    .set({ enabled: false, updatedAt: new Date() })
    .where(
      and(
        eq(schema.workflowDefinitions.id, id),
        eq(schema.workflowDefinitions.tenantId, tenantId),
      ),
    )
    .returning();

  return c.json(updated);
});

// POST /:id/trigger — trigger a workflow run
workflowsRouter.post(
  '/:id/trigger',
  zValidator(
    'json',
    z.object({
      context: z.record(z.string(), z.unknown()).optional().default({}),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');
    const { context } = c.req.valid('json');

    // Resolve the workflow name from its ID
    const definition = await db.query.workflowDefinitions.findFirst({
      where: and(
        eq(schema.workflowDefinitions.id, id),
        eq(schema.workflowDefinitions.tenantId, tenantId),
        eq(schema.workflowDefinitions.enabled, true),
      ),
    });

    if (!definition) {
      return c.json({ error: 'Workflow definition not found or disabled' }, 404);
    }

    const result = await workflowEngine.triggerWorkflow({
      tenantId,
      workflowName: definition.name,
      context,
    });

    return c.json(result, 201);
  },
);

// ── Workflow runs ──────────────────────────────────────────────

// GET /runs — list workflow runs for tenant
workflowsRouter.get('/runs', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const status = c.req.query('status');
  const workflowId = c.req.query('workflowId');

  const conditions = [eq(schema.workflowRuns.tenantId, tenantId)];

  if (status) {
    conditions.push(eq(schema.workflowRuns.status, status));
  }
  if (workflowId) {
    conditions.push(eq(schema.workflowRuns.workflowId, workflowId));
  }

  const runs = await db.query.workflowRuns.findMany({
    where: and(...conditions),
  });

  return c.json(runs);
});

// GET /runs/:runId — get single run with its context
workflowsRouter.get('/runs/:runId', async (c) => {
  const runId = c.req.param('runId');
  const { db, tenantId } = c.get('tenantCtx');

  const run = await db.query.workflowRuns.findFirst({
    where: and(
      eq(schema.workflowRuns.id, runId),
      eq(schema.workflowRuns.tenantId, tenantId),
    ),
  });

  if (!run) {
    return c.json({ error: 'Workflow run not found' }, 404);
  }

  return c.json(run);
});

// POST /runs/:runId/approve — approve or reject an awaiting-approval run
workflowsRouter.post(
  '/runs/:runId/approve',
  zValidator(
    'json',
    z.object({
      approved: z.boolean(),
    }),
  ),
  async (c) => {
    const runId = c.req.param('runId');
    const { tenantId } = c.get('tenantCtx');
    const { approved } = c.req.valid('json');

    try {
      await workflowEngine.approveStep({
        tenantId,
        workflowRunId: runId,
        approved,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }

    return c.json({ success: true });
  },
);
