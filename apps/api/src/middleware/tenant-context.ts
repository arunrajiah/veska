import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import { schema, ConfigAgent, withTenantTransaction } from '@veska/core';
import { sharedDb, sharedLlm } from '../shared.js';
import type { SessionContext } from './session.js';

export interface TenantContext {
  tenantCtx: {
    tenantId: string;
    identityId: string;
    db: typeof sharedDb;
    configAgent: ConfigAgent;
  };
}

export const tenantContext: MiddlewareHandler<{
  Variables: TenantContext & SessionContext;
}> = async (c, next) => {
  const session = c.get('session');
  const headerTenantId = c.req.header('X-Veska-Tenant-Id');
  const identityId = c.req.header('X-Veska-Identity-Id');

  // Use session's tenantId as the authoritative source; don't trust the header alone
  const tenantId = session?.tenantId ?? headerTenantId;

  if (!tenantId) {
    return c.json({ error: 'Missing tenant context' }, 401);
  }

  // If the header is present and contradicts the session tenant, reject the request
  if (headerTenantId && session?.tenantId && headerTenantId !== session.tenantId) {
    return c.json({ error: 'Tenant mismatch' }, 403);
  }

  if (!identityId) {
    return c.json({ error: 'Missing identity context header' }, 401);
  }

  const tenant = await sharedDb.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
  });

  if (!tenant) {
    return c.json({ error: 'Tenant not found' }, 404);
  }

  const configAgent = new ConfigAgent(sharedDb, sharedLlm);

  // SSE holds its response open for the client's lifetime; wrapping it in a
  // transaction would pin a pooled connection per viewer. It only reads the tenant id
  // from context, so it keeps the shared handle.
  if (c.req.path.includes('/sse/')) {
    c.set('tenantCtx', { tenantId, identityId, db: sharedDb, configAgent });
    await next();
    return;
  }

  // Every other request runs inside a transaction with app.tenant_id set, so the RLS
  // policies constrain each query to this tenant at the database level.
  await withTenantTransaction(sharedDb, tenantId, async (scopedDb) => {
    c.set('tenantCtx', { tenantId, identityId, db: scopedDb, configAgent });
    await next();
  });
};
