import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { randomBytes, createHmac } from 'node:crypto';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const webhooksRouter = new Hono<{ Variables: TenantContext }>();

// ── URL safety validation (SSRF protection) ────────────────────

function isSafeWebhookUrl(rawUrl: string): boolean {
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return false; }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  // Block loopback, private ranges, link-local, cloud metadata
  if (host === 'localhost') return false;
  if (/^127\./.test(host)) return false;
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (host === '169.254.169.254') return false; // AWS IMDS
  if (host.endsWith('.internal')) return false;
  if (host === '0.0.0.0') return false;
  return true;
}

// ── Endpoints ──────────────────────────────────────────────────

// GET /endpoints — list endpoints for tenant (no secret)
webhooksRouter.get('/endpoints', async (c) => {
  const { tenantId } = c.get('tenantCtx');

  const result = await sharedDb.execute(sql`
    SELECT "id", "tenantId", "url", "description", "events", "enabled",
           "createdAt", "updatedAt"
    FROM "webhookEndpoints"
    WHERE "tenantId" = ${tenantId}
    ORDER BY "createdAt" DESC
  `);

  return c.json({ endpoints: result.rows });
});

// POST /endpoints — create endpoint with auto-generated secret
webhooksRouter.post('/endpoints', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{ url: string; description?: string; events?: string[] }>();

  if (!body.url) return c.json({ error: 'url is required' }, 400);

  if (!isSafeWebhookUrl(body.url)) {
    return c.json({ error: 'Invalid webhook URL. Must be a public HTTPS endpoint.' }, 400);
  }
  if (process.env['NODE_ENV'] === 'production' && !body.url.startsWith('https://')) {
    return c.json({ error: 'Webhook URLs must use HTTPS in production.' }, 400);
  }

  const secret = randomBytes(24).toString('hex');
  const events: string[] = body.events ?? [];

  const result = await sharedDb.execute(sql`
    INSERT INTO "webhookEndpoints" ("tenantId", "url", "description", "events", "secret")
    VALUES (${tenantId}, ${body.url}, ${body.description ?? null}, ${events}, ${secret})
    RETURNING *
  `);

  // Return secret only on creation
  return c.json(result.rows[0], 201);
});

// GET /endpoints/:id — single endpoint (no secret)
webhooksRouter.get('/endpoints/:id', async (c) => {
  const id = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');

  const result = await sharedDb.execute(sql`
    SELECT "id", "tenantId", "url", "description", "events", "enabled",
           "createdAt", "updatedAt"
    FROM "webhookEndpoints"
    WHERE "id" = ${id}::uuid
      AND "tenantId" = ${tenantId}
  `);

  if (!result.rows.length) return c.json({ error: 'Not found' }, 404);
  return c.json(result.rows[0]);
});

// PATCH /endpoints/:id — update url/description/events/enabled
webhooksRouter.patch('/endpoints/:id', async (c) => {
  const id = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{ url?: string; description?: string; events?: string[]; enabled?: boolean }>();

  if (body.url !== undefined) {
    if (!isSafeWebhookUrl(body.url)) {
      return c.json({ error: 'Invalid webhook URL. Must be a public HTTPS endpoint.' }, 400);
    }
    if (process.env['NODE_ENV'] === 'production' && !body.url.startsWith('https://')) {
      return c.json({ error: 'Webhook URLs must use HTTPS in production.' }, 400);
    }
  }

  const result = await sharedDb.execute(sql`
    UPDATE "webhookEndpoints"
    SET
      "url"         = COALESCE(${body.url ?? null}, "url"),
      "description" = COALESCE(${body.description ?? null}, "description"),
      "events"      = COALESCE(${body.events ?? null}, "events"),
      "enabled"     = COALESCE(${body.enabled ?? null}, "enabled"),
      "updatedAt"   = now()
    WHERE "id" = ${id}::uuid
      AND "tenantId" = ${tenantId}
    RETURNING "id", "tenantId", "url", "description", "events", "enabled",
              "createdAt", "updatedAt"
  `);

  if (!result.rows.length) return c.json({ error: 'Not found' }, 404);
  return c.json(result.rows[0]);
});

// DELETE /endpoints/:id — hard delete
webhooksRouter.delete('/endpoints/:id', async (c) => {
  const id = c.req.param('id');
  const { tenantId } = c.get('tenantCtx');

  await sharedDb.execute(sql`
    DELETE FROM "webhookEndpoints"
    WHERE "id" = ${id}::uuid
      AND "tenantId" = ${tenantId}
  `);

  return c.json({ deleted: true });
});

// ── Deliveries ─────────────────────────────────────────────────

// GET /deliveries — last 50 deliveries, optional ?endpointId=
webhooksRouter.get('/deliveries', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const endpointId = c.req.query('endpointId');

  let result;
  if (endpointId) {
    result = await sharedDb.execute(sql`
      SELECT d.*
      FROM "webhookDeliveries" d
      JOIN "webhookEndpoints" e ON e."id" = d."endpointId"
      WHERE e."tenantId" = ${tenantId}
        AND d."endpointId" = ${endpointId}::uuid
      ORDER BY d."createdAt" DESC
      LIMIT 50
    `);
  } else {
    result = await sharedDb.execute(sql`
      SELECT d.*
      FROM "webhookDeliveries" d
      JOIN "webhookEndpoints" e ON e."id" = d."endpointId"
      WHERE e."tenantId" = ${tenantId}
      ORDER BY d."createdAt" DESC
      LIMIT 50
    `);
  }

  return c.json({ deliveries: result.rows });
});

// POST /test/:endpointId — fire real HTTP POST to endpoint with HMAC signature
webhooksRouter.post('/test/:endpointId', async (c) => {
  const endpointId = c.req.param('endpointId');
  const { tenantId } = c.get('tenantCtx');

  // Fetch endpoint + secret
  const epResult = await sharedDb.execute(sql`
    SELECT * FROM "webhookEndpoints"
    WHERE "id" = ${endpointId}::uuid
      AND "tenantId" = ${tenantId}
  `);

  if (!epResult.rows.length) return c.json({ error: 'Endpoint not found' }, 404);
  const endpoint = epResult.rows[0] as Record<string, unknown>;

  const endpointUrl = endpoint['url'] as string;
  if (!isSafeWebhookUrl(endpointUrl)) {
    return c.json({ error: 'Invalid webhook URL. Must be a public HTTPS endpoint.' }, 400);
  }

  const payload = {
    event: 'test',
    tenantId,
    timestamp: new Date().toISOString(),
    data: { message: 'This is a test delivery from Veska.' },
  };

  const body = JSON.stringify(payload);
  const sig = createHmac('sha256', endpoint['secret'] as string).update(body).digest('hex');

  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let status = 'pending';

  // Insert delivery record (pending)
  const deliveryResult = await sharedDb.execute(sql`
    INSERT INTO "webhookDeliveries" ("endpointId", "event", "payload", "status")
    VALUES (${endpointId}::uuid, 'test', ${payload}::jsonb, 'pending')
    RETURNING "id"
  `);
  const deliveryId = (deliveryResult.rows[0] as Record<string, unknown>)['id'] as string;

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Veska-Signature': `sha256=${sig}`,
      },
      body,
    });

    statusCode = response.status;
    responseBody = await response.text();
    status = response.ok ? 'delivered' : 'failed';
  } catch (err) {
    status = 'failed';
    responseBody = err instanceof Error ? err.message : String(err);
  }

  // Update delivery record
  await sharedDb.execute(sql`
    UPDATE "webhookDeliveries"
    SET "status" = ${status}, "statusCode" = ${statusCode}, "responseBody" = ${responseBody}
    WHERE "id" = ${deliveryId}::uuid
  `);

  return c.json({ deliveryId, status, statusCode, responseBody });
});
