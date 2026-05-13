import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { schema } from '@veska/core';
import { sharedQueueService } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const financeRouter = new Hono<{ Variables: TenantContext }>();

// ── Invoices ──────────────────────────────────────────────────

financeRouter.get('/invoices', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const status = c.req.query('status');
  const customerId = c.req.query('customer_id');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Invoice'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (status) {
    conditions.push(sql`${schema.entityRecords.data}->>'status' = ${status}`);
  }
  if (customerId) {
    conditions.push(sql`${schema.entityRecords.data}->>'customer_id' = ${customerId}`);
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  return c.json(records);
});

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
});

financeRouter.post(
  '/invoices',
  zValidator(
    'json',
    z.object({
      number: z.string().optional(),
      customer_id: z.string().min(1),
      issue_date: z.string(),
      due_date: z.string(),
      line_items: z.array(lineItemSchema).min(1),
      currency: z.string().default('USD'),
      notes: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const subtotal = body.line_items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0,
    );
    const total = subtotal;

    const invoiceNumber = body.number ?? `INV-${Date.now()}`;

    const data = {
      ...body,
      number: invoiceNumber,
      subtotal,
      total,
      status: 'draft',
    };

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Invoice', data, createdBy: identityId })
      .returning();

    return c.json(record, 201);
  },
);

financeRouter.get('/invoices/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Invoice'),
      eq(schema.entityRecords.id, id),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!record) return c.json({ error: 'Invoice not found' }, 404);
  return c.json(record);
});

financeRouter.patch('/invoices/:id/send', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const invoice = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Invoice'),
      eq(schema.entityRecords.id, id),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!invoice) return c.json({ error: 'Invoice not found' }, 404);

  const invoiceData = invoice.data as Record<string, unknown>;
  const [updated] = await db
    .update(schema.entityRecords)
    .set({
      data: { ...invoiceData, status: 'sent', sent_at: new Date().toISOString() },
      updatedAt: new Date(),
    })
    .where(eq(schema.entityRecords.id, id))
    .returning();

  const customerId = invoiceData['customer_id'] as string | undefined;

  await sharedQueueService.enqueue('channel.send_message', {
    tenantId,
    channelName: 'email',
    recipientChannelId: customerId ?? '',
    message: {
      text: `Your invoice ${invoiceData['number'] as string} is ready. Please review and pay at your earliest convenience.`,
      magicLink: {
        label: 'View Invoice',
        url: `${process.env['MAGIC_LINK_BASE_URL'] ?? 'http://localhost:3001'}/invoices/${id}`,
      },
    },
  });

  return c.json(updated);
});

financeRouter.patch(
  '/invoices/:id/mark-paid',
  zValidator(
    'json',
    z.object({
      amount: z.number().positive(),
      payment_date: z.string(),
      method: z.string().optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const { amount, payment_date, method } = c.req.valid('json');

    const invoice = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Invoice'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!invoice) return c.json({ error: 'Invoice not found' }, 404);

    const invoiceData = invoice.data as Record<string, unknown>;
    const currency = (invoiceData['currency'] as string | undefined) ?? 'USD';
    const amountCents = Math.round(amount * 100).toString();
    const journalId = randomUUID();
    const postedAt = new Date(payment_date);
    const periodYear = postedAt.getFullYear().toString();
    const periodMonth = (postedAt.getMonth() + 1).toString().padStart(2, '0');
    const description = `Payment for invoice ${invoiceData['number'] as string}`;

    // Debit Cash/Bank (1000), Credit Revenue (4000)
    await db.insert(schema.ledgerEntries).values([
      {
        tenantId,
        journalId,
        accountCode: '1000',
        debitAmount: amountCents,
        creditAmount: '0',
        currency,
        description,
        referenceType: 'Invoice',
        referenceId: id,
        postedAt,
        periodYear,
        periodMonth,
        createdBy: identityId,
      },
      {
        tenantId,
        journalId,
        accountCode: '4000',
        debitAmount: '0',
        creditAmount: amountCents,
        currency,
        description,
        referenceType: 'Invoice',
        referenceId: id,
        postedAt,
        periodYear,
        periodMonth,
        createdBy: identityId,
      },
    ]);

    const [updated] = await db
      .update(schema.entityRecords)
      .set({
        data: {
          ...invoiceData,
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_date,
          payment_method: method,
          amount_paid: amount,
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    return c.json({ invoice: updated, journal_id: journalId });
  },
);

// ── Ledger ────────────────────────────────────────────────────

financeRouter.get('/ledger', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const accountCode = c.req.query('account_code');
  const periodYear = c.req.query('period_year');
  const periodMonth = c.req.query('period_month');

  const conditions = [eq(schema.ledgerEntries.tenantId, tenantId)];

  if (accountCode) {
    conditions.push(eq(schema.ledgerEntries.accountCode, accountCode));
  }
  if (periodYear) {
    conditions.push(eq(schema.ledgerEntries.periodYear, periodYear));
  }
  if (periodMonth) {
    conditions.push(eq(schema.ledgerEntries.periodMonth, periodMonth));
  }

  const entries = await db.query.ledgerEntries.findMany({
    where: and(...conditions),
  });

  return c.json(entries);
});

financeRouter.get('/ledger/balance', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');

  const now = new Date();
  const periodYear = now.getFullYear().toString();
  const periodMonth = (now.getMonth() + 1).toString().padStart(2, '0');

  const rows = await db
    .select({
      accountCode: schema.ledgerEntries.accountCode,
      totalDebits: sql<string>`sum(${schema.ledgerEntries.debitAmount}::bigint)`,
      totalCredits: sql<string>`sum(${schema.ledgerEntries.creditAmount}::bigint)`,
    })
    .from(schema.ledgerEntries)
    .where(
      and(
        eq(schema.ledgerEntries.tenantId, tenantId),
        eq(schema.ledgerEntries.periodYear, periodYear),
        eq(schema.ledgerEntries.periodMonth, periodMonth),
      ),
    )
    .groupBy(schema.ledgerEntries.accountCode);

  return c.json({ period_year: periodYear, period_month: periodMonth, balances: rows });
});

// ── Journal ───────────────────────────────────────────────────

const journalEntrySchema = z.object({
  account_code: z.string().min(1),
  debit_amount: z.number().nonnegative(),
  credit_amount: z.number().nonnegative(),
  description: z.string().min(1),
});

financeRouter.post(
  '/journal',
  zValidator(
    'json',
    z.object({
      entries: z.array(journalEntrySchema).min(2),
      reference_type: z.string().optional(),
      reference_id: z.string().uuid().optional(),
      description: z.string().min(1),
      currency: z.string().default('USD'),
      posted_at: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const totalDebits = body.entries.reduce((sum, e) => sum + e.debit_amount, 0);
    const totalCredits = body.entries.reduce((sum, e) => sum + e.credit_amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      return c.json(
        { error: 'Journal does not balance: debits must equal credits' },
        422,
      );
    }

    const journalId = randomUUID();
    const postedAt = body.posted_at ? new Date(body.posted_at) : new Date();
    const periodYear = postedAt.getFullYear().toString();
    const periodMonth = (postedAt.getMonth() + 1).toString().padStart(2, '0');

    const rows = body.entries.map((entry) => ({
      tenantId,
      journalId,
      accountCode: entry.account_code,
      debitAmount: Math.round(entry.debit_amount * 100).toString(),
      creditAmount: Math.round(entry.credit_amount * 100).toString(),
      currency: body.currency,
      description: entry.description,
      referenceType: body.reference_type,
      referenceId: body.reference_id,
      postedAt,
      periodYear,
      periodMonth,
      createdBy: identityId,
    }));

    const created = await db.insert(schema.ledgerEntries).values(rows).returning();

    return c.json({ journal_id: journalId, entries: created }, 201);
  },
);
