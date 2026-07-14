-- Auth columns for the "users" table.
--
-- The /auth/login route has always queried users."passwordHash" and users."isActive",
-- but no migration ever created them, so every login attempt failed with
-- `column "passwordHash" does not exist`. These columns close that gap.
--
-- "passwordHash" is nullable: invited users exist before they set a password, and
-- SSO/magic-link identities never have one.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "usersTenantEmailIdx" ON "users"("tenantId", "email");
