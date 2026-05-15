-- Vendors
CREATE TABLE IF NOT EXISTS "vendors" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  name            TEXT NOT NULL,
  code            TEXT,                -- short vendor code e.g. "VEN-001"
  category        TEXT NOT NULL DEFAULT 'general', -- 'supplier'|'contractor'|'service-provider'|'utility'|'general'
  email           TEXT,
  phone           TEXT,
  website         TEXT,
  address         TEXT,
  currency        TEXT NOT NULL DEFAULT 'USD',
  "paymentTerms"  INTEGER NOT NULL DEFAULT 30,  -- net days
  "taxId"         TEXT,
  status          TEXT NOT NULL DEFAULT 'active', -- 'active'|'inactive'|'blacklisted'
  rating          NUMERIC(3,2),  -- 0.00-5.00
  notes           TEXT,
  tags            JSONB NOT NULL DEFAULT '[]',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON "vendors"("tenantId");

-- Vendor contacts
CREATE TABLE IF NOT EXISTS "vendorContacts" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "vendorId"   TEXT NOT NULL REFERENCES "vendors"(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  title        TEXT,
  email        TEXT,
  phone        TEXT,
  "isPrimary"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_vendor ON "vendorContacts"("tenantId", "vendorId");

-- Vendor performance ratings
CREATE TABLE IF NOT EXISTS "vendorRatings" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "vendorId"   TEXT NOT NULL REFERENCES "vendors"(id) ON DELETE CASCADE,
  category     TEXT NOT NULL, -- 'quality'|'delivery'|'pricing'|'support'|'overall'
  score        INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment      TEXT,
  "ratedBy"    TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendor_ratings_vendor ON "vendorRatings"("tenantId", "vendorId");

-- Service desk tickets
CREATE TABLE IF NOT EXISTS "serviceTickets" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  number          TEXT NOT NULL,          -- auto-generated e.g. "TKT-0042"
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'it', -- 'it'|'hr'|'facilities'|'finance'|'other'
  priority        TEXT NOT NULL DEFAULT 'medium', -- 'low'|'medium'|'high'|'critical'
  status          TEXT NOT NULL DEFAULT 'open', -- 'open'|'in-progress'|'waiting'|'resolved'|'closed'
  "requestedBy"   TEXT NOT NULL,  -- userId or email
  "assignedTo"    TEXT,
  "dueAt"         TIMESTAMPTZ,
  "resolvedAt"    TIMESTAMPTZ,
  "closedAt"      TIMESTAMPTZ,
  "slaHours"      INTEGER NOT NULL DEFAULT 24,  -- SLA target in hours
  "slaBreached"   BOOLEAN NOT NULL DEFAULT false,
  tags            JSONB NOT NULL DEFAULT '[]',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_tickets_tenant ON "serviceTickets"("tenantId");
CREATE INDEX IF NOT EXISTS idx_service_tickets_status ON "serviceTickets"("tenantId", status);
CREATE INDEX IF NOT EXISTS idx_service_tickets_assigned ON "serviceTickets"("tenantId", "assignedTo");

-- Ticket comments
CREATE TABLE IF NOT EXISTS "ticketComments" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "ticketId"   TEXT NOT NULL REFERENCES "serviceTickets"(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  "authorId"   TEXT NOT NULL,
  "authorName" TEXT,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,  -- internal note vs customer-visible
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON "ticketComments"("tenantId", "ticketId");
