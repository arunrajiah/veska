import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { schema, StripeIntegrationAdapter } from '@veska/core';
import type { TenantContext } from '../middleware/tenant-context.js';

const app = new Hono<{ Variables: TenantContext }>();

const ADAPTERS = {
  stripe: new StripeIntegrationAdapter(),
} as const;

type AdapterName = keyof typeof ADAPTERS;

// List configured integrations for tenant
app.get('/', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const instances = await db.query.integrationInstances.findMany({
    where: eq(schema.integrationInstances.tenantId, tenantId),
  });
  return c.json({ integrations: instances });
});

// Configure an integration
app.post(
  '/',
  zValidator('json', z.object({
    name: z.string().min(1),
    config: z.record(z.string(), z.unknown()).default({}),
  })),
  async (c) => {
    const { db, tenantId } = c.get('tenantCtx');
    const { name, config } = c.req.valid('json');

    // Validate credentials if adapter exists
    const adapter = ADAPTERS[name as AdapterName];
    if (adapter && 'validateCredentials' in adapter) {
      const result = await (adapter as typeof ADAPTERS.stripe).validateCredentials(
        config as { secretKey: string },
      );
      if (!result.valid) {
        return c.json({ error: `Invalid credentials: ${result.error ?? 'unknown'}` }, 400);
      }
    }

    const [instance] = await db
      .insert(schema.integrationInstances)
      .values({ tenantId, name, config, enabled: true })
      .onConflictDoUpdate({
        target: [schema.integrationInstances.tenantId, schema.integrationInstances.name],
        set: { config, enabled: true, updatedAt: new Date() },
      })
      .returning();

    return c.json({ integration: instance }, 201);
  },
);

// Trigger a sync
app.post('/:name/sync', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const { name } = c.req.param();

  const instance = await db.query.integrationInstances.findFirst({
    where: and(
      eq(schema.integrationInstances.tenantId, tenantId),
      eq(schema.integrationInstances.name, name),
    ),
  });

  if (!instance) return c.json({ error: 'Integration not configured' }, 404);

  const adapter = ADAPTERS[name as AdapterName];
  if (!adapter) return c.json({ error: `No adapter for: ${name}` }, 400);

  // Run sync in background — respond immediately
  const syncFn = async () => {
    if (name === 'stripe') {
      const stripeAdapter = adapter as typeof ADAPTERS.stripe;
      const config = instance.config as { secretKey: string };
      const [customers, invoices] = await Promise.all([
        stripeAdapter.syncCustomers(config, {}),
        stripeAdapter.syncInvoices(config, {}),
      ]);
      // Update lastSyncedAt
      await db
        .update(schema.integrationInstances)
        .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.integrationInstances.id, instance.id));
      return { customers: customers.length, invoices: invoices.length };
    }
  };

  void syncFn().catch(console.error);

  return c.json({ status: 'sync_started', integration: name });
});

// Remove integration
app.delete('/:name', async (c) => {
  const { db, tenantId } = c.get('tenantCtx');
  const { name } = c.req.param();

  await db
    .update(schema.integrationInstances)
    .set({ enabled: false, updatedAt: new Date() })
    .where(
      and(
        eq(schema.integrationInstances.tenantId, tenantId),
        eq(schema.integrationInstances.name, name),
      ),
    );

  return c.json({ disabled: name });
});

export { app as integrationsRouter };
