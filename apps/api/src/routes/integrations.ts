import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { sharedDb } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const integrationsRouter = new Hono<{ Variables: TenantContext }>();

// ── Helpers ────────────────────────────────────────────────────

function maskConfig(config: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...config };
  if (typeof masked['apiKey'] === 'string' && masked['apiKey'].length > 4) {
    masked['apiKey'] = '****' + masked['apiKey'].slice(-4);
  }
  if (typeof masked['clientSecret'] === 'string' && masked['clientSecret'].length > 4) {
    masked['clientSecret'] = '****' + masked['clientSecret'].slice(-4);
  }
  return masked;
}

// ── Integration Config CRUD ────────────────────────────────────

// GET /integrations
integrationsRouter.get('/', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');

    const result = await sharedDb.execute(sql`
      SELECT * FROM "integrationConfigs"
      WHERE "tenantId" = ${tenantId}
      ORDER BY "createdAt" DESC
    `);

    const integrations = (result.rows as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      config: maskConfig((row['config'] ?? {}) as Record<string, unknown>),
    }));

    return c.json({ integrations });
  } catch (err) {
    return handleRouteError(c, err, 'GET /integrations');
  }
});

// POST /integrations
integrationsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json<{
      provider: string;
      name: string;
      config?: Record<string, unknown>;
      enabled?: boolean;
    }>();
    const { tenantId } = c.get('tenantCtx');

    if (!body.provider || !body.name) {
      return c.json({ error: 'provider and name are required' }, 400);
    }

    const config = body.config ?? {};

    const result = await sharedDb.execute(sql`
      INSERT INTO "integrationConfigs" ("tenantId", provider, name, config, enabled)
      VALUES (
        ${tenantId},
        ${body.provider},
        ${body.name},
        ${JSON.stringify(config)}::jsonb,
        ${body.enabled ?? true}
      )
      RETURNING *
    `);

    const row = result.rows[0] as Record<string, unknown>;

    return c.json(
      {
        integration: {
          ...row,
          config: maskConfig((row['config'] ?? {}) as Record<string, unknown>),
        },
      },
      201,
    );
  } catch (err) {
    return handleRouteError(c, err, 'POST /integrations');
  }
});

// GET /integrations/events — list event log
integrationsRouter.get('/events', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const integrationId = c.req.query('integrationId');
    const status = c.req.query('status');
    const limitParam = c.req.query('limit');
    const limit = Math.min(parseInt(limitParam ?? '50', 10), 200);

    const integrationClause = integrationId
      ? sql` AND "integrationId" = ${integrationId}`
      : sql``;
    const statusClause = status ? sql` AND status = ${status}` : sql``;

    const result = await sharedDb.execute(sql`
      SELECT * FROM "integrationEvents"
      WHERE "tenantId" = ${tenantId}
      ${integrationClause}
      ${statusClause}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `);

    return c.json({ events: result.rows });
  } catch (err) {
    return handleRouteError(c, err, 'GET /integrations/events');
  }
});

// DELETE /integrations/events — clear events older than 30 days
integrationsRouter.delete('/events', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');

    const result = await sharedDb.execute(sql`
      WITH deleted AS (
        DELETE FROM "integrationEvents"
        WHERE "tenantId" = ${tenantId}
          AND "createdAt" < now() - interval '30 days'
        RETURNING id
      )
      SELECT COUNT(*)::int AS count FROM deleted
    `);

    const count = (result.rows[0] as Record<string, unknown>)['count'] as number;
    return c.json({ deleted: count });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /integrations/events');
  }
});

// POST /integrations/trigger — fire event to all enabled integrations
integrationsRouter.post('/trigger', async (c) => {
  try {
  const { tenantId } = c.get('tenantCtx');
  const body = await c.req.json<{ eventType: string; payload: Record<string, unknown> }>();

  if (!body.eventType) {
    return c.json({ error: 'eventType is required' }, 400);
  }

  // Find all enabled integrations for tenant
  const result = await sharedDb.execute(sql`
    SELECT * FROM "integrationConfigs"
    WHERE "tenantId" = ${tenantId}
      AND enabled = true
  `);

  const integrations = result.rows as Array<Record<string, unknown>>;
  const triggered: string[] = [];

  await Promise.all(
    integrations.map(async (integration) => {
      const integrationId = integration['id'] as string;
      const config = (integration['config'] ?? {}) as Record<string, unknown>;
      const webhookUrl = config['webhookUrl'] as string | undefined;

      // Insert event log entry as 'pending'
      const eventInsert = await sharedDb.execute(sql`
        INSERT INTO "integrationEvents" (
          "tenantId", "integrationId", "eventType", payload, status
        )
        VALUES (
          ${tenantId},
          ${integrationId},
          ${body.eventType},
          ${JSON.stringify(body.payload)}::jsonb,
          'pending'
        )
        RETURNING id
      `);
      const eventId = (eventInsert.rows[0] as Record<string, unknown>)['id'] as string;

      if (webhookUrl) {
        triggered.push(integrationId);

        // Fire and forget
        void (async () => {
          let statusCode: number | null = null;
          let responseBody: string | null = null;
          let status = 'failed';
          try {
            const resp = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: body.eventType,
                tenantId,
                payload: body.payload,
                timestamp: new Date().toISOString(),
              }),
              signal: AbortSignal.timeout(5000),
            });
            statusCode = resp.status;
            responseBody = await resp.text().catch(() => null);
            status = resp.ok ? 'delivered' : 'failed';
          } catch {
            status = 'failed';
          }

          try {
            await sharedDb.execute(sql`
              UPDATE "integrationEvents"
              SET status = ${status},
                  "statusCode" = ${statusCode},
                  "responseBody" = ${responseBody},
                  "deliveredAt" = ${status === 'delivered' ? new Date() : null}
              WHERE id = ${eventId}
            `);
          } catch {
            // best effort log update
          }
        })();
      } else {
        // No webhookUrl — mark as delivered (nothing to do)
        await sharedDb.execute(sql`
          UPDATE "integrationEvents"
          SET status = 'delivered', "deliveredAt" = now()
          WHERE id = ${eventId}
        `).catch(() => undefined);
      }
    }),
  );

  return c.json({ triggered: triggered.length, integrationIds: triggered });
  } catch (err) {
    return handleRouteError(c, err, 'POST /integrations/trigger');
  }
});

// GET /integrations/:id
integrationsRouter.get('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const result = await sharedDb.execute(sql`
      SELECT * FROM "integrationConfigs"
      WHERE id = ${id}
        AND "tenantId" = ${tenantId}
    `);

    if (!result.rows.length) {
      return c.json({ error: 'Integration not found' }, 404);
    }

    const row = result.rows[0] as Record<string, unknown>;
    return c.json({
      integration: {
        ...row,
        config: maskConfig((row['config'] ?? {}) as Record<string, unknown>),
      },
    });
  } catch (err) {
    return handleRouteError(c, err, 'GET /integrations/:id');
  }
});

// PUT /integrations/:id
integrationsRouter.put('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();
    const body = await c.req.json<{
      provider?: string;
      name?: string;
      config?: Record<string, unknown>;
      enabled?: boolean;
    }>();

    // Check ownership
    const existing = await sharedDb.execute(sql`
      SELECT id FROM "integrationConfigs"
      WHERE id = ${id} AND "tenantId" = ${tenantId}
    `);
    if (!existing.rows.length) {
      return c.json({ error: 'Integration not found' }, 404);
    }

    const providerClause =
      body.provider !== undefined ? sql`, provider = ${body.provider}` : sql``;
    const nameClause = body.name !== undefined ? sql`, name = ${body.name}` : sql``;
    const configClause =
      body.config !== undefined
        ? sql`, config = ${JSON.stringify(body.config)}::jsonb`
        : sql``;
    const enabledClause =
      body.enabled !== undefined ? sql`, enabled = ${body.enabled}` : sql``;

    const result = await sharedDb.execute(sql`
      UPDATE "integrationConfigs"
      SET "updatedAt" = now()
      ${providerClause}
      ${nameClause}
      ${configClause}
      ${enabledClause}
      WHERE id = ${id}
        AND "tenantId" = ${tenantId}
      RETURNING *
    `);

    const row = result.rows[0] as Record<string, unknown>;
    return c.json({
      integration: {
        ...row,
        config: maskConfig((row['config'] ?? {}) as Record<string, unknown>),
      },
    });
  } catch (err) {
    return handleRouteError(c, err, 'PUT /integrations/:id');
  }
});

// DELETE /integrations/:id
integrationsRouter.delete('/:id', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const result = await sharedDb.execute(sql`
      DELETE FROM "integrationConfigs"
      WHERE id = ${id}
        AND "tenantId" = ${tenantId}
      RETURNING id
    `);

    if (!result.rows.length) {
      return c.json({ error: 'Integration not found' }, 404);
    }

    return c.json({ deleted: id });
  } catch (err) {
    return handleRouteError(c, err, 'DELETE /integrations/:id');
  }
});

// POST /integrations/:id/test — test webhook connection
integrationsRouter.post('/:id/test', async (c) => {
  try {
    const { tenantId } = c.get('tenantCtx');
    const { id } = c.req.param();

    const result = await sharedDb.execute(sql`
      SELECT * FROM "integrationConfigs"
      WHERE id = ${id}
        AND "tenantId" = ${tenantId}
    `);

    if (!result.rows.length) {
      return c.json({ error: 'Integration not found' }, 404);
    }

    const integration = result.rows[0] as Record<string, unknown>;
    const config = (integration['config'] ?? {}) as Record<string, unknown>;
    const webhookUrl = config['webhookUrl'] as string | undefined;

    if (!webhookUrl) {
      return c.json({ error: 'Integration has no webhookUrl configured' }, 400);
    }

    const start = Date.now();
    let success = false;
    let statusCode: number | null = null;
    let testStatus = 'failed';

    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          tenantId,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(5000),
      });
      statusCode = resp.status;
      success = resp.ok;
      testStatus = resp.ok ? 'ok' : 'failed';
    } catch {
      testStatus = 'failed';
    }

    const latencyMs = Date.now() - start;

    await sharedDb.execute(sql`
      UPDATE "integrationConfigs"
      SET "lastTestedAt" = now(),
          "lastTestStatus" = ${testStatus},
          "updatedAt" = now()
      WHERE id = ${id}
    `);

    return c.json({ success, statusCode, latencyMs });
  } catch (err) {
    return handleRouteError(c, err, 'POST /integrations/:id/test');
  }
});
