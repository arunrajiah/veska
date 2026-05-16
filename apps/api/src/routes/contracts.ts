import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const contractsRouter = new Hono<{ Variables: TenantContext }>();

// ── Helpers ────────────────────────────────────────────────────

async function addContractEvent(
  tenantId: string,
  contractId: string,
  eventType: string,
  description: string | null,
  performedBy: string | null,
  metadata: Record<string, unknown> = {},
) {
  await sharedDb.execute(sql`
    INSERT INTO "contractEvents" ("tenantId", "contractId", "eventType", description, "performedBy", metadata)
    VALUES (${tenantId}, ${contractId}, ${eventType}, ${description}, ${performedBy}, ${JSON.stringify(metadata)}::jsonb)
  `);
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['review', 'sent', 'terminated'],
  review: ['sent', 'draft', 'terminated'],
  sent: ['signed', 'terminated'],
  signed: ['active'],
  active: ['expired', 'terminated'],
};

// ── Expiring soon (before /:id) ────────────────────────────────

contractsRouter.get('/expiring-soon', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');

    const result = await sharedDb.execute(sql`
      SELECT *,
        ("endDate"::date - CURRENT_DATE) AS "daysRemaining"
      FROM "contracts"
      WHERE "tenantId" = ${tenantId}
        AND status = 'active'
        AND "endDate" IS NOT NULL
        AND "endDate"::date BETWEEN CURRENT_DATE AND CURRENT_DATE + (COALESCE("renewalNoticeDays", 30) || ' days')::interval
      ORDER BY "endDate" ASC
    `);

    return c.json(result.rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /contracts/expiring-soon');
  }
});

// ── Summary (before /:id) ──────────────────────────────────────

contractsRouter.get('/summary', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');

    const [statusResult, valueResult, expiringResult] = await Promise.all([
      sharedDb.execute(sql`
        SELECT status, COUNT(*) AS count
        FROM "contracts"
        WHERE "tenantId" = ${tenantId}
        GROUP BY status
      `),
      sharedDb.execute(sql`
        SELECT type, COALESCE(SUM(value), 0) AS "totalValue", COUNT(*) AS count
        FROM "contracts"
        WHERE "tenantId" = ${tenantId}
        GROUP BY type
      `),
      sharedDb.execute(sql`
        SELECT COUNT(*) AS count
        FROM "contracts"
        WHERE "tenantId" = ${tenantId}
          AND status = 'active'
          AND "endDate" IS NOT NULL
          AND "endDate"::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      `),
    ]);

    type StatusRow = { status: string; count: string };
    type ValueRow = { type: string; totalValue: string; count: string };

    const byStatus = (statusResult.rows as StatusRow[]).reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = Number(r.count);
      return acc;
    }, {});

    const byType = (valueResult.rows as ValueRow[]).map((r) => ({
      type: r.type,
      totalValue: Number(r.totalValue),
      count: Number(r.count),
    }));

    const expiringCount = Number((expiringResult.rows[0] as { count: string } | undefined)?.count ?? 0);

    return c.json({ byStatus, byType, expiringInNext30Days: expiringCount });
  } catch (err) {
    return handleRouteError(c, err, 'GET /contracts/summary');
  }
});

// ── List contracts ─────────────────────────────────────────────

contractsRouter.get('/', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const status = c.req.query('status');
    const type = c.req.query('type');
    const search = c.req.query('search');

    const result = await sharedDb.execute(sql`
      SELECT *
      FROM "contracts"
      WHERE "tenantId" = ${tenantId}
        AND (${status ?? null} IS NULL OR status = ${status ?? null})
        AND (${type ?? null} IS NULL OR type = ${type ?? null})
        AND (${search ?? null} IS NULL OR (
          title ILIKE ${'%' + (search ?? '') + '%'}
          OR "partyB" ILIKE ${'%' + (search ?? '') + '%'}
        ))
      ORDER BY "createdAt" DESC
    `);

    return c.json(result.rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /contracts');
  }
});

// ── Get contract with events ───────────────────────────────────

contractsRouter.get('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const [contractResult, eventsResult] = await Promise.all([
      sharedDb.execute(sql`
        SELECT * FROM "contracts" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
      `),
      sharedDb.execute(sql`
        SELECT * FROM "contractEvents"
        WHERE "contractId" = ${id} AND "tenantId" = ${tenantId}
        ORDER BY "createdAt" ASC
      `),
    ]);

    if (!contractResult.rows[0]) return c.json({ error: 'Not found' }, 404);

    return c.json({ ...contractResult.rows[0], events: eventsResult.rows });
  } catch (err) {
    return handleRouteError(c, err, 'GET /contracts/:id');
  }
});

// ── Create contract ────────────────────────────────────────────

const createContractSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['service', 'employment', 'vendor', 'nda', 'lease', 'custom']).default('service'),
  partyA: z.string().min(1),
  partyB: z.string().min(1),
  partyBEmail: z.string().email().optional(),
  value: z.number().optional(),
  currency: z.string().default('USD'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  autoRenew: z.boolean().default(false),
  renewalNoticeDays: z.number().int().optional(),
  content: z.string().optional(),
  templateId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdBy: z.string().optional(),
});

contractsRouter.post('/', zValidator('json', createContractSchema), async (c) => {
  try {
    const { tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const result = await sharedDb.execute(sql`
      INSERT INTO "contracts" (
        "tenantId", title, type, status, "partyA", "partyB", "partyBEmail",
        value, currency, "startDate", "endDate", "autoRenew", "renewalNoticeDays",
        content, "templateId", tags, "createdBy"
      ) VALUES (
        ${tenantId},
        ${body.title},
        ${body.type},
        'draft',
        ${body.partyA},
        ${body.partyB},
        ${body.partyBEmail ?? null},
        ${body.value ?? null},
        ${body.currency},
        ${body.startDate ?? null},
        ${body.endDate ?? null},
        ${body.autoRenew},
        ${body.renewalNoticeDays ?? 30},
        ${body.content ?? null},
        ${body.templateId ?? null},
        ${JSON.stringify(body.tags)}::jsonb,
        ${body.createdBy ?? identityId}
      )
      RETURNING *
    `);

    const contract = result.rows[0] as { id: string } | undefined;
    if (!contract) return c.json({ error: 'Failed to create contract' }, 500);

    await addContractEvent(tenantId, contract.id, 'created', 'Contract created', body.createdBy ?? identityId);

    return c.json(contract, 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /contracts');
  }
});

// ── Update contract metadata ───────────────────────────────────

const updateContractSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['service', 'employment', 'vendor', 'nda', 'lease', 'custom']).optional(),
  partyA: z.string().optional(),
  partyB: z.string().optional(),
  partyBEmail: z.string().email().optional(),
  value: z.number().optional(),
  currency: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  autoRenew: z.boolean().optional(),
  renewalNoticeDays: z.number().int().optional(),
  content: z.string().optional(),
  templateId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

contractsRouter.put('/:id', zValidator('json', updateContractSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');
    const body = c.req.valid('json');

    const check = await sharedDb.execute(sql`
      SELECT id FROM "contracts" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if (!check.rows[0]) return c.json({ error: 'Not found' }, 404);

    const result = await sharedDb.execute(sql`
      UPDATE "contracts"
      SET
        title              = COALESCE(${body.title ?? null}, title),
        type               = COALESCE(${body.type ?? null}, type),
        "partyA"           = COALESCE(${body.partyA ?? null}, "partyA"),
        "partyB"           = COALESCE(${body.partyB ?? null}, "partyB"),
        "partyBEmail"      = COALESCE(${body.partyBEmail ?? null}, "partyBEmail"),
        value              = COALESCE(${body.value ?? null}::numeric, value),
        currency           = COALESCE(${body.currency ?? null}, currency),
        "startDate"        = COALESCE(${body.startDate ?? null}::date, "startDate"),
        "endDate"          = COALESCE(${body.endDate ?? null}::date, "endDate"),
        "autoRenew"        = COALESCE(${body.autoRenew ?? null}, "autoRenew"),
        "renewalNoticeDays" = COALESCE(${body.renewalNoticeDays ?? null}::integer, "renewalNoticeDays"),
        content            = COALESCE(${body.content ?? null}, content),
        "templateId"       = COALESCE(${body.templateId ?? null}, "templateId"),
        tags               = COALESCE(${body.tags ? JSON.stringify(body.tags) : null}::jsonb, tags),
        "updatedAt"        = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    return c.json(result.rows[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /contracts/:id');
  }
});

// ── Delete contract ────────────────────────────────────────────

contractsRouter.delete('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const id = c.req.param('id');

    const check = await sharedDb.execute(sql`
      SELECT id, status FROM "contracts" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    const existing = check.rows[0] as { id: string; status: string } | undefined;
    if (!existing) return c.json({ error: 'Not found' }, 404);
    if (existing.status !== 'draft') return c.json({ error: 'Only draft contracts can be deleted' }, 400);

    await sharedDb.execute(sql`DELETE FROM "contracts" WHERE id = ${id} AND "tenantId" = ${tenantId}`);

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /contracts/:id');
  }
});

// ── Update status ──────────────────────────────────────────────

const updateContractStatusSchema = z.object({
  status: z.enum(['draft', 'review', 'sent', 'signed', 'active', 'expired', 'terminated']),
  performedBy: z.string().optional(),
  signatureA: z.string().optional(),
  signatureB: z.string().optional(),
  description: z.string().optional(),
});

contractsRouter.put('/:id/status', zValidator('json', updateContractStatusSchema), async (c) => {
  try {
    const { tenantId, identityId } = c.get('tenantCtx');
    const id = c.req.param('id');
    const body = c.req.valid('json');

    const check = await sharedDb.execute(sql`
      SELECT id, status FROM "contracts" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    const existing = check.rows[0] as { id: string; status: string } | undefined;
    if (!existing) return c.json({ error: 'Not found' }, 404);

    const allowed = VALID_STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(body.status)) {
      return c.json({ error: `Cannot transition from '${existing.status}' to '${body.status}'` }, 400);
    }

    const result = await sharedDb.execute(sql`
      UPDATE "contracts"
      SET
        status       = ${body.status},
        "signatureA" = COALESCE(${body.signatureA ?? null}, "signatureA"),
        "signatureB" = COALESCE(${body.signatureB ?? null}, "signatureB"),
        "updatedAt"  = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    const performedBy = body.performedBy ?? identityId;
    const desc = body.description ?? `Status changed to ${body.status}`;
    await addContractEvent(tenantId, id, body.status, desc, performedBy, { previousStatus: existing.status });

    return c.json(result.rows[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /contracts/:id/status');
  }
});

// ── Send contract ──────────────────────────────────────────────

const sendContractSchema = z.object({
  recipientEmail: z.string().email().optional(),
});

contractsRouter.post('/:id/send', zValidator('json', sendContractSchema), async (c) => {
  try {
    const { tenantId, identityId } = c.get('tenantCtx');
    const id = c.req.param('id');
    const { recipientEmail } = c.req.valid('json');

    const check = await sharedDb.execute(sql`
      SELECT id, status, "partyBEmail" FROM "contracts"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      LIMIT 1
    `);
    const existing = check.rows[0] as { id: string; status: string; partyBEmail: string | null } | undefined;
    if (!existing) return c.json({ error: 'Not found' }, 404);

    const toEmail = recipientEmail ?? existing.partyBEmail;
    console.log(`[contracts] Email would be sent to ${toEmail ?? 'unknown'} for contract ${id}`);

    // Transition to sent if currently draft or review
    if (['draft', 'review'].includes(existing.status)) {
      await sharedDb.execute(sql`
        UPDATE "contracts" SET status = 'sent', "updatedAt" = now()
        WHERE id = ${id} AND "tenantId" = ${tenantId}
      `);
      await addContractEvent(tenantId, id, 'sent', `Contract sent to ${toEmail ?? 'counterparty'}`, identityId, { toEmail });
    }

    return c.json({ sent: true, toEmail });
  } catch (err) {
    return handleRouteError(c, err, 'POST /contracts/:id/send');
  }
});

// ── Sign contract ──────────────────────────────────────────────

const signContractSchema = z.object({
  signatureName: z.string().min(1),
  party: z.enum(['a', 'b']),
});

contractsRouter.post('/:id/sign', zValidator('json', signContractSchema), async (c) => {
  try {
    const { tenantId, identityId } = c.get('tenantCtx');
    const id = c.req.param('id');
    const { signatureName, party } = c.req.valid('json');

    const check = await sharedDb.execute(sql`
      SELECT id, status, "signatureA", "signatureB"
      FROM "contracts"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      LIMIT 1
    `);
    const existing = check.rows[0] as {
      id: string;
      status: string;
      signatureA: string | null;
      signatureB: string | null;
    } | undefined;
    if (!existing) return c.json({ error: 'Not found' }, 404);

    const newSigA = party === 'a' ? signatureName : existing.signatureA;
    const newSigB = party === 'b' ? signatureName : existing.signatureB;
    const bothSigned = Boolean(newSigA && newSigB);
    const newStatus = bothSigned ? 'signed' : existing.status;

    const result = await sharedDb.execute(sql`
      UPDATE "contracts"
      SET
        "signatureA" = ${newSigA},
        "signatureB" = ${newSigB},
        "signedAt"   = CASE WHEN ${bothSigned} AND "signedAt" IS NULL THEN now() ELSE "signedAt" END,
        status       = ${newStatus},
        "updatedAt"  = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    const eventDesc = party === 'a'
      ? `Party A signed: ${signatureName}`
      : `Party B signed: ${signatureName}`;
    await addContractEvent(tenantId, id, 'signed', eventDesc, identityId, { party, signatureName, bothSigned });

    return c.json(result.rows[0]);
  } catch (err) {
    return handleRouteError(c, err, 'POST /contracts/:id/sign');
  }
});
