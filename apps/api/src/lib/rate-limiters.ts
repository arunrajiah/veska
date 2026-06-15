import { inMemoryRateLimit } from '../middleware/rate-limit.js';

// Try to load cloud rate limiters; fall back to in-memory.
// Cloud deployments can replace this file or set RATE_LIMIT_PROVIDER=cloud
// to load @veska/rate-limit instead.
function createRateLimiters() {
  return {
    standardLimit: inMemoryRateLimit({ windowMs: 60_000, max: 300 }),
    aiLimit: inMemoryRateLimit({ windowMs: 60_000, max: 20 }),
    authLimit: inMemoryRateLimit({ windowMs: 60_000, max: 10 }),
  };
}

export const { standardLimit, aiLimit, authLimit } = createRateLimiters();
