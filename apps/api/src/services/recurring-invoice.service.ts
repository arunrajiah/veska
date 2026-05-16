import { and, eq, lte } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { Database } from '@veska/core';
import { dispatchWebhookEvent } from '../middleware/webhook-events.js';

// ── Date helpers ───────────────────────────────────────────────

export function calculateNextRun(frequency: string, from: Date): Date {
  const d = new Date(from);
  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

// ── Process a single schedule ──────────────────────────────────

export async function processSchedule(
  db: Database,
  schedule: typeof schema.recurringInvoiceSchedules.$inferSelect,
): Promise<void> {
  // Load template invoice entity record
  const template = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, schedule.tenantId),
      eq(schema.entityRecords.entityType, 'Invoice'),
      eq(schema.entityRecords.id, schedule.templateInvoiceId),
    ),
  });

  if (!template) {
    throw new Error(`Template invoice ${schedule.templateInvoiceId} not found`);
  }

  const templateData = template.data as Record<string, unknown>;

  // Build new invoice data
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Compute due date: honor original payment terms or default 30 days
  const dueDays =
    typeof templateData['due_in_days'] === 'number'
      ? templateData['due_in_days']
      : 30;
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + dueDays);
  const dueDateStr = dueDate.toISOString().slice(0, 10);

  // Generate invoice number based on timestamp
  const invoiceNumber = `INV-${Date.now()}`;

  const newData: Record<string, unknown> = {
    ...templateData,
    number: invoiceNumber,
    invoiceNumber,
    status: 'draft',
    issuedAt: todayStr,
    issue_date: todayStr,
    dueDate: dueDateStr,
    due_date: dueDateStr,
    recurringScheduleId: schedule.id,
  };

  // Insert the new invoice entity record
  const [newRecord] = await db
    .insert(schema.entityRecords)
    .values({
      tenantId: schedule.tenantId,
      entityType: 'Invoice',
      data: newData,
    })
    .returning();

  if (newRecord) {
    dispatchWebhookEvent({
      tenantId: schedule.tenantId,
      db,
      event: 'invoice.created',
      resourceId: newRecord.id,
      data: {
        id: newRecord.id,
        tenantId: schedule.tenantId,
        status: 'draft',
        total: templateData['total'],
        recurringScheduleId: schedule.id,
      },
    });
  }

  // Update schedule timestamps
  const nextRunAt = calculateNextRun(schedule.frequency, schedule.nextRunAt);

  await db
    .update(schema.recurringInvoiceSchedules)
    .set({
      lastRunAt: today,
      nextRunAt,
      updatedAt: today,
    })
    .where(eq(schema.recurringInvoiceSchedules.id, schedule.id));
}

// ── Process all due schedules ──────────────────────────────────

export async function processAllDue(
  db: Database,
): Promise<{ processed: number; errors: number }> {
  const now = new Date();

  const dueSchedules = await db.query.recurringInvoiceSchedules.findMany({
    where: and(
      eq(schema.recurringInvoiceSchedules.enabled, true),
      lte(schema.recurringInvoiceSchedules.nextRunAt, now),
    ),
  });

  let processed = 0;
  let errors = 0;

  for (const schedule of dueSchedules) {
    try {
      await processSchedule(db, schedule);
      processed++;
    } catch (err) {
      errors++;
      console.error(
        `[recurring-invoices] Error processing schedule ${schedule.id}:`,
        err,
      );
    }
  }

  return { processed, errors };
}
