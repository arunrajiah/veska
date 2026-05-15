import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { sharedDb, sharedRedis } from '../shared.js';

export const healthRouter = new Hono();

// ── Helpers ────────────────────────────────────────────────────

function formatUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

// ── GET /health ────────────────────────────────────────────────

healthRouter.get('/', async (c) => {
  // Database check
  let dbStatus: 'up' | 'down' = 'down';
  let dbLatencyMs = 0;

  try {
    const t0 = process.hrtime.bigint();
    await sharedDb.execute(sql`SELECT 1`);
    const t1 = process.hrtime.bigint();
    dbLatencyMs = Number(t1 - t0) / 1_000_000;
    dbStatus = 'up';
  } catch {
    // dbStatus remains 'down'
  }

  // Redis check
  let redisStatus: 'up' | 'down' | 'unavailable' = 'unavailable';
  let redisLatencyMs = 0;

  try {
    const t0 = process.hrtime.bigint();
    await sharedRedis.ping();
    const t1 = process.hrtime.bigint();
    redisLatencyMs = Number(t1 - t0) / 1_000_000;
    redisStatus = 'up';
  } catch {
    redisStatus = 'down';
  }

  const uptimeSeconds = process.uptime();

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (dbStatus === 'down') {
    overallStatus = 'unhealthy';
  } else if (redisStatus === 'down') {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const body = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    services: {
      database: { status: dbStatus, latencyMs: Math.round(dbLatencyMs) },
      redis: { status: redisStatus, latencyMs: Math.round(redisLatencyMs) },
      api: { status: 'up' as const, uptimeSeconds: Math.floor(uptimeSeconds) },
    },
  };

  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
  return c.json(body, httpStatus);
});

// ── GET /metrics ───────────────────────────────────────────────

healthRouter.get('/metrics', async (c) => {
  const now = new Date();
  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const ago7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [entityCountsResult, tenantCountResult, activityResult] = await Promise.all([
    sharedDb.execute(sql`
      SELECT "entityType", COUNT(*)::int AS count
      FROM "entityRecords"
      GROUP BY "entityType"
      ORDER BY count DESC
    `),
    sharedDb.execute(sql`
      SELECT COUNT(DISTINCT "tenantId")::int AS count FROM "entityRecords"
    `),
    sharedDb.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE "createdAt" >= ${ago24h}::timestamptz)::int AS "last24h",
        COUNT(*) FILTER (WHERE "createdAt" >= ${ago7d}::timestamptz)::int  AS "last7d",
        COUNT(*) FILTER (WHERE "createdAt" >= ${ago30d}::timestamptz)::int AS "last30d"
      FROM "entityRecords"
    `),
  ]);

  type EntityRow = { entityType: string; count: number };
  const entities: Record<string, number> = {};
  for (const row of entityCountsResult.rows as EntityRow[]) {
    entities[row.entityType] = row.count;
  }

  const tenants = (tenantCountResult.rows[0] as { count: number })?.count ?? 0;
  const activity = (activityResult.rows[0] as { last24h: number; last7d: number; last30d: number }) ?? {
    last24h: 0,
    last7d: 0,
    last30d: 0,
  };

  const uptimeSeconds = Math.floor(process.uptime());

  return c.json({
    timestamp: now.toISOString(),
    entities,
    tenants,
    activity: {
      last24h: activity.last24h,
      last7d: activity.last7d,
      last30d: activity.last30d,
    },
    uptime: {
      seconds: uptimeSeconds,
      human: formatUptime(uptimeSeconds),
    },
  });
});
