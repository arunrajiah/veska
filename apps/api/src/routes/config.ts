import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { TenantContext } from '../middleware/tenant-context.js';

export const configRouter = new Hono<{ Variables: TenantContext }>();

// Propose a config change
configRouter.post(
  '/propose',
  zValidator('json', z.object({ request: z.string().min(1) })),
  async (c) => {
    const { request } = c.req.valid('json');
    const { configAgent, tenantId } = c.get('tenantCtx');

    const diff = await configAgent.proposeChange(tenantId, request);
    return c.json(diff, 201);
  },
);

// Apply an approved diff
configRouter.post(
  '/apply/:diffId',
  async (c) => {
    const diffId = c.req.param('diffId');
    const { configAgent, identityId } = c.get('tenantCtx');

    const result = await configAgent.applyChange(diffId, identityId);
    return c.json(result);
  },
);

// Rollback to a previous config version
configRouter.post(
  '/rollback/:configVersionId',
  async (c) => {
    const configVersionId = c.req.param('configVersionId');
    const { configAgent, tenantId, identityId } = c.get('tenantCtx');

    await configAgent.rollback(tenantId, configVersionId, identityId);
    return c.json({ success: true });
  },
);
