-- Users
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" text NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "avatarUrl" text,
  "status" text NOT NULL DEFAULT 'active',   -- active | invited | deactivated
  "inviteToken" text,
  "inviteExpiresAt" timestamptz,
  "lastLoginAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenantId", "email")
);

-- Roles
CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" text NOT NULL,
  "name" text NOT NULL,           -- e.g. Admin, Manager, Finance, HR, Sales, Viewer
  "description" text,
  "isSystem" boolean NOT NULL DEFAULT false,  -- system roles cannot be deleted
  "permissions" text[] NOT NULL DEFAULT '{}', -- e.g. ['invoices:read','invoices:write','hr:read']
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenantId", "name")
);

-- User ↔ Role assignments
CREATE TABLE IF NOT EXISTS "userRoles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "roleId" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "assignedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("userId", "roleId")
);

CREATE INDEX IF NOT EXISTS "users_tenantId_idx" ON "users"("tenantId");
CREATE INDEX IF NOT EXISTS "userRoles_userId_idx" ON "userRoles"("userId");
