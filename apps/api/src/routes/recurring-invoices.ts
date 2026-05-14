import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import type { TenantContext } from '../middleware/tenant-context.js';

export const recurringInvoicesRouter = new Hono<{ Variables: TenantContext }>();

// ── Helpers ────────────────────────────────────────────────────

function nextDate(current: Date, frequency: string): Date {
  const d = new Date(current);
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'annually': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Validators ────────────────────────────────────────────────

const templateDataSchema = z.object({
  customerName: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().optional(),
  lineItems: z.array(z.record(z.unknown())).optional(),
  dueInDays: z.number().int().optional(),
});

const createSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1),
  templateData: templateDataSchema,
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annually']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  templateData: templateDataSchema.partial().optional(),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annually']).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(['active', 'paused']).optional(),
});

// ── GET / ─────────────────────────────────────────────────────

recurringInvoicesRouter.get('/', async (c) => {
  const { db } = c.get('tenantCtx');
  const tenantId = c.req.query('tenantId');
  const status = c.req.query('status');

  if (!tenantId) {
    return c.json({ error: 'tenantId is required' }, 400);
  }

  const result = await db.execute(sql`
    SELECT * FROM "recurringInvoices"
    WHERE "tenantId" = ${tenantId}
      ${status ? sql`AND "status" = ${status}` : sql``}
    ORDER BY "createdAt" DESC
  `);

  return c.json(result.rows ?? []);
});

// ── POST / ────────────────────────────────────────────────────

recurringInvoicesRouter.post('/', zValidator('json', createSchema), async (c) => {
  const { db } = c.get('tenantCtx');
  const body = c.req.valid('json');

  const result = await db.execute(sql`
    INSERT INTO "recurringInvoices"
      ("tenantId", "name", "templateData", "frequency", "startDate", "endDate", "nextRunDate")
    VALUES
      (${body.tenantId}, ${body.name}, ${JSON.stringify(body.templateData)},
       ${body.frequency}, ${body.startDate}, ${body.endDate ?? null}, ${body.startDate})
    RETURNING *
  `);

  const row = result.rows?.[0];
  if (!row) return c.json({ error: 'Insert failed' }, 500);
  return c.json(row, 201);
});

// ── GET /:id ──────────────────────────────────────────────────

recurringInvoicesRouter.get('/:id', async (c) => {
  const { db } = c.get('tenantCtx');
  const id = c.req.param('id');

  const result = await db.execute(sql`
    SELECT * FROM "recurringInvoices" WHERE "id" = ${id}
  `);

  const row = result.rows?.[0];
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

// ── PATCH /:id ────────────────────────────────────────────────

recurringInvoicesRouter.patch('/:id', zValidator('json', patchSchema), async (c) => {
  const { db } = c.get('tenantCtx');
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const setClauses: any[] = [];
  if (body.name !== undefined) setClauses.push(sql`"name" = ${body.name}`);
  if (body.templateData !== undefined) setClauses.push(sql`"templateData" = ${JSON.stringify(body.templateData)}`);
  if (body.frequency !== undefined) setClauses.push(sql`"frequency" = ${body.frequency}`);
  if (body.endDate !== undefined) setClauses.push(sql`"endDate" = ${body.endDate}`);
  if (body.status !== undefined) setClauses.push(sql`"status" = ${body.status}`);

  if (setClauses.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  setClauses.push(sql`"updatedAt" = now()`);

  const setFragment = setClauses.reduce((acc, clause, i) =>
    i === 0 ? clause : sql`${acc}, ${clause}`
  );

  const result = await db.execute(sql`
    UPDATE "recurringInvoices"
    SET ${setFragment}
    WHERE "id" = ${id}
    RETURNING *
  `);

  const row = result.rows?.[0];
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

// ── DELETE /:id ───────────────────────────────────────────────

recurringInvoicesRouter.delete('/:id', async (c) => {
  const { db } = c.get('tenantCtx');
  const id = c.req.param('id');

  // Fetch first to check status
  const fetchResult = await db.execute(sql`
    SELECT "status" FROM "recurringInvoices" WHERE "id" = ${id}
  `);

  const row = fetchResult.rows?.[0] as { status: string } | undefined;
  if (!row) return c.json({ error: 'Not found' }, 404);
  if (row.status === 'active') {
    return c.json({ error: 'Cannot delete an active recurring invoice. Pause or cancel it first.' }, 422);
  }

  await db.execute(sql`
    DELETE FROM "recurringInvoices" WHERE "id" = ${id}
  `);

  return c.json({ deleted: true });
});

// ── POST /run-due (internal) ──────────────────────────────────

recurringInvoicesRouter.post('/run-due', async (c) => {
  const { db } = c.get('tenantCtx');

  const dueResult = await db.execute(sql`
    SELECT * FROM "recurringInvoices"
    WHERE "nextRunDate" <= CURRENT_DATE
      AND "status" = 'active'
  `);

  const due = dueResult.rows ?? [];
  let invoicesCreated = 0;
  const today = toDateString(new Date());

  for (const rec of due as any[]) {
    const template = typeof rec.templateData === 'string'
      ? JSON.parse(rec.templateData)
      : rec.templateData;

    const invoiceNumber = `INV-${Date.now()}`;
    const invoiceData = {
      ...template,
      invoiceNumber,
      status: 'draft',
      issuedDate: today,
    };

    // Create an entityRecord for the invoice
    await db.execute(sql`
      INSERT INTO "entityRecords"
        ("tenantId", "entityType", "data")
      VALUES
        (${rec.tenantId}, 'invoice', ${JSON.stringify(invoiceData)})
    `);
    invoicesCreated++;

    // Compute next run date
    const currentNext = new Date(rec.nextRunDate);
    const newNext = nextDate(currentNext, rec.frequency);
    const newNextStr = toDateString(newNext);

    // Determine if completed
    const isCompleted = rec.endDate && newNextStr > rec.endDate;

    await db.execute(sql`
      UPDATE "recurringInvoices"
      SET
        "lastRunDate" = ${today},
        "totalRuns" = "totalRuns" + 1,
        "nextRunDate" = ${newNextStr},
        "status" = ${isCompleted ? 'completed' : rec.status},
        "updatedAt" = now()
      WHERE "id" = ${rec.id}
    `);
  }

  return c.json({ processed: due.length, invoicesCreated });
});
