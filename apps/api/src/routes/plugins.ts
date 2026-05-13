import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { schema, PluginManager, PluginRuntime } from '@veska/core';
import { sharedDb, sharedAuditService, sharedQueueService } from '../shared.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const pluginsRouter = new Hono<{ Variables: TenantContext }>();

const pluginManager = new PluginManager(sharedDb);
const runtime = new PluginRuntime({ timeoutMs: 30_000 });

// ── List installed plugins ────────────────────────────────────

pluginsRouter.get('/', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const plugins = await pluginManager.list(tenantId);
  return c.json({ plugins });
});

// ── Install a plugin ──────────────────────────────────────────

pluginsRouter.post(
  '/install',
  zValidator(
    'json',
    z.object({
      manifest: z.object({
        pluginId: z.string().min(1),
        name: z.string().min(1),
        version: z.string().min(1),
      }),
      code: z.string().min(1),
      config: z.record(z.unknown()).optional(),
    }),
  ),
  async (c) => {
    const { tenantId } = c.get('tenantCtx');
    const { manifest, code, config } = c.req.valid('json');

    const plugin = await pluginManager.install(tenantId, manifest, code, config ?? {});
    return c.json({ plugin }, 201);
  },
);

// ── Uninstall a plugin ────────────────────────────────────────

pluginsRouter.delete('/:pluginId', async (c) => {
  const { tenantId } = c.get('tenantCtx');
  const pluginId = c.req.param('pluginId');

  await pluginManager.uninstall(tenantId, pluginId);
  return c.json({ success: true });
});

// ── Run a plugin function ─────────────────────────────────────

pluginsRouter.post(
  '/:pluginId/run',
  zValidator(
    'json',
    z.object({
      functionName: z.string().min(1),
      input: z.record(z.unknown()).optional(),
    }),
  ),
  async (c) => {
    const { tenantId } = c.get('tenantCtx');
    const pluginId = c.req.param('pluginId');
    const { functionName, input } = c.req.valid('json');

    const pluginCode = await pluginManager.getCode(tenantId, pluginId);

    const sdkHandlers: Parameters<typeof runtime.run>[0]['context']['sdkHandlers'] = {
      'entities.find': async (args) => {
        const [entityType, filters] = args as [string, Record<string, unknown>?];
        const conditions = [
          eq(schema.entityRecords.tenantId, tenantId),
          eq(schema.entityRecords.entityType, entityType),
          isNull(schema.entityRecords.deletedAt),
        ];
        if (filters?.id && typeof filters.id === 'string') {
          conditions.push(eq(schema.entityRecords.id, filters.id));
        }
        return sharedDb.query.entityRecords.findMany({ where: and(...conditions) });
      },

      'entities.findOne': async (args) => {
        const [entityType, id] = args as [string, string];
        return sharedDb.query.entityRecords.findFirst({
          where: and(
            eq(schema.entityRecords.tenantId, tenantId),
            eq(schema.entityRecords.entityType, entityType),
            eq(schema.entityRecords.id, id),
            isNull(schema.entityRecords.deletedAt),
          ),
        });
      },

      'entities.create': async (args) => {
        const [entityType, data] = args as [string, Record<string, unknown>];
        const [record] = await sharedDb
          .insert(schema.entityRecords)
          .values({ tenantId, entityType, data })
          .returning();
        return record;
      },

      'entities.update': async (args) => {
        const [, id, data] = args as [string, string, Record<string, unknown>];
        const existing = await sharedDb.query.entityRecords.findFirst({
          where: and(
            eq(schema.entityRecords.tenantId, tenantId),
            eq(schema.entityRecords.id, id),
            isNull(schema.entityRecords.deletedAt),
          ),
        });
        if (!existing) throw new Error(`Entity not found: ${id}`);
        const [updated] = await sharedDb
          .update(schema.entityRecords)
          .set({ data: { ...(existing.data as Record<string, unknown>), ...data }, updatedAt: new Date() })
          .where(eq(schema.entityRecords.id, id))
          .returning();
        return updated;
      },

      'entities.delete': async (args) => {
        const [, id] = args as [string, string];
        await sharedDb
          .update(schema.entityRecords)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(schema.entityRecords.tenantId, tenantId), eq(schema.entityRecords.id, id)));
        return { success: true };
      },

      'workflows.trigger': async (args) => {
        const [workflowName, context] = args as [string, Record<string, unknown>];
        const jobId = await (sharedQueueService.enqueue as (
          name: string,
          payload: Record<string, unknown>,
        ) => Promise<string>)('workflow.trigger', { tenantId, workflowName, context });
        return { jobId };
      },

      'channels.send': async (args) => {
        const [channelName, recipientChannelId, message] = args as [
          string,
          string,
          { text: string; threadId?: string },
        ];
        const jobId = await sharedQueueService.enqueue('channel.send_message', {
          tenantId,
          channelName,
          recipientChannelId,
          message,
        });
        return { jobId };
      },

      'audit.log': async (args) => {
        const [event] = args as [Record<string, unknown>];
        await sharedAuditService.log({
          tenantId,
          actorType: 'plugin',
          action: (event['action'] as string) ?? 'plugin.action',
          resourceType: event['resourceType'] as string | undefined,
          resourceId: event['resourceId'] as string | undefined,
          metadata: { pluginId, ...(event['metadata'] as Record<string, unknown> | undefined) },
        });
        return { success: true };
      },
    };

    const result = await runtime.run({
      pluginCode,
      functionName,
      input: input ?? {},
      context: { tenantId, pluginId, sdkHandlers },
    });

    if (!result.success) {
      return c.json({ error: result.error, durationMs: result.durationMs }, 500);
    }

    return c.json({ result: result.result, durationMs: result.durationMs });
  },
);
