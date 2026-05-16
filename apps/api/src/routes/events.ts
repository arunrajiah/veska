import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const eventsRouter = new Hono<{ Variables: TenantContext }>();

// ── Schemas ───────────────────────────────────────────────────

const EventCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(['meeting', 'training', 'social', 'announcement', 'holiday', 'general']).default('general'),
  startAt: z.string(),
  endAt: z.string(),
  allDay: z.boolean().default(false),
  location: z.string().optional().nullable(),
  roomId: z.string().optional().nullable(),
  organizerId: z.string().min(1),
  maxAttendees: z.number().int().positive().optional().nullable(),
  isPublic: z.boolean().default(true),
  meetingUrl: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
});

const EventUpdateSchema = EventCreateSchema.partial();

const AttendeeAddSchema = z.object({
  userId: z.string().min(1),
  userEmail: z.string().optional().nullable(),
  userName: z.string().optional().nullable(),
});

const RsvpSchema = z.object({
  status: z.enum(['accepted', 'declined', 'tentative']),
});

// ── Static routes first (before /:id) ────────────────────────

// GET /events/calendar?year=<>&month=<>
eventsRouter.get('/calendar', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const now = new Date();
    const year = parseInt(c.req.query('year') ?? String(now.getFullYear()), 10);
    const month = parseInt(c.req.query('month') ?? String(now.getMonth() + 1), 10);

    // Build month range
    const monthStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const monthEnd = new Date(Date.UTC(year, month, 1)).toISOString();

    const rows = await sharedDb.execute(sql`
      SELECT
        e.*,
        COUNT(a.id) AS "attendeeCount"
      FROM "events" e
      LEFT JOIN "eventAttendees" a ON a."eventId" = e.id AND a."tenantId" = e."tenantId"
      WHERE e."tenantId" = ${tenantId}
        AND e."startAt" < ${monthEnd}::timestamptz
        AND e."endAt" >= ${monthStart}::timestamptz
      GROUP BY e.id
      ORDER BY e."startAt" ASC
    `);

    // Group by day (YYYY-MM-DD of startAt in UTC)
    const grouped: Record<string, unknown[]> = {};
    for (const row of rows as Record<string, unknown>[]) {
      const startAt = row['startAt'] as string;
      const day = new Date(startAt).toISOString().slice(0, 10);
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(row);
    }

    return c.json(grouped);
  } catch (err) {
    return handleRouteError(c, err, 'GET /events/calendar');
  }
});

// GET /events/my?userId=<>
eventsRouter.get('/my', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const userId = c.req.query('userId') ?? '';

    if (!userId) return c.json({ error: 'userId is required' }, 400);

    const now = new Date().toISOString();
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const rows = await sharedDb.execute(sql`
      SELECT DISTINCT
        e.*,
        COUNT(a.id) AS "attendeeCount"
      FROM "events" e
      LEFT JOIN "eventAttendees" a ON a."eventId" = e.id AND a."tenantId" = e."tenantId"
      WHERE e."tenantId" = ${tenantId}
        AND e."startAt" >= ${now}::timestamptz
        AND e."startAt" <= ${thirtyDaysLater}::timestamptz
        AND (
          e."organizerId" = ${userId}
          OR EXISTS (
            SELECT 1 FROM "eventAttendees" ea
            WHERE ea."eventId" = e.id
              AND ea."tenantId" = e."tenantId"
              AND ea."userId" = ${userId}
              AND ea.status IN ('accepted', 'tentative')
          )
        )
      GROUP BY e.id
      ORDER BY e."startAt" ASC
    `);

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /events/my');
  }
});

// ── CRUD routes ───────────────────────────────────────────────

// GET /events
eventsRouter.get('/', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { from, to, type, organizerId } = c.req.query();

    const rows = await sharedDb.execute(sql`
      SELECT
        e.*,
        COUNT(a.id) AS "attendeeCount"
      FROM "events" e
      LEFT JOIN "eventAttendees" a ON a."eventId" = e.id AND a."tenantId" = e."tenantId"
      WHERE e."tenantId" = ${tenantId}
        AND (${from ? sql`e."startAt" >= ${from}::timestamptz` : sql`TRUE`})
        AND (${to ? sql`e."endAt" <= ${to}::timestamptz` : sql`TRUE`})
        AND (${type ? sql`e.type = ${type}` : sql`TRUE`})
        AND (${organizerId ? sql`e."organizerId" = ${organizerId}` : sql`TRUE`})
      GROUP BY e.id
      ORDER BY e."startAt" ASC
    `);

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /events');
  }
});

// POST /events
eventsRouter.post('/', zValidator('json', EventCreateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const rows = await sharedDb.execute(sql`
      INSERT INTO "events" (
        "tenantId", title, description, type, status,
        "startAt", "endAt", "allDay", location, "roomId",
        "organizerId", "maxAttendees", "isPublic", "meetingUrl", tags
      ) VALUES (
        ${tenantId},
        ${body.title},
        ${body.description ?? null},
        ${body.type},
        'scheduled',
        ${body.startAt}::timestamptz,
        ${body.endAt}::timestamptz,
        ${body.allDay},
        ${body.location ?? null},
        ${body.roomId ?? null},
        ${body.organizerId},
        ${body.maxAttendees ?? null},
        ${body.isPublic},
        ${body.meetingUrl ?? null},
        ${JSON.stringify(body.tags)}::jsonb
      )
      RETURNING *
    `);

    const event = (rows as Record<string, unknown>[])[0];
    if (!event) return c.json({ error: 'Failed to create event' }, 500);

    // Auto-create room booking if roomId provided
    if (body.roomId) {
      await sharedDb.execute(sql`
        INSERT INTO "roomBookings" (
          "tenantId", "roomId", "eventId", title, "bookedBy",
          "startAt", "endAt", "attendeeCount"
        ) VALUES (
          ${tenantId},
          ${body.roomId},
          ${event['id'] as string},
          ${body.title},
          ${body.organizerId},
          ${body.startAt}::timestamptz,
          ${body.endAt}::timestamptz,
          1
        )
      `);
    }

    return c.json(event, 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /events');
  }
});

// GET /events/:id
eventsRouter.get('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const [eventRows, attendeeRows] = await Promise.all([
      sharedDb.execute(sql`
        SELECT * FROM "events"
        WHERE id = ${id} AND "tenantId" = ${tenantId}
        LIMIT 1
      `),
      sharedDb.execute(sql`
        SELECT * FROM "eventAttendees"
        WHERE "eventId" = ${id} AND "tenantId" = ${tenantId}
        ORDER BY "createdAt" ASC
      `),
    ]);

    if ((eventRows as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    return c.json({
      ...(eventRows as Record<string, unknown>[])[0],
      attendees: attendeeRows,
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /events/:id');
  }
});

// PUT /events/:id
eventsRouter.put('/:id', zValidator('json', EventUpdateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const check = await sharedDb.execute(sql`
      SELECT id FROM "events" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if ((check as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    const parts: ReturnType<typeof sql>[] = [sql`"updatedAt" = now()`];

    if (body.title !== undefined) parts.push(sql`title = ${body.title}`);
    if (body.description !== undefined) parts.push(sql`description = ${body.description}`);
    if (body.type !== undefined) parts.push(sql`type = ${body.type}`);
    if (body.startAt !== undefined) parts.push(sql`"startAt" = ${body.startAt}::timestamptz`);
    if (body.endAt !== undefined) parts.push(sql`"endAt" = ${body.endAt}::timestamptz`);
    if (body.allDay !== undefined) parts.push(sql`"allDay" = ${body.allDay}`);
    if (body.location !== undefined) parts.push(sql`location = ${body.location}`);
    if (body.roomId !== undefined) parts.push(sql`"roomId" = ${body.roomId}`);
    if (body.organizerId !== undefined) parts.push(sql`"organizerId" = ${body.organizerId}`);
    if (body.maxAttendees !== undefined) parts.push(sql`"maxAttendees" = ${body.maxAttendees}`);
    if (body.isPublic !== undefined) parts.push(sql`"isPublic" = ${body.isPublic}`);
    if (body.meetingUrl !== undefined) parts.push(sql`"meetingUrl" = ${body.meetingUrl}`);
    if (body.tags !== undefined) parts.push(sql`tags = ${JSON.stringify(body.tags)}::jsonb`);

    const setClauses = parts.reduce((acc, p) => sql`${acc}, ${p}`);

    const rows = await sharedDb.execute(sql`
      UPDATE "events"
      SET ${setClauses}
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    return c.json((rows as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /events/:id');
  }
});

// DELETE /events/:id
eventsRouter.delete('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const check = await sharedDb.execute(sql`
      SELECT id FROM "events" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if ((check as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    await sharedDb.execute(sql`
      DELETE FROM "events" WHERE id = ${id} AND "tenantId" = ${tenantId}
    `);

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /events/:id');
  }
});

// PUT /events/:id/cancel
eventsRouter.put('/:id/cancel', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const rows = await sharedDb.execute(sql`
      UPDATE "events"
      SET status = 'cancelled', "updatedAt" = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    if ((rows as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    // Cancel linked room booking
    await sharedDb.execute(sql`
      UPDATE "roomBookings"
      SET status = 'cancelled'
      WHERE "eventId" = ${id} AND "tenantId" = ${tenantId} AND status = 'confirmed'
    `);

    return c.json((rows as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /events/:id/cancel');
  }
});

// ── Attendee routes ───────────────────────────────────────────

// POST /events/:id/attendees
eventsRouter.post('/:id/attendees', zValidator('json', AttendeeAddSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();
    const body = c.req.valid('json');

    // Verify event exists and check maxAttendees
    const eventRows = await sharedDb.execute(sql`
      SELECT id, "maxAttendees" FROM "events"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      LIMIT 1
    `);
    if ((eventRows as unknown[]).length === 0) return c.json({ error: 'Event not found' }, 404);

    const event = (eventRows as Record<string, unknown>[])[0];
    const maxAttendees = event['maxAttendees'] as number | null;

    if (maxAttendees !== null) {
      const countRows = await sharedDb.execute(sql`
        SELECT COUNT(*) AS count FROM "eventAttendees"
        WHERE "eventId" = ${id} AND "tenantId" = ${tenantId}
      `);
      const currentCount = Number((countRows as Record<string, unknown>[])[0]?.['count'] ?? 0);
      if (currentCount >= maxAttendees) {
        return c.json({ error: 'Event has reached maximum attendees' }, 409);
      }
    }

    const rows = await sharedDb.execute(sql`
      INSERT INTO "eventAttendees" ("tenantId", "eventId", "userId", "userEmail", "userName")
      VALUES (${tenantId}, ${id}, ${body.userId}, ${body.userEmail ?? null}, ${body.userName ?? null})
      ON CONFLICT ("tenantId", "eventId", "userId") DO UPDATE
        SET "userEmail" = EXCLUDED."userEmail",
            "userName"  = EXCLUDED."userName"
      RETURNING *
    `);

    return c.json((rows as unknown[])[0], 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /events/:id/attendees');
  }
});

// PUT /events/:id/attendees/:userId/rsvp
eventsRouter.put('/:id/attendees/:userId/rsvp', zValidator('json', RsvpSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id, userId } = c.req.param();
    const { status } = c.req.valid('json');

    const rows = await sharedDb.execute(sql`
      UPDATE "eventAttendees"
      SET status = ${status}, "respondedAt" = now()
      WHERE "eventId" = ${id} AND "userId" = ${userId} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    if ((rows as unknown[]).length === 0) return c.json({ error: 'Attendee not found' }, 404);
    return c.json((rows as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /events/:id/attendees/:userId/rsvp');
  }
});

// DELETE /events/:id/attendees/:userId
eventsRouter.delete('/:id/attendees/:userId', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id, userId } = c.req.param();

    const check = await sharedDb.execute(sql`
      SELECT id FROM "eventAttendees"
      WHERE "eventId" = ${id} AND "userId" = ${userId} AND "tenantId" = ${tenantId}
      LIMIT 1
    `);
    if ((check as unknown[]).length === 0) return c.json({ error: 'Attendee not found' }, 404);

    await sharedDb.execute(sql`
      DELETE FROM "eventAttendees"
      WHERE "eventId" = ${id} AND "userId" = ${userId} AND "tenantId" = ${tenantId}
    `);

    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /events/:id/attendees/:userId');
  }
});
