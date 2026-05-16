import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, sql, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { schema } from '@veska/core';
import { sharedQueueService } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { dispatchWebhookEvent } from '../middleware/webhook-events.js';
import { checkApprovalRequired } from '../lib/approval-gate.js';
import { sendInvoiceSentEmail } from '../lib/notification-mailer.js';

export const financeRouter = new Hono<{ Variables: TenantContext }>();

// ── Invoices ──────────────────────────────────────────────────

const invoicesQuerySchema = z.object({
  status: z.string().optional(),
  customer_id: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

financeRouter.get('/invoices', zValidator('query', invoicesQuerySchema), async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const { status, customer_id: customerId } = c.req.valid('query');

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

    if (record) {
      dispatchWebhookEvent({
        tenantId,
        db,
        event: 'invoice.created',
        resourceId: record.id,
        data: { id: record.id, tenantId, status: 'draft', total },
      });
    }

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

// ── Bulk Invoice Operations ───────────────────────────────────

financeRouter.post(
  '/invoices/bulk',
  zValidator(
    'json',
    z.object({
      ids: z.array(z.string()).min(1),
      action: z.enum(['send', 'void', 'delete']),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const { ids, action } = c.req.valid('json');

    let processed = 0;
    const failed: { id: string; error: string }[] = [];

    for (const id of ids) {
      try {
        const invoice = await db.query.entityRecords.findFirst({
          where: and(
            eq(schema.entityRecords.tenantId, tenantId),
            eq(schema.entityRecords.entityType, 'Invoice'),
            eq(schema.entityRecords.id, id),
            isNull(schema.entityRecords.deletedAt),
          ),
        });

        if (!invoice) {
          failed.push({ id, error: 'Invoice not found' });
          continue;
        }

        const invoiceData = invoice.data as Record<string, unknown>;

        if (action === 'send') {
          const approvalCheck = await checkApprovalRequired(
            db, tenantId, 'invoice', id, identityId,
            typeof invoiceData['total'] === 'number' ? invoiceData['total'] : undefined,
          );
          const newStatus = approvalCheck.required ? 'pending_approval' : 'sent';
          await db
            .update(schema.entityRecords)
            .set({
              data: { ...invoiceData, status: newStatus, sent_at: new Date().toISOString() },
              updatedAt: new Date(),
            })
            .where(eq(schema.entityRecords.id, id));
        } else if (action === 'void') {
          await db
            .update(schema.entityRecords)
            .set({
              data: { ...invoiceData, status: 'void' },
              updatedAt: new Date(),
            })
            .where(eq(schema.entityRecords.id, id));
        } else if (action === 'delete') {
          await db
            .update(schema.entityRecords)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(eq(schema.entityRecords.id, id));
        }

        processed++;
      } catch (err) {
        failed.push({ id, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return c.json({ processed, failed });
  },
);

// ── Invoice Export ────────────────────────────────────────────

financeRouter.get('/invoices/export', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const format = c.req.query('format') ?? 'csv';
  const idsParam = c.req.query('ids');

  if (format !== 'csv') {
    return c.json({ error: 'Only csv format is supported' }, 400);
  }

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Invoice'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (idsParam) {
    const idList = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (idList.length > 0) {
      conditions.push(inArray(schema.entityRecords.id, idList));
    }
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  const header = 'Invoice #,Customer,Date,Due Date,Amount,Status\n';
  const rows = records.map((r) => {
    const d = r.data as Record<string, unknown>;
    const number = String(d['number'] ?? d['invoiceNumber'] ?? r.id.slice(0, 8).toUpperCase());
    const customer = String(d['customer_name'] ?? d['clientName'] ?? d['customer'] ?? '');
    const date = String(d['issue_date'] ?? d['issuedAt'] ?? r.createdAt ?? '').slice(0, 10);
    const dueDate = String(d['due_date'] ?? d['dueDate'] ?? '').slice(0, 10);
    const amount = String(d['total'] ?? '0');
    const status = String(d['status'] ?? 'draft');
    return [number, customer, date, dueDate, amount, status]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(',');
  });

  const csv = header + rows.join('\n');

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', 'attachment; filename="invoices.csv"');
  return c.body(csv);
});

financeRouter.patch('/invoices/:id/send', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId, identityId } = c.get('tenantCtx');

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
  const invoiceTotal = typeof invoiceData['total'] === 'number' ? invoiceData['total'] : undefined;

  // Check if an approval chain is configured for invoices
  const approvalCheck = await checkApprovalRequired(db, tenantId, 'invoice', id, identityId, invoiceTotal);
  if (approvalCheck.required) {
    const [pendingInvoice] = await db
      .update(schema.entityRecords)
      .set({
        data: { ...invoiceData, status: 'pending_approval' },
        updatedAt: new Date(),
      })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    return c.json({ status: 'pending_approval', approvalTriggerId: approvalCheck.triggerId, invoice: pendingInvoice });
  }

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

  dispatchWebhookEvent({
    tenantId,
    db,
    event: 'invoice.sent',
    resourceId: id,
    data: { id, tenantId, status: 'sent' },
  });

  // Send invoice email to customer (fire-and-forget)
  void (async () => {
    try {
      const customerEmail =
        (invoiceData['customerEmail'] as string | undefined) ??
        (invoiceData['customer_email'] as string | undefined) ??
        ((invoiceData['customer'] as Record<string, unknown> | undefined)?.['email'] as string | undefined);

      if (!customerEmail) return;

      const portalBaseUrl = process.env['PORTAL_BASE_URL'] ?? 'http://localhost:3000';
      const portalUrl = `${portalBaseUrl}/invoices/${id}`;

      await sendInvoiceSentEmail({
        to: customerEmail,
        customerName:
          (invoiceData['customer_name'] as string | undefined) ??
          (invoiceData['clientName'] as string | undefined) ??
          ((invoiceData['customer'] as Record<string, unknown> | undefined)?.['name'] as string | undefined) ??
          'Valued Customer',
        invoiceNumber: (invoiceData['number'] as string | undefined) ?? id,
        amount: (invoiceData['total'] as number | undefined) ?? 0,
        currency: (invoiceData['currency'] as string | undefined) ?? 'USD',
        dueDate: (invoiceData['due_date'] as string | undefined) ?? '',
        portalUrl,
      });
    } catch (err) {
      console.error('[finance] invoice sent email failed:', err);
    }
  })();

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

    dispatchWebhookEvent({
      tenantId,
      db,
      event: 'invoice.paid',
      resourceId: id,
      data: { id, tenantId, status: 'paid', amount, payment_date, method },
    });

    return c.json({ invoice: updated, journal_id: journalId });
  },
);

// ── Ledger ────────────────────────────────────────────────────

const ledgerQuerySchema = z.object({
  account_code: z.string().optional(),
  period_year: z.string().optional(),
  period_month: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

financeRouter.get('/ledger', zValidator('query', ledgerQuerySchema), async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const { account_code: accountCode, period_year: periodYear, period_month: periodMonth } = c.req.valid('query');

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
