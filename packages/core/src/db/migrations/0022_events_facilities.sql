-- Events
CREATE TABLE IF NOT EXISTS "events" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT NOT NULL DEFAULT 'general', -- 'meeting'|'training'|'social'|'announcement'|'holiday'|'general'
  status          TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled'|'cancelled'|'completed'
  "startAt"       TIMESTAMPTZ NOT NULL,
  "endAt"         TIMESTAMPTZ NOT NULL,
  "allDay"        BOOLEAN NOT NULL DEFAULT false,
  location        TEXT,
  "roomId"        TEXT,   -- optional FK to rooms
  "organizerId"   TEXT NOT NULL,
  "maxAttendees"  INTEGER,
  "isPublic"      BOOLEAN NOT NULL DEFAULT true,
  "meetingUrl"    TEXT,
  tags            JSONB NOT NULL DEFAULT '[]',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxEventsTenant" ON "events"("tenantId");
CREATE INDEX IF NOT EXISTS "idxEventsDates" ON "events"("tenantId", "startAt", "endAt");

-- Event attendees
CREATE TABLE IF NOT EXISTS "eventAttendees" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "eventId"    TEXT NOT NULL REFERENCES "events"(id) ON DELETE CASCADE,
  "userId"     TEXT NOT NULL,
  "userEmail"  TEXT,
  "userName"   TEXT,
  status       TEXT NOT NULL DEFAULT 'invited', -- 'invited'|'accepted'|'declined'|'tentative'
  "respondedAt" TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idxEventAttendeesUnique" ON "eventAttendees"("tenantId", "eventId", "userId");
CREATE INDEX IF NOT EXISTS "idxEventAttendeesEvent" ON "eventAttendees"("tenantId", "eventId");
CREATE INDEX IF NOT EXISTS "idxEventAttendeesUser" ON "eventAttendees"("tenantId", "userId");

-- Rooms / meeting spaces
CREATE TABLE IF NOT EXISTS "rooms" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  name           TEXT NOT NULL,
  location       TEXT,
  floor          TEXT,
  capacity       INTEGER NOT NULL DEFAULT 10,
  amenities      JSONB NOT NULL DEFAULT '[]',  -- ['projector','whiteboard','video-conferencing','phone']
  status         TEXT NOT NULL DEFAULT 'available', -- 'available'|'maintenance'|'unavailable'
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxRoomsTenant" ON "rooms"("tenantId");

-- Room bookings
CREATE TABLE IF NOT EXISTS "roomBookings" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "roomId"       TEXT NOT NULL REFERENCES "rooms"(id) ON DELETE CASCADE,
  "eventId"      TEXT REFERENCES "events"(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  "bookedBy"     TEXT NOT NULL,
  "startAt"      TIMESTAMPTZ NOT NULL,
  "endAt"        TIMESTAMPTZ NOT NULL,
  "attendeeCount" INTEGER NOT NULL DEFAULT 1,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed'|'cancelled'
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxRoomBookingsRoom" ON "roomBookings"("tenantId", "roomId");
CREATE INDEX IF NOT EXISTS "idxRoomBookingsDates" ON "roomBookings"("tenantId", "startAt", "endAt");

-- Facilities maintenance requests
CREATE TABLE IF NOT EXISTS "facilityRequests" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  number         TEXT NOT NULL,   -- FAC-0001
  title          TEXT NOT NULL,
  description    TEXT,
  location       TEXT,
  "roomId"       TEXT REFERENCES "rooms"(id) ON DELETE SET NULL,
  type           TEXT NOT NULL DEFAULT 'repair', -- 'repair'|'cleaning'|'hvac'|'electrical'|'plumbing'|'other'
  priority       TEXT NOT NULL DEFAULT 'medium',
  status         TEXT NOT NULL DEFAULT 'open', -- 'open'|'in-progress'|'completed'|'cancelled'
  "requestedBy"  TEXT NOT NULL,
  "assignedTo"   TEXT,
  "completedAt"  TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxFacilityRequestsTenant" ON "facilityRequests"("tenantId");
