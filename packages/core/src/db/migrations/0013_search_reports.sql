-- Full-text search index on entityRecords
CREATE INDEX IF NOT EXISTS "idxEntityRecordsFts"
  ON "entityRecords" USING gin(to_tsvector('english', data::text));

-- Saved reports
CREATE TABLE IF NOT EXISTS "savedReports" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "config"      JSONB NOT NULL DEFAULT '{}',
  "createdBy"   TEXT,
  "isPublic"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxSavedReportsTenant" ON "savedReports"("tenantId");

-- Report schedules
CREATE TABLE IF NOT EXISTS "reportSchedules" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "reportId"    TEXT NOT NULL REFERENCES "savedReports"("id") ON DELETE CASCADE,
  "cronExpr"    TEXT NOT NULL,
  "recipients"  JSONB NOT NULL DEFAULT '[]',
  "lastRunAt"   TIMESTAMPTZ,
  "nextRunAt"   TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);
