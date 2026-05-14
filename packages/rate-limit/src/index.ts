import type { Context, Next } from 'hono';

export interface RateLimitOptions {
  windowMs: number;      // window duration in ms (e.g. 60_000 for 1 minute)
  max: number;           // max requests per window
  keyPrefix?: string;    // Redis key prefix (default: 'rl')
  keyFn?: (c: Context) => string; // how to identify the client (default: IP)
  message?: string;      // error message
  skipFn?: (c: Context) => boolean; // skip rate limiting for certain requests
}

/**
 * Sliding-window rate limiter using Redis ZADD/ZCOUNT.
 * Falls back gracefully (allows all) when Redis is unavailable.
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyPrefix = 'rl',
    keyFn = (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
    message = 'Too many requests, please try again later.',
    skipFn,
  } = options;

  let redisClient: any = null;
  let redisAvailable = false;

  async function getRedis() {
    if (redisClient) return redisClient;
    try {
      // Dynamically import ioredis — only if available
      const { default: Redis } = await import('ioredis');
      const client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
      });
      await client.connect();
      redisAvailable = true;
      redisClient = client;
      return client;
    } catch {
      redisAvailable = false;
      return null;
    }
  }

  return async (c: Context, next: Next) => {
    if (skipFn?.(c)) return next();

    const redis = await getRedis();
    if (!redis || !redisAvailable) {
      // Redis unavailable — allow all requests
      return next();
    }

    const key = `${keyPrefix}:${keyFn(c)}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, '-inf', windowStart);
      pipeline.zadd(key, now.toString(), `${now}-${Math.random()}`);
      pipeline.zcount(key, windowStart, '+inf');
      pipeline.expire(key, Math.ceil(windowMs / 1000));
      const results = await pipeline.exec();

      const count = (results?.[2]?.[1] as number) ?? 0;

      c.res.headers.set('X-RateLimit-Limit', String(max));
      c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, max - count)));
      c.res.headers.set('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));

      if (count > max) {
        return c.json({ error: message }, 429);
      }
    } catch {
      // Redis error — fail open
    }

    return next();
  };
}

// Pre-configured rate limiters for common use cases
export const standardLimit = () => rateLimit({ windowMs: 60_000, max: 100 });
export const strictLimit = () => rateLimit({ windowMs: 60_000, max: 20 });
export const aiLimit = () => rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'rl:ai' });
export const authLimit = () => rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: 'rl:auth' });
