-- Budgets
CREATE TABLE IF NOT EXISTS "budgets" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  "fiscalYear" INTEGER NOT NULL,
  period       TEXT NOT NULL DEFAULT 'annual', -- 'annual'|'quarterly'|'monthly'
  quarter      INTEGER,  -- 1-4, only if period='quarterly'
  month        INTEGER,  -- 1-12, only if period='monthly'
  status       TEXT NOT NULL DEFAULT 'draft', -- 'draft'|'approved'|'active'|'closed'
  currency     TEXT NOT NULL DEFAULT 'USD',
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxBudgetsTenant" ON "budgets"("tenantId");

-- Budget line items
CREATE TABLE IF NOT EXISTS "budgetLineItems" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "budgetId"   TEXT NOT NULL REFERENCES "budgets"(id) ON DELETE CASCADE,
  category     TEXT NOT NULL,   -- e.g. 'Salaries', 'Marketing', 'Infrastructure'
  description  TEXT,
  "plannedAmount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "entityType" TEXT,   -- optional link to entityRecords type for actuals lookup
  notes        TEXT,
  "sortOrder"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxBudgetItemsBudget" ON "budgetLineItems"("tenantId", "budgetId");
