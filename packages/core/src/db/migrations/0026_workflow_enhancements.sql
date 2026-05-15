-- Workflow run history (detailed per-run log)
CREATE TABLE IF NOT EXISTS "workflowRunSteps" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "workflowRunId" TEXT NOT NULL,
  "stepId"        TEXT NOT NULL,
  "stepType"      TEXT NOT NULL,   -- 'condition'|'action'|'ai'|'webhook'
  "stepName"      TEXT,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'running'|'success'|'skipped'|'failed'
  input           JSONB,
  output          JSONB,
  "errorMessage"  TEXT,
  "startedAt"     TIMESTAMPTZ,
  "completedAt"   TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_run_steps_run ON "workflowRunSteps"("tenantId", "workflowRunId");

-- Workflow templates (pre-built common automations)
CREATE TABLE IF NOT EXISTS "workflowTemplates" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'general', -- 'sales'|'finance'|'hr'|'support'|'general'
  config      JSONB NOT NULL,   -- same shape as workflows.config
  isBuiltIn   BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
