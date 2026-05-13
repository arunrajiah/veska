import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import { schema, ConfigAgent } from '@veska/core';
import { sharedDb, sharedLlm } from '../shared.js';

export interface TenantContext {
  tenantCtx: {
    tenantId: string;
    identityId: string;
    db: typeof sharedDb;
    configAgent: ConfigAgent;
  };
}

export const tenantContext: MiddlewareHandler<{ Variables: TenantContext }> = async (c, next) => {
  const tenantId = c.req.header('X-Veska-Tenant-Id');
  const identityId = c.req.header('X-Veska-Identity-Id');

  if (!tenantId || !identityId) {
    return c.json({ error: 'Missing tenant context headers' }, 401);
  }

  const tenant = await sharedDb.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
  });

  if (!tenant) {
    return c.json({ error: 'Tenant not found' }, 404);
  }

  const configAgent = new ConfigAgent(sharedDb, sharedLlm, sharedLlm.opusModel);

  c.set('tenantCtx', { tenantId, identityId, db: sharedDb, configAgent });
  await next();
};
