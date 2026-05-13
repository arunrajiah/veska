import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, ilike, or, sql } from 'drizzle-orm';
import { schema } from '@veska/core';
import { sharedQueueService, sharedAuditService } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const crmRouter = new Hono<{ Variables: TenantContext }>();

const DEAL_STAGES = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const;

// ── Leads ─────────────────────────────────────────────────────

crmRouter.get('/leads', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const status = c.req.query('status');
  const assignedTo = c.req.query('assigned_to');
  const q = c.req.query('q');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Lead'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (status) {
    conditions.push(sql`${schema.entityRecords.data}->>'status' = ${status}`);
  }
  if (assignedTo) {
    conditions.push(sql`${schema.entityRecords.data}->>'assigned_to' = ${assignedTo}`);
  }
  if (q) {
    conditions.push(
      or(
        ilike(sql`${schema.entityRecords.data}->>'name'`, `%${q}%`),
        ilike(sql`${schema.entityRecords.data}->>'email'`, `%${q}%`),
        ilike(sql`${schema.entityRecords.data}->>'company'`, `%${q}%`),
      )!,
    );
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  return c.json(records);
});

crmRouter.post(
  '/leads',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
      assigned_to: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const data = { ...body, status: 'new' };

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Lead', data, createdBy: identityId })
      .returning();

    if (!record) return c.json({ error: 'Failed to create lead' }, 500);

    // workflow.trigger is not in the strict JobName union but the queue accepts it via
    // the fallback Record<string, unknown> branch of JobPayload
    await (sharedQueueService.enqueue as (
      name: string,
      payload: Record<string, unknown>,
    ) => Promise<string>)('workflow.trigger', {
      tenantId,
      workflowName: 'lead_created',
      context: { leadId: record.id },
    });

    return c.json(record, 201);
  },
);

crmRouter.patch(
  '/leads/:id/qualify',
  zValidator('json', z.object({ deal_value: z.number().optional() })),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const { deal_value } = c.req.valid('json');

    const lead = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Lead'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!lead) return c.json({ error: 'Lead not found' }, 404);

    const [updatedLead] = await db
      .update(schema.entityRecords)
      .set({
        data: { ...(lead.data as Record<string, unknown>), status: 'qualified' },
        updatedAt: new Date(),
      })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    const leadData = lead.data as Record<string, unknown>;
    const dealData = {
      lead_id: id,
      name: leadData['name'] ?? 'Untitled Deal',
      company: leadData['company'],
      value: deal_value ?? 0,
      stage: 'prospecting',
      assigned_to: leadData['assigned_to'],
    };

    const [deal] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Deal', data: dealData, createdBy: identityId })
      .returning();

    return c.json({ lead: updatedLead, deal }, 200);
  },
);

// ── Contacts ──────────────────────────────────────────────────

crmRouter.get('/contacts', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const q = c.req.query('q');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Contact'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (q) {
    conditions.push(
      or(
        ilike(sql`${schema.entityRecords.data}->>'name'`, `%${q}%`),
        ilike(sql`${schema.entityRecords.data}->>'email'`, `%${q}%`),
      )!,
    );
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  return c.json(records);
});

crmRouter.post(
  '/contacts',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company_id: z.string().uuid().optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Contact', data: body, createdBy: identityId })
      .returning();

    return c.json(record, 201);
  },
);

// ── Companies ─────────────────────────────────────────────────

crmRouter.get('/companies', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const records = await db.query.entityRecords.findMany({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Company'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  return c.json(records);
});

crmRouter.post(
  '/companies',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      website: z.string().url().optional(),
      industry: z.string().optional(),
      size: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Company', data: body, createdBy: identityId })
      .returning();

    return c.json(record, 201);
  },
);

// ── Deals ─────────────────────────────────────────────────────

crmRouter.get('/deals', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const stage = c.req.query('stage');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Deal'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (stage) {
    conditions.push(sql`${schema.entityRecords.data}->>'stage' = ${stage}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  return c.json(records);
});

crmRouter.post(
  '/deals',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      value: z.number().optional(),
      stage: z.enum(DEAL_STAGES).optional().default('prospecting'),
      company_id: z.string().uuid().optional(),
      contact_id: z.string().uuid().optional(),
      assigned_to: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Deal', data: body, createdBy: identityId })
      .returning();

    return c.json(record, 201);
  },
);

crmRouter.patch(
  '/deals/:id/stage',
  zValidator('json', z.object({ stage: z.enum(DEAL_STAGES) })),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const { stage } = c.req.valid('json');

    const deal = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Deal'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!deal) return c.json({ error: 'Deal not found' }, 404);

    const before = deal.data;
    const after = { ...(deal.data as Record<string, unknown>), stage };

    const [updated] = await db
      .update(schema.entityRecords)
      .set({ data: after, updatedAt: new Date() })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    await sharedAuditService.log({
      tenantId,
      actorIdentityId: identityId,
      actorType: 'employee',
      action: 'deal.stage_changed',
      resourceType: 'Deal',
      resourceId: id,
      before,
      after,
    });

    return c.json(updated);
  },
);

// ── Pipeline ──────────────────────────────────────────────────

crmRouter.get('/pipeline', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const deals = await db.query.entityRecords.findMany({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Deal'),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  const pipeline = DEAL_STAGES.reduce<
    Record<string, { deals: typeof deals; total_value: number; count: number }>
  >((acc, stage) => {
    acc[stage] = { deals: [], total_value: 0, count: 0 };
    return acc;
  }, {});

  for (const deal of deals) {
    const data = deal.data as Record<string, unknown>;
    const stage = (data['stage'] as string) ?? 'prospecting';
    const value = typeof data['value'] === 'number' ? data['value'] : 0;

    const bucket = pipeline[stage];
    if (bucket) {
      bucket.deals.push(deal);
      bucket.total_value += value;
      bucket.count += 1;
    }
  }

  return c.json(pipeline);
});
