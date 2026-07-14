CREATE TABLE IF NOT EXISTS "attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" text NOT NULL,
  "entityType" text NOT NULL,   -- invoice | expense | purchase_order | grn | employee
  "entityId" text NOT NULL,
  "fileName" text NOT NULL,
  "mimeType" text NOT NULL,
  "size" int NOT NULL,          -- bytes
  "storageKey" text NOT NULL,
  "url" text NOT NULL,
  "uploadedBy" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "attachmentsEntityIdx" ON "attachments"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "attachments_tenantId_idx" ON "attachments"("tenantId");
