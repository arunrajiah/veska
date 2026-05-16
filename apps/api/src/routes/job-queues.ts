import { Hono } from 'hono';
import { Queue } from 'bullmq';
import { sharedRedis } from '../shared.js';
import { handleRouteError } from '../lib/api-error.js';

// ── Known queue names ─────────────────────────────────────────
// Derived from JobName prefixes in packages/core/src/queue/jobs.ts
// plus direct enqueue calls in index.ts
const KNOWN_QUEUES = [
  'process',
  'workflow',
  'channel',
  'magic_link',
  'ai',
  'invoice',
  'integration',
  'portal',
  'inbound_message',
] as const;

// ── Queue factory — reuse instances across requests ────────────
const queueCache = new Map<string, Queue>();

function getQueue(name: string): Queue {
  let q = queueCache.get(name);
  if (!q) {
    q = new Queue(name, { connection: sharedRedis });
    queueCache.set(name, q);
  }
  return q;
}

// ── Valid job statuses ─────────────────────────────────────────
type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

const VALID_STATUSES = new Set<JobStatus>(['waiting', 'active', 'completed', 'failed', 'delayed']);

function isValidStatus(s: string): s is JobStatus {
  return VALID_STATUSES.has(s as JobStatus);
}

// ── Router ────────────────────────────────────────────────────
export const jobQueuesRouter = new Hono();

// GET /job-queues — list all queues with stats
jobQueuesRouter.get('/', async (c) => {
  try {
    const stats = await Promise.all(
      KNOWN_QUEUES.map(async (name) => {
        const queue = getQueue(name);
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
          'paused',
        );
        return {
          name,
          waiting: counts['waiting'] ?? 0,
          active: counts['active'] ?? 0,
          completed: counts['completed'] ?? 0,
          failed: counts['failed'] ?? 0,
          delayed: counts['delayed'] ?? 0,
          paused: counts['paused'] ?? 0,
        };
      }),
    );
    return c.json(stats);
  } catch (err) {
    return handleRouteError(c, err, 'GET /job-queues');
  }
});

// GET /job-queues/:name/jobs?status=failed&limit=20&offset=0
jobQueuesRouter.get('/:name/jobs', async (c) => {
  const name = c.req.param('name');
  const statusParam = c.req.query('status') ?? 'failed';
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20', 10), 100);
  const offset = Math.max(parseInt(c.req.query('offset') ?? '0', 10), 0);

  if (!KNOWN_QUEUES.includes(name as (typeof KNOWN_QUEUES)[number])) {
    return c.json({ error: `Unknown queue: ${name}` }, 404);
  }

  if (!isValidStatus(statusParam)) {
    return c.json({ error: `Invalid status: ${statusParam}. Must be one of: waiting, active, completed, failed, delayed` }, 400);
  }

  try {
    const queue = getQueue(name);
    const jobs = await queue.getJobs([statusParam], offset, offset + limit - 1);

    const result = jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data as unknown,
      opts: job.opts,
      processedOn: job.processedOn ?? null,
      finishedOn: job.finishedOn ?? null,
      failedReason: (job as { failedReason?: string }).failedReason ?? null,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    }));

    return c.json({ jobs: result });
  } catch (err) {
    return handleRouteError(c, err, `GET /job-queues/${name}/jobs`);
  }
});

// POST /job-queues/:name/jobs/:id/retry — retry a failed job
jobQueuesRouter.post('/:name/jobs/:id/retry', async (c) => {
  const name = c.req.param('name');
  const id = c.req.param('id');

  if (!KNOWN_QUEUES.includes(name as (typeof KNOWN_QUEUES)[number])) {
    return c.json({ error: `Unknown queue: ${name}` }, 404);
  }

  try {
    const queue = getQueue(name);
    const job = await queue.getJob(id);
    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }
    await job.retry();
    return c.json({ ok: true });
  } catch (err) {
    return handleRouteError(c, err, `POST /job-queues/${name}/jobs/${id}/retry`);
  }
});

// DELETE /job-queues/:name/jobs/:id — remove a job
jobQueuesRouter.delete('/:name/jobs/:id', async (c) => {
  const name = c.req.param('name');
  const id = c.req.param('id');

  if (!KNOWN_QUEUES.includes(name as (typeof KNOWN_QUEUES)[number])) {
    return c.json({ error: `Unknown queue: ${name}` }, 404);
  }

  try {
    const queue = getQueue(name);
    const job = await queue.getJob(id);
    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }
    await job.remove();
    return c.json({ ok: true });
  } catch (err) {
    return handleRouteError(c, err, `DELETE /job-queues/${name}/jobs/${id}`);
  }
});

// POST /job-queues/:name/clean — clean completed/failed jobs older than 24h
jobQueuesRouter.post('/:name/clean', async (c) => {
  const name = c.req.param('name');

  if (!KNOWN_QUEUES.includes(name as (typeof KNOWN_QUEUES)[number])) {
    return c.json({ error: `Unknown queue: ${name}` }, 404);
  }

  let body: { status?: string } = {};
  try {
    body = await c.req.json<{ status?: string }>();
  } catch {
    // body is optional
  }

  const status = body.status ?? 'completed';
  if (status !== 'completed' && status !== 'failed') {
    return c.json({ error: 'status must be "completed" or "failed"' }, 400);
  }

  try {
    const queue = getQueue(name);
    const gracePeriodMs = 24 * 60 * 60 * 1000; // 24 hours
    const removed = await queue.clean(gracePeriodMs, 1000, status);
    return c.json({ removed: removed.length });
  } catch (err) {
    return handleRouteError(c, err, `POST /job-queues/${name}/clean`);
  }
});
