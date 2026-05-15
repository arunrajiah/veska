-- Payroll runs
CREATE TABLE IF NOT EXISTS "payrollRuns" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  name           TEXT NOT NULL,
  period         TEXT NOT NULL,          -- 'monthly'|'bi-weekly'|'weekly'
  "periodStart"  DATE NOT NULL,
  "periodEnd"    DATE NOT NULL,
  status         TEXT NOT NULL DEFAULT 'draft', -- 'draft'|'processing'|'approved'|'paid'|'cancelled'
  currency       TEXT NOT NULL DEFAULT 'USD',
  "totalGross"   NUMERIC(14,2) NOT NULL DEFAULT 0,
  "totalDeductions" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "totalNet"     NUMERIC(14,2) NOT NULL DEFAULT 0,
  "employeeCount" INTEGER NOT NULL DEFAULT 0,
  "approvedBy"   TEXT,
  "approvedAt"   TIMESTAMPTZ,
  "paidAt"       TIMESTAMPTZ,
  notes          TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant ON "payrollRuns"("tenantId");

-- Payroll line items (one per employee per run)
CREATE TABLE IF NOT EXISTS "payrollItems" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"       TEXT NOT NULL,
  "runId"          TEXT NOT NULL REFERENCES "payrollRuns"(id) ON DELETE CASCADE,
  "employeeId"     TEXT NOT NULL,
  "employeeName"   TEXT NOT NULL,
  "employeeEmail"  TEXT,
  "baseSalary"     NUMERIC(14,2) NOT NULL DEFAULT 0,
  "hoursWorked"    NUMERIC(8,2),         -- from timeEntries if available
  "overtimeHours"  NUMERIC(8,2) DEFAULT 0,
  "grossPay"       NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Deductions (stored as absolute amounts)
  "taxDeduction"   NUMERIC(14,2) NOT NULL DEFAULT 0,   -- flat 20% of gross
  "socialSecurity" NUMERIC(14,2) NOT NULL DEFAULT 0,   -- flat 6.2% of gross
  "medicare"       NUMERIC(14,2) NOT NULL DEFAULT 0,   -- flat 1.45% of gross
  "otherDeductions" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "totalDeductions" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "netPay"         NUMERIC(14,2) NOT NULL DEFAULT 0,
  "payslipGenerated" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON "payrollItems"("tenantId", "runId");
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee ON "payrollItems"("tenantId", "employeeId");

-- Contracts
CREATE TABLE IF NOT EXISTS "contracts" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'service', -- 'service'|'employment'|'vendor'|'nda'|'lease'|'custom'
  status          TEXT NOT NULL DEFAULT 'draft',   -- 'draft'|'review'|'sent'|'signed'|'active'|'expired'|'terminated'
  "partyA"        TEXT NOT NULL,  -- company / our side
  "partyB"        TEXT NOT NULL,  -- counterparty
  "partyBEmail"   TEXT,
  value           NUMERIC(14,2),
  currency        TEXT DEFAULT 'USD',
  "startDate"     DATE,
  "endDate"       DATE,
  "autoRenew"     BOOLEAN NOT NULL DEFAULT false,
  "renewalNoticeDays" INTEGER DEFAULT 30,
  content         TEXT,           -- contract body text / HTML
  "templateId"    TEXT,           -- optional link to documentTemplates
  "signedAt"      TIMESTAMPTZ,
  "signatureA"    TEXT,           -- name of signer
  "signatureB"    TEXT,
  "createdBy"     TEXT,
  tags            JSONB NOT NULL DEFAULT '[]',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON "contracts"("tenantId");
CREATE INDEX IF NOT EXISTS idx_contracts_status ON "contracts"("tenantId", status);

-- Contract events (lifecycle log)
CREATE TABLE IF NOT EXISTS "contractEvents" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "contractId" TEXT NOT NULL REFERENCES "contracts"(id) ON DELETE CASCADE,
  "eventType"  TEXT NOT NULL,  -- 'created'|'sent'|'viewed'|'signed'|'approved'|'terminated'|'renewed'|'comment'
  description  TEXT,
  "performedBy" TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contract_events_contract ON "contractEvents"("tenantId", "contractId");
