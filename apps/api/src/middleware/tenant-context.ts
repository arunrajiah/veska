import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import { createDatabase, schema, ConfigAgent, AnthropicProvider } from '@veska/core';

export interface TenantContext {
  tenantCtx: {
    tenantId: string;
    identityId: string;
    db: ReturnType<typeof createDatabase>;
    configAgent: ConfigAgent;
  };
}

// Singleton DB connection — created once at startup
const db = createDatabase(process.env['DATABASE_URL'] ?? 'postgresql://veska:veska@localhost:5432/veska');

const llm = new AnthropicProvider({
  apiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
});

export const tenantContext: MiddlewareHandler<{ Variables: TenantContext }> = async (c, next) => {
  // In production: decode a signed JWT and extract tenantId + identityId
  // For now: read from headers (to be replaced by proper auth middleware)
  const tenantId = c.req.header('X-Veska-Tenant-Id');
  const identityId = c.req.header('X-Veska-Identity-Id');

  if (!tenantId || !identityId) {
    return c.json({ error: 'Missing tenant context headers' }, 401);
  }

  // Verify tenant exists
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
  });

  if (!tenant) {
    return c.json({ error: 'Tenant not found' }, 404);
  }

  const configAgent = new ConfigAgent(db, llm, llm.opusModel);

  c.set('tenantCtx', { tenantId, identityId, db, configAgent });
  await next();
};
