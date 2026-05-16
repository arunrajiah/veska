import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, ilike, sql } from 'drizzle-orm';
import { schema } from '@veska/core';
import { sharedQueueService, sharedAuditService } from '../shared.js';
import { broadcast } from './sse.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { dispatchWebhookEvent } from '../middleware/webhook-events.js';

export const supportRouter = new Hono<{ Variables: TenantContext }>();

const TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
] as const;

// ── Tickets ───────────────────────────────────────────────────

supportRouter.get('/tickets', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const assigneeId = c.req.query('assignee_id');
  const q = c.req.query('q');

  const conditions = [
    eq(schema.entityRecords.tenantId, tenantId),
    eq(schema.entityRecords.entityType, 'Ticket'),
    isNull(schema.entityRecords.deletedAt),
  ];

  if (status) {
    conditions.push(sql`${schema.entityRecords.data}->>'status' = ${status}`);
  }
  if (priority) {
    conditions.push(sql`${schema.entityRecords.data}->>'priority' = ${priority}`);
  }
  if (assigneeId) {
    conditions.push(sql`${schema.entityRecords.data}->>'assignee_id' = ${assigneeId}`);
  }
  if (q) {
    conditions.push(ilike(sql`${schema.entityRecords.data}->>'subject'`, `%${q}%`));
  }

  const records = await db.query.entityRecords.findMany({
    where: and(...conditions),
  });

  return c.json(records);
});

supportRouter.post(
  '/tickets',
  zValidator(
    'json',
    z.object({
      subject: z.string().min(1),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
      contact_id: z.string().uuid().optional(),
      channel: z.string().optional(),
    }),
  ),
  async (c) => {
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const ticketNumber = `TKT-${Date.now()}`;
    const data = {
      ...body,
      ticket_number: ticketNumber,
      status: 'open',
    };

    const [record] = await db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: 'Ticket', data, createdBy: identityId })
      .returning();

    // Broadcast ticket creation to SSE subscribers
    broadcast(tenantId, { type: 'ticket.created', payload: { id: record?.id } });

    if (record) {
      dispatchWebhookEvent({
        tenantId,
        db,
        event: 'ticket.created',
        resourceId: record.id,
        data: { id: record.id, tenantId, subject: body.subject, priority: body.priority, status: 'open' },
      });
    }

    return c.json(record, 201);
  },
);

supportRouter.get('/tickets/:id', async (c) => {
  const id = c.req.param('id');
  const { db, tenantId } = c.get('tenantCtx');

  const record = await db.query.entityRecords.findFirst({
    where: and(
      eq(schema.entityRecords.tenantId, tenantId),
      eq(schema.entityRecords.entityType, 'Ticket'),
      eq(schema.entityRecords.id, id),
      isNull(schema.entityRecords.deletedAt),
    ),
  });

  if (!record) return c.json({ error: 'Ticket not found' }, 404);
  return c.json(record);
});

supportRouter.patch(
  '/tickets/:id/status',
  zValidator(
    'json',
    z.object({
      status: z.enum(TICKET_STATUSES),
      note: z.string().optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const { status, note } = c.req.valid('json');

    const ticket = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Ticket'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!ticket) return c.json({ error: 'Ticket not found' }, 404);

    const before = ticket.data;
    const after: Record<string, unknown> = {
      ...(ticket.data as Record<string, unknown>),
      status,
    };
    if (note) after['status_note'] = note;

    const [updated] = await db
      .update(schema.entityRecords)
      .set({ data: after, updatedAt: new Date() })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    await sharedAuditService.log({
      tenantId,
      actorIdentityId: identityId,
      actorType: 'employee',
      action: 'ticket.status_changed',
      resourceType: 'Ticket',
      resourceId: id,
      before,
      after,
      metadata: { note },
    });

    dispatchWebhookEvent({
      tenantId,
      db,
      event: 'ticket.updated',
      resourceId: id,
      data: { id, tenantId, status, note },
    });

    return c.json(updated);
  },
);

supportRouter.patch(
  '/tickets/:id/assign',
  zValidator('json', z.object({ assignee_id: z.string().min(1) })),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId } = c.get('tenantCtx');
    const { assignee_id } = c.req.valid('json');

    const ticket = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Ticket'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!ticket) return c.json({ error: 'Ticket not found' }, 404);

    const [updated] = await db
      .update(schema.entityRecords)
      .set({
        data: { ...(ticket.data as Record<string, unknown>), assignee_id },
        updatedAt: new Date(),
      })
      .where(eq(schema.entityRecords.id, id))
      .returning();

    return c.json(updated);
  },
);

supportRouter.post(
  '/tickets/:id/reply',
  zValidator(
    'json',
    z.object({
      message: z.string().min(1),
      channel: z.string().optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id');
    const { db, tenantId, identityId } = c.get('tenantCtx');
    const { message, channel } = c.req.valid('json');

    const ticket = await db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, 'Ticket'),
        eq(schema.entityRecords.id, id),
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!ticket) return c.json({ error: 'Ticket not found' }, 404);

    const ticketData = ticket.data as Record<string, unknown>;
    const replyChannel = channel ?? (ticketData['channel'] as string | undefined) ?? 'email';
    const contactId = ticketData['contact_id'] as string | undefined;

    await sharedQueueService.enqueue('channel.send_message', {
      tenantId,
      channelName: replyChannel,
      recipientChannelId: contactId ?? '',
      message: { text: message },
    });

    await sharedAuditService.log({
      tenantId,
      actorIdentityId: identityId,
      actorType: 'employee',
      action: 'ticket.reply_sent',
      resourceType: 'Ticket',
      resourceId: id,
      metadata: { channel: replyChannel, message },
    });

    return c.json({ success: true, ticket_id: id });
  },
);
