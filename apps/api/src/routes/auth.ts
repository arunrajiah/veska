import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcrypt';
import { Redis } from 'ioredis';

// Lazy Redis client for TOTP brute-force protection
let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true });
  }
  return _redis;
}
import QRCode from 'qrcode';
import { sharedDb } from '../shared.js';
import { sendPasswordResetEmail } from '../lib/password-reset-mailer.js';

export const authRouter = new Hono();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a cryptographically random 256-bit session token (hex string). */
function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/** SHA-256 hash of a string, returned as hex. */
function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Base32 alphabet used for TOTP secrets. */
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Encode a Buffer to base32 (RFC 4648). */
function base32Encode(buf: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_CHARS[(value >>> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

/** Decode a base32 string to a Buffer. */
function base32Decode(encoded: string): Buffer {
  const str = encoded.toUpperCase().replace(/=+$/, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of str) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }

  return Buffer.from(bytes);
}

/**
 * HOTP(secret, counter) per RFC 4226.
 * Returns a 6-digit OTP as a string (zero-padded).
 */
function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);

  // Counter as 8-byte big-endian buffer
  const counterBuf = Buffer.alloc(8);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  counterBuf.writeUInt32BE(high, 0);
  counterBuf.writeUInt32BE(low, 4);

  const hmac = createHmac('sha1', key).update(counterBuf).digest();

  // Dynamic truncation
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  return String(code % 1_000_000).padStart(6, '0');
}

/**
 * Verify a TOTP code against a secret.
 * Accepts ±1 time window (30-second step).
 */
function verifyTotp(secret: string, code: string): boolean {
  const step = Math.floor(Date.now() / 1000 / 30);
  for (let delta = -1; delta <= 1; delta++) {
    const expected = hotp(secret, step + delta);
    try {
      const a = Buffer.from(expected.padStart(6, '0'));
      const b = Buffer.from(code.padStart(6, '0'));
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      // lengths differ — not equal
    }
  }
  return false;
}

/** Generate n random alphanumeric backup codes. */
function generateBackupCodes(n = 8): string[] {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: n }, () =>
    Array.from({ length: 8 }, () => chars[randomBytes(1)[0]! % chars.length]).join(''),
  );
}

/** Read the session token from the Authorization header. */
function getTokenFromHeader(c: { req: { header: (name: string) => string | undefined } }): string | null {
  const auth = c.req.header('authorization') ?? c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

/** Resolve the authenticated session from a Bearer token.  Returns null if invalid/expired. */
async function resolveSession(token: string): Promise<Record<string, unknown> | null> {
  const result = await sharedDb.execute(sql`
    SELECT id, "tenantId", "userId", token, "ipAddress", "userAgent",
           "expiresAt", "createdAt", "lastSeenAt"
    FROM sessions
    WHERE token = ${token}
      AND "expiresAt" > now()
  `);
  return result.rows.length ? (result.rows[0] as Record<string, unknown>) : null;
}

// ── POST /auth/login ──────────────────────────────────────────────────────────

authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json<{ email: string; password: string; tenantId?: string }>();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'email and password are required' }, 400);
    }

    // tenantId is optional. A sign-in form should not have to know a tenant UUID, so
    // resolve the tenant from the email address and only require an explicit tenantId
    // when the same address exists in more than one tenant.
    const requestedTenantId = body.tenantId ?? null;

    const userResult = await sharedDb.execute(sql`
      SELECT id, email, "tenantId", "passwordHash", "isActive"
      FROM users
      WHERE email = ${email}
        AND (${requestedTenantId}::text IS NULL OR "tenantId" = ${requestedTenantId}::text)
    `);

    const matches = userResult.rows as Array<{
      id: string;
      email: string;
      tenantId: string;
      passwordHash: string | null;
      isActive: boolean;
    }>;

    if (!matches.length) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    if (matches.length > 1) {
      return c.json(
        { error: 'This email belongs to multiple tenants. Specify tenantId.' },
        400,
      );
    }

    const user = matches[0]!;
    const tenantId = user.tenantId;

    if (!user.isActive) {
      return c.json({ error: 'Account is not active' }, 403);
    }

    // Compare password using bcrypt
    const storedHash = user.passwordHash ?? '';
    const passwordMatch = storedHash ? await bcrypt.compare(password, storedHash) : false;

    if (!passwordMatch) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Check MFA
    const mfaResult = await sharedDb.execute(sql`
      SELECT id FROM "mfaSecrets"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${user.id}
        AND verified = true
    `);

    if (mfaResult.rows.length) {
      // Issue a short-lived temp token (16 bytes, 5-minute expiry stored in-band as a special session)
      const tempToken = 'mfa_' + randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await sharedDb.execute(sql`
        INSERT INTO sessions ("tenantId", "userId", token, "expiresAt", "ipAddress", "userAgent")
        VALUES (
          ${tenantId}, ${user.id}, ${tempToken},
          ${expiresAt.toISOString()},
          ${c.req.header('x-forwarded-for') ?? null},
          ${c.req.header('user-agent') ?? null}
        )
      `);

      return c.json({ mfaRequired: true, requires2fa: true, tempToken });
    }

    // Create full session
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await sharedDb.execute(sql`
      INSERT INTO sessions ("tenantId", "userId", token, "expiresAt", "ipAddress", "userAgent")
      VALUES (
        ${tenantId}, ${user.id}, ${token},
        ${expiresAt.toISOString()},
        ${c.req.header('x-forwarded-for') ?? null},
        ${c.req.header('user-agent') ?? null}
      )
    `);

    // The Admin UI needs two more things to land the user on a working dashboard:
    // the identity to send as X-Veska-Identity-Id, and whether this tenant has
    // already been configured. Without the latter the middleware bounces every
    // login into the setup wizard, even for a fully seeded company.
    const identityResult = await sharedDb.execute(sql`
      SELECT id FROM "identities"
      WHERE "tenantId" = ${tenantId}::uuid
        AND "channelIds"->>'email' = ${user.email}
      LIMIT 1
    `);
    const identityId = (identityResult.rows[0] as { id: string } | undefined)?.id ?? user.id;

    const configuredResult = await sharedDb.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM "entityRecords" WHERE "tenantId" = ${tenantId}::uuid
      ) AS "configured"
    `);
    const onboardingComplete = Boolean(
      (configuredResult.rows[0] as { configured: boolean } | undefined)?.configured,
    );

    return c.json({
      token,
      expiresAt: expiresAt.toISOString(),
      identityId,
      onboardingComplete,
      user: { id: user.id, email: user.email, tenantId },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────

authRouter.post('/logout', async (c) => {
  try {
    const token = getTokenFromHeader(c);
    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    await sharedDb.execute(sql`
      DELETE FROM sessions WHERE token = ${token}
    `);

    return c.json({ success: true });
  } catch (err) {
    console.error('[auth/logout]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/refresh ────────────────────────────────────────────────────────

authRouter.post('/refresh', async (c) => {
  try {
    const oldToken = getTokenFromHeader(c);
    if (!oldToken) return c.json({ error: 'Unauthorized' }, 401);

    const session = await resolveSession(oldToken);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);

    const newToken = generateSessionToken();
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await sharedDb.execute(sql`
      UPDATE sessions
      SET token = ${newToken},
          "expiresAt" = ${newExpiresAt.toISOString()},
          "lastSeenAt" = now()
      WHERE token = ${oldToken}
    `);

    return c.json({
      token: newToken,
      expiresAt: newExpiresAt.toISOString(),
    });
  } catch (err) {
    console.error('[auth/refresh]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── GET /auth/sessions ────────────────────────────────────────────────────────

authRouter.get('/sessions', async (c) => {
  try {
    const token = getTokenFromHeader(c);
    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const current = await resolveSession(token);
    if (!current) return c.json({ error: 'Unauthorized' }, 401);

    const result = await sharedDb.execute(sql`
      SELECT id, "ipAddress", "userAgent", "createdAt", "lastSeenAt", "expiresAt", token
      FROM sessions
      WHERE "tenantId" = ${current['tenantId'] as string}
        AND "userId" = ${current['userId'] as string}
        AND "expiresAt" > now()
      ORDER BY "lastSeenAt" DESC
    `);

    const sessions = result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r['id'],
        ipAddress: r['ipAddress'],
        userAgent: r['userAgent'],
        createdAt: r['createdAt'],
        lastSeenAt: r['lastSeenAt'],
        expiresAt: r['expiresAt'],
        isCurrent: r['token'] === token,
      };
    });

    return c.json(sessions);
  } catch (err) {
    console.error('[auth/sessions]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── DELETE /auth/sessions/:sessionId ─────────────────────────────────────────

authRouter.delete('/sessions/:sessionId', async (c) => {
  try {
    const token = getTokenFromHeader(c);
    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const current = await resolveSession(token);
    if (!current) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');

    await sharedDb.execute(sql`
      DELETE FROM sessions
      WHERE id = ${sessionId}
        AND "tenantId" = ${current['tenantId'] as string}
        AND "userId" = ${current['userId'] as string}
    `);

    return c.json({ success: true });
  } catch (err) {
    console.error('[auth/sessions/delete]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── GET /auth/sso/:provider/callback ─────────────────────────────────────────

authRouter.get('/sso/:provider/callback', async (c) => {
  // SSO callback not yet implemented — requires real OIDC token exchange
  return c.json({ error: 'SSO callback not implemented. Configure a real OIDC provider.' }, 501);
});

// ── GET /auth/sso/config ──────────────────────────────────────────────────────

authRouter.get('/sso/config', async (c) => {
  try {
    const ssoToken = getTokenFromHeader(c);
    if (!ssoToken) return c.json({ error: 'Unauthorized' }, 401);
    const ssoSession = await resolveSession(ssoToken);
    if (!ssoSession) return c.json({ error: 'Unauthorized' }, 401);

    const tenantId = c.req.header('x-tenant-id');
    if (!tenantId) return c.json({ error: 'x-tenant-id header is required' }, 400);

    const result = await sharedDb.execute(sql`
      SELECT id, "tenantId", provider, "clientId", "clientSecret",
             "discoveryUrl", enabled, "createdAt", "updatedAt"
      FROM "ssoConfigs"
      WHERE "tenantId" = ${tenantId}
    `);

    if (!result.rows.length) {
      return c.json({ error: 'SSO config not found' }, 404);
    }

    const config = result.rows[0] as Record<string, unknown>;
    const secret = String(config['clientSecret'] ?? '');

    return c.json({
      ...config,
      // Mask clientSecret — show only last 4 chars
      clientSecret: secret.length > 4 ? '***' + secret.slice(-4) : '****',
    });
  } catch (err) {
    console.error('[auth/sso/config GET]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/sso/config ─────────────────────────────────────────────────────

authRouter.post('/sso/config', async (c) => {
  try {
    const ssoToken = getTokenFromHeader(c);
    if (!ssoToken) return c.json({ error: 'Unauthorized' }, 401);
    const ssoSession = await resolveSession(ssoToken);
    if (!ssoSession) return c.json({ error: 'Unauthorized' }, 401);

    const tenantId = c.req.header('x-tenant-id');
    if (!tenantId) return c.json({ error: 'x-tenant-id header is required' }, 400);

    const body = await c.req.json<{
      provider: string;
      clientId: string;
      clientSecret: string;
      discoveryUrl?: string;
      enabled?: boolean;
    }>();

    const { provider, clientId, clientSecret, discoveryUrl, enabled = true } = body;

    if (!provider || !clientId || !clientSecret) {
      return c.json({ error: 'provider, clientId, and clientSecret are required' }, 400);
    }

    const validProviders = ['google', 'github', 'microsoft', 'oidc'];
    if (!validProviders.includes(provider)) {
      return c.json({ error: `provider must be one of: ${validProviders.join(', ')}` }, 400);
    }

    const result = await sharedDb.execute(sql`
      INSERT INTO "ssoConfigs" ("tenantId", provider, "clientId", "clientSecret", "discoveryUrl", enabled)
      VALUES (${tenantId}, ${provider}, ${clientId}, ${clientSecret}, ${discoveryUrl ?? null}, ${enabled})
      ON CONFLICT ("tenantId") DO UPDATE
        SET provider = EXCLUDED.provider,
            "clientId" = EXCLUDED."clientId",
            "clientSecret" = EXCLUDED."clientSecret",
            "discoveryUrl" = EXCLUDED."discoveryUrl",
            enabled = EXCLUDED.enabled,
            "updatedAt" = now()
      RETURNING id, "tenantId", provider, "clientId", "discoveryUrl", enabled, "createdAt", "updatedAt"
    `);

    return c.json(result.rows[0], 200);
  } catch (err) {
    console.error('[auth/sso/config POST]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/mfa/setup ──────────────────────────────────────────────────────

authRouter.post('/mfa/setup', async (c) => {
  try {
    const tenantId = c.req.header('x-tenant-id');
    if (!tenantId) return c.json({ error: 'x-tenant-id header is required' }, 400);

    const token = getTokenFromHeader(c);
    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const session = await resolveSession(token);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);

    const userId = session['userId'] as string;

    // Get user email for otpauth URL
    const userResult = await sharedDb.execute(sql`
      SELECT email FROM users WHERE id = ${userId} AND "tenantId" = ${tenantId}
    `);
    const email = (userResult.rows[0] as Record<string, unknown> | undefined)?.['email'] ?? userId;

    // Generate a 20-byte (160-bit) random secret, base32-encoded
    const secretBytes = randomBytes(20);
    const secret = base32Encode(secretBytes);

    // Upsert (replace) unverified secret for this user
    await sharedDb.execute(sql`
      INSERT INTO "mfaSecrets" ("tenantId", "userId", secret, verified, "backupCodes")
      VALUES (${tenantId}, ${userId}, ${secret}, false, '[]')
      ON CONFLICT ("tenantId", "userId") DO UPDATE
        SET secret = EXCLUDED.secret,
            verified = false,
            "backupCodes" = '[]'
    `);

    const otpauthUrl = `otpauth://totp/Veska:${encodeURIComponent(String(email))}?secret=${secret}&issuer=Veska`;
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return c.json({ secret, otpauthUrl, qrCodeDataUrl });
  } catch (err) {
    console.error('[auth/mfa/setup]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/mfa/verify ─────────────────────────────────────────────────────

authRouter.post('/mfa/verify', async (c) => {
  try {
    const tenantId = c.req.header('x-tenant-id');
    if (!tenantId) return c.json({ error: 'x-tenant-id header is required' }, 400);

    const token = getTokenFromHeader(c);
    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const session = await resolveSession(token);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);

    const userId = session['userId'] as string;
    const body = await c.req.json<{ code: string }>();

    if (!body.code) return c.json({ error: 'code is required' }, 400);

    const mfaResult = await sharedDb.execute(sql`
      SELECT id, secret, verified FROM "mfaSecrets"
      WHERE "tenantId" = ${tenantId} AND "userId" = ${userId}
    `);

    if (!mfaResult.rows.length) {
      return c.json({ error: 'MFA not set up for this user' }, 404);
    }

    const mfa = mfaResult.rows[0] as { id: string; secret: string; verified: boolean };

    if (!verifyTotp(mfa.secret, body.code)) {
      return c.json({ error: 'Invalid TOTP code' }, 400);
    }

    // Generate backup codes
    const plainCodes = generateBackupCodes(8);
    const hashedCodes = plainCodes.map((code) => sha256(code));

    await sharedDb.execute(sql`
      UPDATE "mfaSecrets"
      SET verified = true,
          "backupCodes" = ${JSON.stringify(hashedCodes)}::jsonb
      WHERE "tenantId" = ${tenantId} AND "userId" = ${userId}
    `);

    return c.json({ verified: true, backupCodes: plainCodes });
  } catch (err) {
    console.error('[auth/mfa/verify]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/mfa/disable ────────────────────────────────────────────────────

authRouter.post('/mfa/disable', async (c) => {
  try {
    const tenantId = c.req.header('x-tenant-id');
    if (!tenantId) return c.json({ error: 'x-tenant-id header is required' }, 400);

    const token = getTokenFromHeader(c);
    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const session = await resolveSession(token);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);

    const userId = session['userId'] as string;

    await sharedDb.execute(sql`
      DELETE FROM "mfaSecrets"
      WHERE "tenantId" = ${tenantId} AND "userId" = ${userId}
    `);

    return c.json({ success: true });
  } catch (err) {
    console.error('[auth/mfa/disable]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── GET /auth/mfa/status ──────────────────────────────────────────────────────

authRouter.get('/mfa/status', async (c) => {
  try {
    const token = getTokenFromHeader(c);
    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const session = await resolveSession(token);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);

    const tenantId = (c.req.header('x-tenant-id') ?? session['tenantId']) as string;
    const userId = session['userId'] as string;

    const mfaResult = await sharedDb.execute(sql`
      SELECT verified FROM "mfaSecrets"
      WHERE "tenantId" = ${tenantId} AND "userId" = ${userId}
    `);

    const enabled = mfaResult.rows.length > 0 && (mfaResult.rows[0] as { verified: boolean }).verified;
    return c.json({ enabled });
  } catch (err) {
    console.error('[auth/mfa/status]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/2fa/setup (alias for /auth/mfa/setup) ─────────────────────────

authRouter.post('/2fa/setup', async (c) => {
  try {
    const token = getTokenFromHeader(c);
    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const session = await resolveSession(token);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);

    const tenantId = (c.req.header('x-tenant-id') ?? session['tenantId']) as string;
    const userId = session['userId'] as string;

    const userResult = await sharedDb.execute(sql`
      SELECT email FROM users WHERE id = ${userId} AND "tenantId" = ${tenantId}
    `);
    const email = (userResult.rows[0] as Record<string, unknown> | undefined)?.['email'] ?? userId;

    const secretBytes = randomBytes(20);
    const secret = base32Encode(secretBytes);

    await sharedDb.execute(sql`
      INSERT INTO "mfaSecrets" ("tenantId", "userId", secret, verified, "backupCodes")
      VALUES (${tenantId}, ${userId}, ${secret}, false, '[]')
      ON CONFLICT ("tenantId", "userId") DO UPDATE
        SET secret = EXCLUDED.secret,
            verified = false,
            "backupCodes" = '[]'
    `);

    const otpAuthUrl = `otpauth://totp/Veska:${encodeURIComponent(String(email))}?secret=${secret}&issuer=Veska`;
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return c.json({ secret, otpAuthUrl, qrCodeDataUrl });
  } catch (err) {
    console.error('[auth/2fa/setup]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/2fa/verify (alias for /auth/mfa/verify) ───────────────────────

authRouter.post('/2fa/verify', async (c) => {
  try {
    const token = getTokenFromHeader(c);
    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const session = await resolveSession(token);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);

    const tenantId = (c.req.header('x-tenant-id') ?? session['tenantId']) as string;
    const userId = session['userId'] as string;
    const body = await c.req.json<{ token: string }>();

    if (!body.token) return c.json({ error: 'token is required' }, 400);

    const mfaResult = await sharedDb.execute(sql`
      SELECT id, secret, verified FROM "mfaSecrets"
      WHERE "tenantId" = ${tenantId} AND "userId" = ${userId}
    `);

    if (!mfaResult.rows.length) {
      return c.json({ error: 'MFA not set up for this user' }, 404);
    }

    const mfa = mfaResult.rows[0] as { id: string; secret: string; verified: boolean };

    if (!verifyTotp(mfa.secret, body.token)) {
      return c.json({ error: 'Invalid TOTP code' }, 400);
    }

    const plainCodes = generateBackupCodes(8);
    const hashedCodes = plainCodes.map((code) => sha256(code));

    await sharedDb.execute(sql`
      UPDATE "mfaSecrets"
      SET verified = true,
          "backupCodes" = ${JSON.stringify(hashedCodes)}::jsonb
      WHERE "tenantId" = ${tenantId} AND "userId" = ${userId}
    `);

    return c.json({ ok: true, backupCodes: plainCodes });
  } catch (err) {
    console.error('[auth/2fa/verify]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/2fa/disable ────────────────────────────────────────────────────

authRouter.post('/2fa/disable', async (c) => {
  try {
    const token = getTokenFromHeader(c);
    if (!token) return c.json({ error: 'Unauthorized' }, 401);

    const session = await resolveSession(token);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);

    const tenantId = (c.req.header('x-tenant-id') ?? session['tenantId']) as string;
    const userId = session['userId'] as string;
    const body = await c.req.json<{ token: string }>();

    if (!body.token) return c.json({ error: 'token is required' }, 400);

    const mfaResult = await sharedDb.execute(sql`
      SELECT secret FROM "mfaSecrets"
      WHERE "tenantId" = ${tenantId} AND "userId" = ${userId} AND verified = true
    `);

    if (!mfaResult.rows.length) {
      return c.json({ error: 'MFA not enabled' }, 400);
    }

    const mfa = mfaResult.rows[0] as { secret: string };

    if (!verifyTotp(mfa.secret, body.token)) {
      return c.json({ error: 'Invalid TOTP code' }, 400);
    }

    await sharedDb.execute(sql`
      DELETE FROM "mfaSecrets"
      WHERE "tenantId" = ${tenantId} AND "userId" = ${userId}
    `);

    return c.json({ ok: true });
  } catch (err) {
    console.error('[auth/2fa/disable]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/2fa/challenge ──────────────────────────────────────────────────
// Called during login when requires2fa is true. Body: { sessionToken, token }

authRouter.post('/2fa/challenge', async (c) => {
  try {
    const body = await c.req.json<{ sessionToken: string; token: string }>();
    const { sessionToken, token: totpToken } = body;

    if (!sessionToken || !totpToken) {
      return c.json({ error: 'sessionToken and token are required' }, 400);
    }

    // Per-tempToken TOTP brute-force lockout
    const redis = getRedis();
    const attemptKey = `totp:attempts:${sessionToken}`;
    const attempts = parseInt((await redis.get(attemptKey)) ?? '0', 10);
    if (attempts >= 5) {
      return c.json({ error: 'Too many failed attempts. Please log in again.' }, 429);
    }

    // Delegate to mfa/login logic
    const tempResult = await sharedDb.execute(sql`
      SELECT id, "tenantId", "userId"
      FROM sessions
      WHERE token = ${sessionToken}
        AND "expiresAt" > now()
    `);

    if (!tempResult.rows.length) {
      return c.json({ error: 'Invalid or expired session token' }, 401);
    }

    const tempSession = tempResult.rows[0] as { id: string; tenantId: string; userId: string };

    const mfaResult = await sharedDb.execute(sql`
      SELECT secret FROM "mfaSecrets"
      WHERE "tenantId" = ${tempSession.tenantId}
        AND "userId" = ${tempSession.userId}
        AND verified = true
    `);

    if (!mfaResult.rows.length) {
      return c.json({ error: 'MFA not configured' }, 400);
    }

    const mfa = mfaResult.rows[0] as { secret: string };
    let codeValid = verifyTotp(mfa.secret, totpToken);

    if (!codeValid) {
      const backupResult = await sharedDb.execute(sql`
        SELECT id, "backupCodes" FROM "mfaSecrets"
        WHERE "tenantId" = ${tempSession.tenantId}
          AND "userId" = ${tempSession.userId}
      `);

      if (backupResult.rows.length) {
        const mfaRow = backupResult.rows[0] as { id: string; backupCodes: string[] };
        const codeHash = sha256(totpToken);
        const idx = mfaRow.backupCodes.findIndex((h) => h === codeHash);
        if (idx !== -1) {
          codeValid = true;
          const updatedCodes = [...mfaRow.backupCodes];
          updatedCodes.splice(idx, 1);
          await sharedDb.execute(sql`
            UPDATE "mfaSecrets"
            SET "backupCodes" = ${JSON.stringify(updatedCodes)}::jsonb
            WHERE id = ${mfaRow.id}
          `);
        }
      }
    }

    if (!codeValid) {
      await redis.multi().incr(attemptKey).expire(attemptKey, 300).exec();
      return c.json({ error: 'Invalid code' }, 401);
    }

    await redis.del(attemptKey);

    await sharedDb.execute(sql`
      DELETE FROM sessions WHERE token = ${sessionToken}
    `);

    const newToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await sharedDb.execute(sql`
      INSERT INTO sessions ("tenantId", "userId", token, "expiresAt", "ipAddress", "userAgent")
      VALUES (
        ${tempSession.tenantId}, ${tempSession.userId}, ${newToken},
        ${expiresAt.toISOString()},
        ${c.req.header('x-forwarded-for') ?? null},
        ${c.req.header('user-agent') ?? null}
      )
    `);

    const userResult = await sharedDb.execute(sql`
      SELECT email FROM users WHERE id = ${tempSession.userId}
    `);
    const email = (userResult.rows[0] as Record<string, unknown> | undefined)?.['email'] ?? '';

    return c.json({
      token: newToken,
      expiresAt: expiresAt.toISOString(),
      user: { id: tempSession.userId, email },
    });
  } catch (err) {
    console.error('[auth/2fa/challenge]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/forgot-password ────────────────────────────────────────────────

authRouter.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json<{ email?: string }>();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return c.json({ error: 'email is required' }, 400);
    }

    const tenantId = c.req.header('x-tenant-id') ?? c.req.header('X-Veska-Tenant-Id') ?? '';

    // Look up user to get their name (for the email greeting), but don't reveal if not found
    const userResult = await sharedDb.execute(sql`
      SELECT id, name FROM users
      WHERE email = ${email}
        AND "tenantId" = ${tenantId}
      LIMIT 1
    `);

    if (userResult.rows.length) {
      const user = userResult.rows[0] as { id: string; name?: string };
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      await sharedDb.execute(sql`
        INSERT INTO "passwordResetTokens" (token, email, "tenantId", "expiresAt", used)
        VALUES (${token}, ${email}, ${tenantId}, ${expiresAt.toISOString()}, false)
      `);

      // Fire-and-forget
      void sendPasswordResetEmail({
        email,
        token,
        recipientName: typeof user.name === 'string' ? user.name : undefined,
      });
    }

    // Always respond ok to prevent enumeration
    return c.json({ ok: true });
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/reset-password ─────────────────────────────────────────────────

authRouter.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json<{ token?: string; password?: string }>();
    const { token, password } = body;

    if (!token || typeof token !== 'string') {
      return c.json({ error: 'invalid_token' }, 400);
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return c.json({ error: 'password must be at least 8 characters' }, 400);
    }

    // Look up the token record
    const tokenResult = await sharedDb.execute(sql`
      SELECT id, email, "tenantId", "expiresAt", used
      FROM "passwordResetTokens"
      WHERE token = ${token}
      LIMIT 1
    `);

    if (!tokenResult.rows.length) {
      return c.json({ error: 'invalid_token' }, 400);
    }

    const record = tokenResult.rows[0] as {
      id: string;
      email: string;
      tenantId: string;
      expiresAt: string;
      used: boolean;
    };

    if (record.used || new Date(record.expiresAt) < new Date()) {
      return c.json({ error: 'invalid_token' }, 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Update user password
    await sharedDb.execute(sql`
      UPDATE users
      SET "passwordHash" = ${passwordHash}
      WHERE email = ${record.email}
        AND "tenantId" = ${record.tenantId}
    `);

    // Mark token as used
    await sharedDb.execute(sql`
      UPDATE "passwordResetTokens"
      SET used = true
      WHERE id = ${record.id}
    `);

    return c.json({ ok: true });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── GET /auth/invite ──────────────────────────────────────────────────────────

authRouter.get('/invite', async (c) => {
  try {
    const token = c.req.query('token');
    if (!token) return c.json({ error: 'token is required' }, 400);

    const result = await sharedDb.execute(sql`
      SELECT it.email, it."expiresAt", it.used, t.name AS "tenantName"
      FROM "inviteTokens" it
      LEFT JOIN tenants t ON t.id = it."tenantId"
      WHERE it.token = ${token}
      LIMIT 1
    `);

    if (!result.rows.length) {
      return c.json({ error: 'invalid_token' }, 404);
    }

    const record = result.rows[0] as {
      email: string;
      expiresAt: string;
      used: boolean;
      tenantName: string | null;
    };

    if (record.used || new Date(record.expiresAt) < new Date()) {
      return c.json({ error: 'invalid_token' }, 404);
    }

    return c.json({ email: record.email, tenantName: record.tenantName ?? '' });
  } catch (err) {
    console.error('[auth/invite GET]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/accept-invite ──────────────────────────────────────────────────

authRouter.post('/accept-invite', async (c) => {
  try {
    const body = await c.req.json<{ token?: string; name?: string; password?: string }>();
    const { token, name, password } = body;

    if (!token || typeof token !== 'string') {
      return c.json({ error: 'token is required' }, 400);
    }
    if (!name || typeof name !== 'string') {
      return c.json({ error: 'name is required' }, 400);
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return c.json({ error: 'password must be at least 8 characters' }, 400);
    }

    const tokenResult = await sharedDb.execute(sql`
      SELECT id, email, "tenantId", "expiresAt", used
      FROM "inviteTokens"
      WHERE token = ${token}
      LIMIT 1
    `);

    if (!tokenResult.rows.length) {
      return c.json({ error: 'invalid_token' }, 400);
    }

    const record = tokenResult.rows[0] as {
      id: string;
      email: string;
      tenantId: string;
      expiresAt: string;
      used: boolean;
    };

    if (record.used || new Date(record.expiresAt) < new Date()) {
      return c.json({ error: 'invalid_token' }, 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create the user
    await sharedDb.execute(sql`
      INSERT INTO users ("tenantId", email, name, "passwordHash", "isActive")
      VALUES (${record.tenantId}, ${record.email}, ${name}, ${passwordHash}, true)
      ON CONFLICT (email, "tenantId") DO UPDATE
        SET name = EXCLUDED.name,
            "passwordHash" = EXCLUDED."passwordHash",
            "isActive" = true
    `);

    // Mark invite as used
    await sharedDb.execute(sql`
      UPDATE "inviteTokens"
      SET used = true
      WHERE id = ${record.id}
    `);

    return c.json({ ok: true });
  } catch (err) {
    console.error('[auth/accept-invite]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── POST /auth/mfa/login ──────────────────────────────────────────────────────

authRouter.post('/mfa/login', async (c) => {
  try {
    const body = await c.req.json<{ tempToken: string; code: string }>();
    const { tempToken, code } = body;

    if (!tempToken || !code) {
      return c.json({ error: 'tempToken and code are required' }, 400);
    }

    // Per-tempToken TOTP brute-force lockout
    const redis = getRedis();
    const attemptKey = `totp:attempts:${tempToken}`;
    const attempts = parseInt((await redis.get(attemptKey)) ?? '0', 10);
    if (attempts >= 5) {
      return c.json({ error: 'Too many failed attempts. Please log in again.' }, 429);
    }

    // Validate temp token session (must exist and not be expired)
    const tempResult = await sharedDb.execute(sql`
      SELECT id, "tenantId", "userId"
      FROM sessions
      WHERE token = ${tempToken}
        AND "expiresAt" > now()
    `);

    if (!tempResult.rows.length) {
      return c.json({ error: 'Invalid or expired temp token' }, 401);
    }

    const tempSession = tempResult.rows[0] as { id: string; tenantId: string; userId: string };

    // Look up TOTP secret
    const mfaResult = await sharedDb.execute(sql`
      SELECT secret FROM "mfaSecrets"
      WHERE "tenantId" = ${tempSession.tenantId}
        AND "userId" = ${tempSession.userId}
        AND verified = true
    `);

    if (!mfaResult.rows.length) {
      return c.json({ error: 'MFA not configured' }, 400);
    }

    const mfa = mfaResult.rows[0] as { secret: string };

    // Also check backup codes
    let codeValid = verifyTotp(mfa.secret, code);

    if (!codeValid) {
      // Check backup codes (hashed)
      const backupResult = await sharedDb.execute(sql`
        SELECT id, "backupCodes" FROM "mfaSecrets"
        WHERE "tenantId" = ${tempSession.tenantId}
          AND "userId" = ${tempSession.userId}
      `);

      if (backupResult.rows.length) {
        const mfaRow = backupResult.rows[0] as { id: string; backupCodes: string[] };
        const codeHash = sha256(code);
        const idx = mfaRow.backupCodes.findIndex((h) => h === codeHash);
        if (idx !== -1) {
          codeValid = true;
          // Remove used backup code
          const updatedCodes = [...mfaRow.backupCodes];
          updatedCodes.splice(idx, 1);
          await sharedDb.execute(sql`
            UPDATE "mfaSecrets"
            SET "backupCodes" = ${JSON.stringify(updatedCodes)}::jsonb
            WHERE id = ${mfaRow.id}
          `);
        }
      }
    }

    if (!codeValid) {
      await redis.multi().incr(attemptKey).expire(attemptKey, 300).exec();
      return c.json({ error: 'Invalid code' }, 401);
    }

    await redis.del(attemptKey);

    // Delete temp session, create full session
    await sharedDb.execute(sql`
      DELETE FROM sessions WHERE token = ${tempToken}
    `);

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const sessionResult = await sharedDb.execute(sql`
      INSERT INTO sessions ("tenantId", "userId", token, "expiresAt", "ipAddress", "userAgent")
      VALUES (
        ${tempSession.tenantId}, ${tempSession.userId}, ${token},
        ${expiresAt.toISOString()},
        ${c.req.header('x-forwarded-for') ?? null},
        ${c.req.header('user-agent') ?? null}
      )
      RETURNING id
    `);

    // Fetch user email
    const userResult = await sharedDb.execute(sql`
      SELECT email FROM users WHERE id = ${tempSession.userId}
    `);
    const email = (userResult.rows[0] as Record<string, unknown> | undefined)?.['email'] ?? '';

    return c.json({
      token,
      expiresAt: expiresAt.toISOString(),
      user: { id: tempSession.userId, email },
    });
  } catch (err) {
    console.error('[auth/mfa/login]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
