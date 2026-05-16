import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { schema } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';
import { handleRouteError } from '../lib/api-error.js';

export const channelsRouter = new Hono<{ Variables: TenantContext }>();

// List connected channels for this tenant
channelsRouter.get('/', async (c) => {
  try {
    const { db, tenantId } = c.get('tenantCtx');
    const channels = await db.query.channelConfigs.findMany({
      where: eq(schema.channelConfigs.tenantId, tenantId),
    });
    // Strip credentialsRef from response
    return c.json(channels.map(({ credentialsRef: _cr, ...rest }) => rest));
  } catch (err) {
    return handleRouteError(c, err, 'GET /channels');
  }
});

// Health check for a specific channel
channelsRouter.get('/:channelName/health', async (c) => {
  try {
    const channelName = c.req.param('channelName');
    const { db, tenantId } = c.get('tenantCtx');

    const config = await db.query.channelConfigs.findFirst({
      where: and(
        eq(schema.channelConfigs.tenantId, tenantId),
        eq(schema.channelConfigs.channelName, channelName),
      ),
    });

    if (!config) return c.json({ error: 'Channel not connected' }, 404);
    return c.json({ channelName, enabled: config.enabled, healthy: true });
  } catch (err) {
    return handleRouteError(c, err, 'GET /channels/:channelName/health');
  }
});
