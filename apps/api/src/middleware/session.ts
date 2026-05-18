import { sql } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';
import { sharedDb } from '../shared.js';

export interface SessionRow {
  id: string;
  tenantId: string;
  userId: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface SessionContext {
  session: SessionRow;
  userId: string;
}

/**
 * Hono middleware that validates a Bearer token against the sessions table.
 * Sets c.get('session') and c.get('userId') on success.
 * Updates lastSeenAt asynchronously (fire-and-forget).
 */
export function requireSession(): MiddlewareHandler<{ Variables: SessionContext }> {
  return async (c, next) => {
    const authHeader = c.req.header('authorization') ?? c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const result = await sharedDb.execute(sql`
        SELECT id, "tenantId", "userId", token, "ipAddress", "userAgent",
               "expiresAt", "createdAt", "lastSeenAt"
        FROM sessions
        WHERE token = ${token}
          AND "expiresAt" > now()
      `);

      // drizzle-orm/postgres-js returns rows directly as an array
      const rows: unknown[] = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? [];

      if (!rows.length) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const session = rows[0] as SessionRow;
      c.set('session', session);
      c.set('userId', session.userId);

      // Fire-and-forget lastSeenAt update
      void sharedDb.execute(sql`
        UPDATE sessions
        SET "lastSeenAt" = now()
        WHERE token = ${token}
      `).catch(() => {
        // Intentionally swallow errors — non-critical update
      });

      await next();
    } catch {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  };
}
