-- Approval chain definitions
CREATE TABLE IF NOT EXISTS "approvalChains" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" text NOT NULL,
  "name" text NOT NULL,
  "entityType" text NOT NULL,        -- expense | invoice | purchase_order
  "conditionField" text,             -- e.g. 'amount'
  "conditionOp" text,                -- gt | gte | lt | lte | eq | always
  "conditionValue" numeric,          -- e.g. 500 (for amount > 500)
  "steps" jsonb NOT NULL DEFAULT '[]',
  -- steps: [{order:1, approverRole:'Finance', approverUserId?:'uuid', label:'Finance Review'}]
  "enabled" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Approval requests (one per entity per chain trigger)
CREATE TABLE IF NOT EXISTS "approvalRequests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" text NOT NULL,
  "chainId" uuid NOT NULL REFERENCES "approvalChains"("id") ON DELETE CASCADE,
  "entityType" text NOT NULL,
  "entityId" text NOT NULL,
  "entityTitle" text,               -- e.g. "Expense: Team lunch $150"
  "currentStep" int NOT NULL DEFAULT 1,
  "totalSteps" int NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | cancelled
  "requestedBy" text,               -- userId who triggered the request
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Per-step approval decisions
CREATE TABLE IF NOT EXISTS "approvalDecisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "requestId" uuid NOT NULL REFERENCES "approvalRequests"("id") ON DELETE CASCADE,
  "step" int NOT NULL,
  "approverId" text,
  "approverName" text,
  "decision" text NOT NULL,         -- approved | rejected
  "comment" text,
  "decidedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "approvalRequests_tenantId_idx" ON "approvalRequests"("tenantId");
CREATE INDEX IF NOT EXISTS "approvalRequests_entityId_idx" ON "approvalRequests"("entityId");
CREATE INDEX IF NOT EXISTS "approvalRequests_status_idx" ON "approvalRequests"("status");
CREATE INDEX IF NOT EXISTS "approvalDecisions_requestId_idx" ON "approvalDecisions"("requestId");
