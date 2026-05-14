import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { sharedDb } from '../shared.js';

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
    const body = await c.req.json<{ email: string; password: string; tenantId: string }>();
    const { email, password, tenantId } = body;

    if (!email || !password || !tenantId) {
      return c.json({ error: 'email, password, and tenantId are required' }, 400);
    }

    // Look up user
    const userResult = await sharedDb.execute(sql`
      SELECT id, email, "passwordHash", "isActive"
      FROM users
      WHERE email = ${email}
        AND "tenantId" = ${tenantId}
    `);

    if (!userResult.rows.length) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const user = userResult.rows[0] as {
      id: string;
      email: string;
      passwordHash: string | null;
      isActive: boolean;
    };

    if (!user.isActive) {
      return c.json({ error: 'Account is not active' }, 403);
    }

    // Compare password using SHA-256 + timingSafeEqual
    const inputHash = sha256(password);
    const storedHash = user.passwordHash ?? '';
    const inputBuf = Buffer.from(inputHash, 'hex');
    const storedBuf = Buffer.from(storedHash.padEnd(inputHash.length, '0'), 'hex');

    let passwordMatch = false;
    try {
      if (inputBuf.length === storedBuf.length) {
        passwordMatch = timingSafeEqual(inputBuf, storedBuf);
      }
    } catch {
      passwordMatch = false;
    }

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

      return c.json({ mfaRequired: true, tempToken });
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

    return c.json({
      token,
      expiresAt: expiresAt.toISOString(),
      user: { id: user.id, email: user.email },
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
  try {
    const provider = c.req.param('provider');
    const code = c.req.query('code');
    const state = c.req.query('state');

    console.log(`[auth/sso/${provider}/callback] code=${code} state=${state}`);

    // Mock: in production, exchange code for user info via OAuth2 / OIDC
    const tenantId = state ?? 'demo';
    const mockUserId = 'sso-user-' + randomBytes(4).toString('hex');
    const mockEmail = 'sso@example.com';

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await sharedDb.execute(sql`
      INSERT INTO sessions ("tenantId", "userId", token, "expiresAt", "ipAddress", "userAgent")
      VALUES (
        ${tenantId}, ${mockUserId}, ${token},
        ${expiresAt.toISOString()},
        ${c.req.header('x-forwarded-for') ?? null},
        ${c.req.header('user-agent') ?? null}
      )
    `);

    return c.json({
      token,
      user: { id: mockUserId, email: mockEmail },
    });
  } catch (err) {
    console.error('[auth/sso/callback]', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ── GET /auth/sso/config ──────────────────────────────────────────────────────

authRouter.get('/sso/config', async (c) => {
  try {
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

    return c.json({ secret, otpauthUrl });
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

// ── POST /auth/mfa/login ──────────────────────────────────────────────────────

authRouter.post('/mfa/login', async (c) => {
  try {
    const body = await c.req.json<{ tempToken: string; code: string }>();
    const { tempToken, code } = body;

    if (!tempToken || !code) {
      return c.json({ error: 'tempToken and code are required' }, 400);
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
      return c.json({ error: 'Invalid code' }, 401);
    }

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
