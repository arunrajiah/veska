import { createMiddleware } from 'hono/factory';
import type { Context, MiddlewareHandler } from 'hono';
import type { Redis } from 'ioredis';

interface RateLimitOptions {
  windowMs: number;    // e.g. 60_000 (1 minute)
  max: number;         // e.g. 60 requests per window
  keyPrefix?: string;
}

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Good enough for single-instance deployments; use Redis-backed for cloud scale.

interface InMemoryRateLimitOptions {
  windowMs: number;
  max: number;
  keyFn?: (c: Context) => string;
}

interface WindowEntry {
  count: number;
  windowStart: number;
}

export function inMemoryRateLimit(opts: InMemoryRateLimitOptions): MiddlewareHandler {
  const store = new Map<string, WindowEntry>();

  return async (c, next) => {
    const key = opts.keyFn?.(c) ?? (c.req.header('x-forwarded-for') ?? 'unknown');
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now - entry.windowStart > opts.windowMs) {
      store.set(key, { count: 1, windowStart: now });
      // Cleanup stale entries every time the store grows large
      if (store.size > 1000) {
        for (const [k, v] of store) {
          if (now - v.windowStart > opts.windowMs) store.delete(k);
        }
      }
    } else {
      entry.count++;
      if (entry.count > opts.max) {
        return c.json({ error: 'Too many requests' }, 429);
      }
    }

    await next();
  };
}

export function rateLimit(redis: Redis, opts: RateLimitOptions) {
  return createMiddleware(async (c, next) => {
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? 'unknown';
    const tenantId = c.req.header('X-Veska-Tenant-Id') ?? 'anon';
    const key = `${opts.keyPrefix ?? 'rl'}:${tenantId}:${ip}:${Math.floor(Date.now() / opts.windowMs)}`;

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.pexpire(key, opts.windowMs);
    }

    c.header('X-RateLimit-Limit', String(opts.max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, opts.max - count)));

    if (count > opts.max) {
      return c.json({ error: 'Too many requests' }, 429);
    }

    await next();
  });
}
