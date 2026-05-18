import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const roomsRouter = new Hono<{ Variables: TenantContext }>();

// ── Schemas ───────────────────────────────────────────────────

const RoomCreateSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional().nullable(),
  floor: z.string().optional().nullable(),
  capacity: z.number().int().positive().default(10),
  amenities: z.array(z.string()).default([]),
  status: z.enum(['available', 'maintenance', 'unavailable']).default('available'),
});

const RoomUpdateSchema = RoomCreateSchema.partial();

const BookingCreateSchema = z.object({
  title: z.string().min(1),
  bookedBy: z.string().min(1),
  startAt: z.string(),
  endAt: z.string(),
  attendeeCount: z.number().int().positive().default(1),
  notes: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
});

// ── Static routes first (before /:id) ────────────────────────

// GET /rooms/summary
roomsRouter.get('/summary', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const [totalRows, utilizationRows, topRoomsRows] = await Promise.all([
      sharedDb.execute(sql`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'available') AS available,
          COUNT(*) FILTER (WHERE status = 'maintenance') AS maintenance,
          COUNT(*) FILTER (WHERE status = 'unavailable') AS unavailable
        FROM "rooms"
        WHERE "tenantId" = ${tenantId}
      `),
      sharedDb.execute(sql`
        SELECT
          COUNT(*) AS "bookingsLast7Days"
        FROM "roomBookings"
        WHERE "tenantId" = ${tenantId}
          AND status = 'confirmed'
          AND "startAt" >= ${sevenDaysAgo}::timestamptz
          AND "startAt" <= ${now}::timestamptz
      `),
      sharedDb.execute(sql`
        SELECT r.id, r.name, COUNT(b.id) AS "bookingCount"
        FROM "rooms" r
        LEFT JOIN "roomBookings" b ON b."roomId" = r.id
          AND b."tenantId" = r."tenantId"
          AND b.status = 'confirmed'
          AND b."startAt" >= ${sevenDaysAgo}::timestamptz
        WHERE r."tenantId" = ${tenantId}
        GROUP BY r.id, r.name
        ORDER BY "bookingCount" DESC
        LIMIT 5
      `),
    ]);

    const totals = (totalRows as unknown as Record<string, unknown>[])[0] ?? {};
    const totalRooms = Number(totals['total'] ?? 0);
    const bookingsLast7 = Number((utilizationRows as unknown as Record<string, unknown>[])[0]?.['bookingsLast7Days'] ?? 0);

    // Theoretical max: rooms * (12 hours/day * 2 slots/hour * 7 days)
    const theoreticalMax = totalRooms * 12 * 2 * 7;
    const utilizationRate = theoreticalMax > 0 ? Math.round((bookingsLast7 / theoreticalMax) * 1000) / 10 : 0;

    return c.json({
      total: totalRooms,
      available: Number(totals['available'] ?? 0),
      maintenance: Number(totals['maintenance'] ?? 0),
      unavailable: Number(totals['unavailable'] ?? 0),
      utilizationRateLast7Days: utilizationRate,
      mostBookedRooms: topRoomsRows,
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /rooms/summary');
  }
});

// ── CRUD routes ───────────────────────────────────────────────

// GET /rooms
roomsRouter.get('/', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { status, minCapacity } = c.req.query();

    const rows = await sharedDb.execute(sql`
      SELECT * FROM "rooms"
      WHERE "tenantId" = ${tenantId}
        AND (${status ? sql`status = ${status}` : sql`TRUE`})
        AND (${minCapacity ? sql`capacity >= ${parseInt(minCapacity, 10)}` : sql`TRUE`})
      ORDER BY name ASC
    `);

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /rooms');
  }
});

// POST /rooms
roomsRouter.post('/', zValidator('json', RoomCreateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const body = c.req.valid('json');

    const rows = await sharedDb.execute(sql`
      INSERT INTO "rooms" ("tenantId", name, location, floor, capacity, amenities, status)
      VALUES (
        ${tenantId},
        ${body.name},
        ${body.location ?? null},
        ${body.floor ?? null},
        ${body.capacity},
        ${JSON.stringify(body.amenities)}::jsonb,
        ${body.status}
      )
      RETURNING *
    `);

    return c.json((rows as unknown as unknown[])[0], 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /rooms');
  }
});

// GET /rooms/:id
roomsRouter.get('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();
    const todayStart = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').toISOString();
    const todayEnd = new Date(new Date().toISOString().slice(0, 10) + 'T23:59:59Z').toISOString();

    const [roomRows, bookingRows] = await Promise.all([
      sharedDb.execute(sql`
        SELECT * FROM "rooms" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
      `),
      sharedDb.execute(sql`
        SELECT * FROM "roomBookings"
        WHERE "roomId" = ${id}
          AND "tenantId" = ${tenantId}
          AND status = 'confirmed'
          AND "startAt" >= ${todayStart}::timestamptz
          AND "startAt" <= ${todayEnd}::timestamptz
        ORDER BY "startAt" ASC
      `),
    ]);

    if ((roomRows as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    return c.json({
      ...(roomRows as unknown as Record<string, unknown>[])[0],
      todaySchedule: bookingRows,
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /rooms/:id');
  }
});

// PUT /rooms/:id
roomsRouter.put('/:id', zValidator('json', RoomUpdateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const check = await sharedDb.execute(sql`
      SELECT id FROM "rooms" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if ((check as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    const parts: ReturnType<typeof sql>[] = [sql`"updatedAt" = now()`];

    if (body.name !== undefined) parts.push(sql`name = ${body.name}`);
    if (body.location !== undefined) parts.push(sql`location = ${body.location}`);
    if (body.floor !== undefined) parts.push(sql`floor = ${body.floor}`);
    if (body.capacity !== undefined) parts.push(sql`capacity = ${body.capacity}`);
    if (body.amenities !== undefined) parts.push(sql`amenities = ${JSON.stringify(body.amenities)}::jsonb`);
    if (body.status !== undefined) parts.push(sql`status = ${body.status}`);

    const setClauses = parts.reduce((acc, p) => sql`${acc}, ${p}`);

    const rows = await sharedDb.execute(sql`
      UPDATE "rooms"
      SET ${setClauses}
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    return c.json((rows as unknown as unknown[])[0]);
  } catch (err) {
    return handleRouteError(c, err, 'PUT /rooms/:id');
  }
});

// DELETE /rooms/:id — soft delete
roomsRouter.delete('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const rows = await sharedDb.execute(sql`
      UPDATE "rooms"
      SET status = 'unavailable', "updatedAt" = now()
      WHERE id = ${id} AND "tenantId" = ${tenantId}
      RETURNING id
    `);

    if ((rows as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /rooms/:id');
  }
});

// ── Availability ──────────────────────────────────────────────

// GET /rooms/:id/availability?date=<YYYY-MM-DD>
roomsRouter.get('/:id/availability', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();
    const date = c.req.query('date') ?? new Date().toISOString().slice(0, 10);

    const dayStart = `${date}T08:00:00Z`;
    const dayEnd = `${date}T20:00:00Z`;

    const [roomRows, bookingRows] = await Promise.all([
      sharedDb.execute(sql`
        SELECT id FROM "rooms" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
      `),
      sharedDb.execute(sql`
        SELECT id AS "bookingId", title, "bookedBy", "startAt", "endAt", "attendeeCount"
        FROM "roomBookings"
        WHERE "roomId" = ${id}
          AND "tenantId" = ${tenantId}
          AND status = 'confirmed'
          AND NOT ("endAt" <= ${dayStart}::timestamptz OR "startAt" >= ${dayEnd}::timestamptz)
        ORDER BY "startAt" ASC
      `),
    ]);

    if ((roomRows as unknown as unknown[]).length === 0) return c.json({ error: 'Not found' }, 404);

    const bookings = bookingRows as unknown as Array<{ startAt: string; endAt: string }>;

    // Generate 30-min slots from 08:00 to 20:00
    const slots: Array<{ slotStart: string; slotEnd: string; available: boolean }> = [];
    const baseDate = new Date(`${date}T08:00:00Z`);
    const endSlot = new Date(`${date}T20:00:00Z`);

    while (baseDate < endSlot) {
      const slotStart = baseDate.toISOString();
      baseDate.setMinutes(baseDate.getMinutes() + 30);
      const slotEnd = baseDate.toISOString();

      const overlap = bookings.some((b) => {
        return !(new Date(b.endAt) <= new Date(slotStart) || new Date(b.startAt) >= new Date(slotEnd));
      });

      slots.push({ slotStart, slotEnd, available: !overlap });
    }

    return c.json({
      date,
      bookings: bookingRows,
      availableSlots: slots.filter((s) => s.available).map((s) => ({ slotStart: s.slotStart, slotEnd: s.slotEnd })),
      allSlots: slots,
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /rooms/:id/availability');
  }
});

// ── Bookings ──────────────────────────────────────────────────

// POST /rooms/:id/bookings
roomsRouter.post('/:id/bookings', zValidator('json', BookingCreateSchema), async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const roomCheck = await sharedDb.execute(sql`
      SELECT id FROM "rooms" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if ((roomCheck as unknown as unknown[]).length === 0) return c.json({ error: 'Room not found' }, 404);

    // Conflict check
    const conflicts = await sharedDb.execute(sql`
      SELECT id, title, "bookedBy", "startAt", "endAt"
      FROM "roomBookings"
      WHERE "roomId" = ${id}
        AND "tenantId" = ${tenantId}
        AND status = 'confirmed'
        AND NOT ("endAt" <= ${body.startAt}::timestamptz OR "startAt" >= ${body.endAt}::timestamptz)
    `);

    if ((conflicts as unknown as unknown[]).length > 0) {
      return c.json({ error: 'Room is already booked', conflicts }, 409);
    }

    const rows = await sharedDb.execute(sql`
      INSERT INTO "roomBookings" (
        "tenantId", "roomId", "eventId", title, "bookedBy",
        "startAt", "endAt", "attendeeCount", notes
      ) VALUES (
        ${tenantId},
        ${id},
        ${body.eventId ?? null},
        ${body.title},
        ${body.bookedBy},
        ${body.startAt}::timestamptz,
        ${body.endAt}::timestamptz,
        ${body.attendeeCount},
        ${body.notes ?? null}
      )
      RETURNING *
    `);

    return c.json((rows as unknown as unknown[])[0], 201);
  } catch (err) {
    return handleRouteError(c, err, 'POST /rooms/:id/bookings');
  }
});

// GET /rooms/:id/bookings
roomsRouter.get('/:id/bookings', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();
    const { from, to } = c.req.query();

    const roomCheck = await sharedDb.execute(sql`
      SELECT id FROM "rooms" WHERE id = ${id} AND "tenantId" = ${tenantId} LIMIT 1
    `);
    if ((roomCheck as unknown as unknown[]).length === 0) return c.json({ error: 'Room not found' }, 404);

    const rows = await sharedDb.execute(sql`
      SELECT * FROM "roomBookings"
      WHERE "roomId" = ${id}
        AND "tenantId" = ${tenantId}
        AND (${from ? sql`"startAt" >= ${from}::timestamptz` : sql`TRUE`})
        AND (${to ? sql`"endAt" <= ${to}::timestamptz` : sql`TRUE`})
      ORDER BY "startAt" ASC
    `);

    return c.json(rows);
  } catch (err) {
    return handleRouteError(c, err, 'GET /rooms/:id/bookings');
  }
});

// DELETE /rooms/:id/bookings/:bookingId
roomsRouter.delete('/:id/bookings/:bookingId', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id, bookingId } = c.req.param();

    const rows = await sharedDb.execute(sql`
      UPDATE "roomBookings"
      SET status = 'cancelled'
      WHERE id = ${bookingId}
        AND "roomId" = ${id}
        AND "tenantId" = ${tenantId}
      RETURNING id
    `);

    if ((rows as unknown as unknown[]).length === 0) return c.json({ error: 'Booking not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /rooms/:id/bookings/:bookingId');
  }
});
