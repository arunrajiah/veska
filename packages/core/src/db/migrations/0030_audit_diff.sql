-- Add before/after/diff columns to the developer auditLog table
ALTER TABLE "auditLog" ADD COLUMN IF NOT EXISTS "before" jsonb;
ALTER TABLE "auditLog" ADD COLUMN IF NOT EXISTS "after" jsonb;
