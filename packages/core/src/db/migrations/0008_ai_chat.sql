CREATE TABLE IF NOT EXISTS "aiConversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" text NOT NULL,
  "title" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "aiMessages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" uuid NOT NULL REFERENCES "aiConversations"("id") ON DELETE CASCADE,
  "role" text NOT NULL,   -- user | assistant
  "content" text NOT NULL,
  "toolsUsed" text[] DEFAULT '{}',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "aiMessages_conversationId_idx" ON "aiMessages"("conversationId");
CREATE INDEX IF NOT EXISTS "aiConversations_tenantId_idx" ON "aiConversations"("tenantId");
