import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const crmTablesRouter = new Hono<{ Variables: TenantContext }>();

// ── Contacts ──────────────────────────────────────────────────

// GET /contacts
crmTablesRouter.get('/contacts', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const search = c.req.query('search');
  const ownerId = c.req.query('ownerId');

  const result = await sharedDb.execute(sql`
    SELECT *
    FROM "crmContacts"
    WHERE "tenantId" = ${tenantId}
      AND (
        ${search ?? null}::text IS NULL
        OR name ILIKE ${'%' + (search ?? '') + '%'}
        OR email ILIKE ${'%' + (search ?? '') + '%'}
        OR company ILIKE ${'%' + (search ?? '') + '%'}
      )
      AND (${ownerId ?? null}::text IS NULL OR "ownerId" = ${ownerId ?? null})
    ORDER BY "createdAt" DESC
  `);

  return c.json(result.rows);
});

// POST /contacts
crmTablesRouter.post('/contacts', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    tags?: unknown[];
    notes?: string;
    ownerId?: string;
  }>();

  if (!body.name) {
    return c.json({ error: 'name is required' }, 400);
  }

  const result = await sharedDb.execute(sql`
    INSERT INTO "crmContacts" (
      "tenantId", name, email, phone, company, title, tags, notes, "ownerId"
    )
    VALUES (
      ${tenantId},
      ${body.name},
      ${body.email ?? null},
      ${body.phone ?? null},
      ${body.company ?? null},
      ${body.title ?? null},
      ${JSON.stringify(body.tags ?? [])}::jsonb,
      ${body.notes ?? null},
      ${body.ownerId ?? null}
    )
    RETURNING *
  `);

  return c.json(result.rows[0], 201);
});

// GET /contacts/:id — include deal count
crmTablesRouter.get('/contacts/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const result = await sharedDb.execute(sql`
    SELECT
      c.*,
      COUNT(d.id)::integer AS "dealCount"
    FROM "crmContacts" c
    LEFT JOIN "crmDeals" d
      ON d."contactId" = c.id
      AND d."tenantId" = c."tenantId"
    WHERE c.id = ${id}
      AND c."tenantId" = ${tenantId}
    GROUP BY c.id
  `);

  if (!result.rows.length) {
    return c.json({ error: 'Contact not found' }, 404);
  }

  return c.json(result.rows[0]);
});

// PUT /contacts/:id
crmTablesRouter.put('/contacts/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    tags?: unknown[];
    notes?: string;
    ownerId?: string;
  }>();

  const check = await sharedDb.execute(sql`
    SELECT id FROM "crmContacts"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);
  if (!check.rows.length) {
    return c.json({ error: 'Contact not found' }, 404);
  }

  const result = await sharedDb.execute(sql`
    UPDATE "crmContacts"
    SET
      name       = COALESCE(${body.name ?? null}, name),
      email      = COALESCE(${body.email ?? null}, email),
      phone      = COALESCE(${body.phone ?? null}, phone),
      company    = COALESCE(${body.company ?? null}, company),
      title      = COALESCE(${body.title ?? null}, title),
      tags       = COALESCE(${body.tags !== undefined ? JSON.stringify(body.tags) : null}::jsonb, tags),
      notes      = COALESCE(${body.notes ?? null}, notes),
      "ownerId"  = COALESCE(${body.ownerId ?? null}, "ownerId"),
      "updatedAt" = now()
    WHERE id = ${id} AND "tenantId" = ${tenantId}
    RETURNING *
  `);

  return c.json(result.rows[0]);
});

// DELETE /contacts/:id
crmTablesRouter.delete('/contacts/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "crmContacts"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);
  if (!check.rows.length) {
    return c.json({ error: 'Contact not found' }, 404);
  }

  await sharedDb.execute(sql`
    DELETE FROM "crmContacts"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);

  return c.json({ success: true });
});

// ── Deal Stages ───────────────────────────────────────────────

// GET /stages
crmTablesRouter.get('/stages', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const result = await sharedDb.execute(sql`
    SELECT *
    FROM "dealStages"
    WHERE "tenantId" = ${tenantId}
    ORDER BY "order" ASC
  `);

  return c.json(result.rows);
});

// POST /stages
crmTablesRouter.post('/stages', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{
    name: string;
    order?: number;
    color?: string;
    probability?: number;
  }>();

  if (!body.name) {
    return c.json({ error: 'name is required' }, 400);
  }

  const result = await sharedDb.execute(sql`
    INSERT INTO "dealStages" ("tenantId", name, "order", color, probability)
    VALUES (
      ${tenantId},
      ${body.name},
      ${body.order ?? 0},
      ${body.color ?? '#6366f1'},
      ${body.probability ?? 0}
    )
    RETURNING *
  `);

  return c.json(result.rows[0], 201);
});

// PUT /stages/:id
crmTablesRouter.put('/stages/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    order?: number;
    color?: string;
    probability?: number;
  }>();

  const check = await sharedDb.execute(sql`
    SELECT id FROM "dealStages"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);
  if (!check.rows.length) {
    return c.json({ error: 'Stage not found' }, 404);
  }

  const result = await sharedDb.execute(sql`
    UPDATE "dealStages"
    SET
      name        = COALESCE(${body.name ?? null}, name),
      "order"     = COALESCE(${body.order ?? null}, "order"),
      color       = COALESCE(${body.color ?? null}, color),
      probability = COALESCE(${body.probability ?? null}, probability)
    WHERE id = ${id} AND "tenantId" = ${tenantId}
    RETURNING *
  `);

  return c.json(result.rows[0]);
});

// DELETE /stages/:id — only if no deals in stage
crmTablesRouter.delete('/stages/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "dealStages"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);
  if (!check.rows.length) {
    return c.json({ error: 'Stage not found' }, 404);
  }

  const dealsInStage = await sharedDb.execute(sql`
    SELECT COUNT(*)::integer AS count
    FROM "crmDeals"
    WHERE "stageId" = ${id} AND "tenantId" = ${tenantId}
  `);

  const row = dealsInStage.rows[0] as { count: number } | undefined;
  if (row && row.count > 0) {
    return c.json({ error: 'Cannot delete a stage that has deals. Move or delete the deals first.' }, 409);
  }

  await sharedDb.execute(sql`
    DELETE FROM "dealStages"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);

  return c.json({ success: true });
});

// POST /stages/seed — seed default stages if none exist
crmTablesRouter.post('/stages/seed', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const existing = await sharedDb.execute(sql`
    SELECT COUNT(*)::integer AS count
    FROM "dealStages"
    WHERE "tenantId" = ${tenantId}
  `);

  const row = existing.rows[0] as { count: number } | undefined;
  if (row && row.count > 0) {
    return c.json({ message: 'Stages already exist for this tenant', seeded: false });
  }

  const defaults = [
    { name: 'Lead',        order: 0, color: '#94a3b8', probability: 10 },
    { name: 'Qualified',   order: 1, color: '#60a5fa', probability: 25 },
    { name: 'Proposal',    order: 2, color: '#a78bfa', probability: 50 },
    { name: 'Negotiation', order: 3, color: '#f59e0b', probability: 75 },
    { name: 'Closed Won',  order: 4, color: '#22c55e', probability: 100 },
  ];

  const inserted: unknown[] = [];
  for (const stage of defaults) {
    const result = await sharedDb.execute(sql`
      INSERT INTO "dealStages" ("tenantId", name, "order", color, probability)
      VALUES (${tenantId}, ${stage.name}, ${stage.order}, ${stage.color}, ${stage.probability})
      RETURNING *
    `);
    inserted.push(result.rows[0]);
  }

  return c.json({ seeded: true, stages: inserted }, 201);
});

// ── Deals ─────────────────────────────────────────────────────

// GET /deals — with contact name + stage name via JOIN
crmTablesRouter.get('/deals', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const stageId = c.req.query('stageId');
  const contactId = c.req.query('contactId');
  const status = c.req.query('status');
  const ownerId = c.req.query('ownerId');

  const result = await sharedDb.execute(sql`
    SELECT
      d.*,
      ct.name AS "contactName",
      s.name AS "stageName",
      s.color AS "stageColor"
    FROM "crmDeals" d
    LEFT JOIN "crmContacts" ct ON ct.id = d."contactId"
    LEFT JOIN "dealStages"  s  ON s.id  = d."stageId"
    WHERE d."tenantId" = ${tenantId}
      AND (${stageId ?? null}::text IS NULL OR d."stageId" = ${stageId ?? null})
      AND (${contactId ?? null}::text IS NULL OR d."contactId" = ${contactId ?? null})
      AND (${status ?? null}::text IS NULL OR d.status = ${status ?? null})
      AND (${ownerId ?? null}::text IS NULL OR d."ownerId" = ${ownerId ?? null})
    ORDER BY d."createdAt" DESC
  `);

  return c.json(result.rows);
});

// POST /deals
crmTablesRouter.post('/deals', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{
    title: string;
    value?: number;
    currency?: string;
    stageId?: string;
    contactId?: string;
    ownerId?: string;
    expectedCloseDate?: string;
    status?: string;
    notes?: string;
  }>();

  if (!body.title) {
    return c.json({ error: 'title is required' }, 400);
  }

  const result = await sharedDb.execute(sql`
    INSERT INTO "crmDeals" (
      "tenantId", title, value, currency, "stageId", "contactId",
      "ownerId", "expectedCloseDate", status, notes
    )
    VALUES (
      ${tenantId},
      ${body.title},
      ${body.value ?? 0},
      ${body.currency ?? 'USD'},
      ${body.stageId ?? null},
      ${body.contactId ?? null},
      ${body.ownerId ?? null},
      ${body.expectedCloseDate ?? null}::date,
      ${body.status ?? 'open'},
      ${body.notes ?? null}
    )
    RETURNING *
  `);

  return c.json(result.rows[0], 201);
});

// GET /deals/:id — with contact + stage
crmTablesRouter.get('/deals/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const result = await sharedDb.execute(sql`
    SELECT
      d.*,
      ct.name AS "contactName",
      ct.email AS "contactEmail",
      ct.phone AS "contactPhone",
      s.name AS "stageName",
      s.color AS "stageColor",
      s.probability AS "stageProbability"
    FROM "crmDeals" d
    LEFT JOIN "crmContacts" ct ON ct.id = d."contactId"
    LEFT JOIN "dealStages"  s  ON s.id  = d."stageId"
    WHERE d.id = ${id}
      AND d."tenantId" = ${tenantId}
  `);

  if (!result.rows.length) {
    return c.json({ error: 'Deal not found' }, 404);
  }

  return c.json(result.rows[0]);
});

// PUT /deals/:id
crmTablesRouter.put('/deals/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = await c.req.json<{
    title?: string;
    value?: number;
    currency?: string;
    stageId?: string;
    contactId?: string;
    ownerId?: string;
    expectedCloseDate?: string;
    status?: string;
    notes?: string;
  }>();

  const check = await sharedDb.execute(sql`
    SELECT id FROM "crmDeals"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);
  if (!check.rows.length) {
    return c.json({ error: 'Deal not found' }, 404);
  }

  const result = await sharedDb.execute(sql`
    UPDATE "crmDeals"
    SET
      title               = COALESCE(${body.title ?? null}, title),
      value               = COALESCE(${body.value ?? null}, value),
      currency            = COALESCE(${body.currency ?? null}, currency),
      "stageId"           = COALESCE(${body.stageId ?? null}, "stageId"),
      "contactId"         = COALESCE(${body.contactId ?? null}, "contactId"),
      "ownerId"           = COALESCE(${body.ownerId ?? null}, "ownerId"),
      "expectedCloseDate" = COALESCE(${body.expectedCloseDate ?? null}::date, "expectedCloseDate"),
      status              = COALESCE(${body.status ?? null}, status),
      notes               = COALESCE(${body.notes ?? null}, notes),
      "updatedAt"         = now()
    WHERE id = ${id} AND "tenantId" = ${tenantId}
    RETURNING *
  `);

  return c.json(result.rows[0]);
});

// DELETE /deals/:id
crmTablesRouter.delete('/deals/:id', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const id = c.req.param('id');

  const check = await sharedDb.execute(sql`
    SELECT id FROM "crmDeals"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);
  if (!check.rows.length) {
    return c.json({ error: 'Deal not found' }, 404);
  }

  await sharedDb.execute(sql`
    DELETE FROM "crmDeals"
    WHERE id = ${id} AND "tenantId" = ${tenantId}
  `);

  return c.json({ success: true });
});

// ── Pipeline summary ──────────────────────────────────────────
// GET /pipeline
crmTablesRouter.get('/pipeline', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const result = await sharedDb.execute(sql`
    SELECT
      s.id AS "stageId",
      s.name AS "stageName",
      s.color,
      s.probability,
      COUNT(d.id)::integer AS "dealCount",
      COALESCE(SUM(d.value), 0) AS "totalValue",
      COALESCE(SUM(d.value * s.probability::numeric / 100), 0) AS "weightedValue"
    FROM "dealStages" s
    LEFT JOIN "crmDeals" d
      ON d."stageId" = s.id
      AND d."tenantId" = s."tenantId"
      AND d.status = 'open'
    WHERE s."tenantId" = ${tenantId}
    GROUP BY s.id, s.name, s.color, s.probability, s."order"
    ORDER BY s."order" ASC
  `);

  const stages = result.rows as Array<{
    stageId: string;
    stageName: string;
    color: string;
    probability: number;
    dealCount: number;
    totalValue: string | number;
    weightedValue: string | number;
  }>;

  const grandTotals = stages.reduce(
    (acc, s) => {
      acc.dealCount += s.dealCount;
      acc.totalValue += Number(s.totalValue);
      acc.weightedValue += Number(s.weightedValue);
      return acc;
    },
    { dealCount: 0, totalValue: 0, weightedValue: 0 },
  );

  return c.json({ stages, grandTotals });
});
