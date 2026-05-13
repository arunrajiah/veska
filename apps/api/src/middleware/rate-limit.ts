import { createMiddleware } from 'hono/factory';
import type { Redis } from 'ioredis';

interface RateLimitOptions {
  windowMs: number;    // e.g. 60_000 (1 minute)
  max: number;         // e.g. 60 requests per window
  keyPrefix?: string;
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
