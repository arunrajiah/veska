-- AI usage log
CREATE TABLE IF NOT EXISTS "aiUsageLogs" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "userId" text,
  "sessionId" text,
  feature text NOT NULL,       -- 'insights', 'action_agent', 'workflow_suggest', 'report_generate', 'setup'
  model text NOT NULL,
  "promptTokens" integer NOT NULL DEFAULT 0,
  "completionTokens" integer NOT NULL DEFAULT 0,
  "totalTokens" integer NOT NULL DEFAULT 0,
  "durationMs" integer,
  "toolsUsed" jsonb DEFAULT '[]'::jsonb,
  "requestSummary" text,       -- short description of what was asked (no PII)
  "isLocal" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "aiUsageLogs_tenantId_idx" ON "aiUsageLogs" ("tenantId");
CREATE INDEX IF NOT EXISTS "aiUsageLogs_createdAt_idx" ON "aiUsageLogs" ("createdAt");
CREATE INDEX IF NOT EXISTS "aiUsageLogs_feature_idx" ON "aiUsageLogs" ("feature");

-- Approval workflow triggers on entity records
CREATE TABLE IF NOT EXISTS "approvalTriggers" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "entityType" text NOT NULL,  -- 'Expense', 'LeaveRequest', 'PurchaseOrder'
  "entityId" uuid NOT NULL,
  "chainId" uuid,              -- references approval chain
  "requestedBy" text NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending, approved, rejected, cancelled
  "currentStep" integer NOT NULL DEFAULT 0,
  "approvers" jsonb DEFAULT '[]'::jsonb,
  "approvedBy" text,
  "rejectedBy" text,
  "rejectionReason" text,
  metadata jsonb DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "approvalTriggers_tenantId_idx" ON "approvalTriggers" ("tenantId");
CREATE INDEX IF NOT EXISTS "approvalTriggers_entityId_idx" ON "approvalTriggers" ("entityId");
CREATE INDEX IF NOT EXISTS "approvalTriggers_status_idx" ON "approvalTriggers" ("status");
