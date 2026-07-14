-- Sessions
CREATE TABLE IF NOT EXISTS "sessions" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idxSessionsToken" ON sessions(token);
CREATE INDEX IF NOT EXISTS "idxSessionsUser" ON sessions("tenantId", "userId");

-- SSO configurations (per tenant)
CREATE TABLE IF NOT EXISTS "ssoConfigs" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL UNIQUE,
  provider     TEXT NOT NULL, -- 'google' | 'github' | 'microsoft' | 'oidc'
  "clientId"   TEXT NOT NULL,
  "clientSecret" TEXT NOT NULL,
  "discoveryUrl" TEXT,        -- for generic OIDC
  enabled      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MFA / TOTP secrets
CREATE TABLE IF NOT EXISTS "mfaSecrets" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  secret      TEXT NOT NULL,  -- base32 TOTP secret
  verified    BOOLEAN NOT NULL DEFAULT false,
  "backupCodes" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idxMfaUser" ON "mfaSecrets"("tenantId", "userId");
