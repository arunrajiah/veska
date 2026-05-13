import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { schema, WorkflowEngine } from '@veska/core';
import {
  sharedDb,
  sharedQueueService,
  sharedAuditService,
  sharedLlm,
  sharedMagicLinkService,
} from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

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
