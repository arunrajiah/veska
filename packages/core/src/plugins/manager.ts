import { eq, and, isNull, sql } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';

export interface InstalledPlugin {
  id: string;
  tenantId: string;
  pluginId: string; // reverse-domain, e.g. 'com.veska.slack'
  name: string;
  version: string;
  enabled: boolean;
  config: Record<string, unknown>;
  installedAt: Date;
}

interface PluginManifest {
  pluginId: string;
  name: string;
  version: string;
}

function rowToPlugin(row: {
  id: string;
  tenantId: string;
  data: unknown;
  createdAt: Date;
}): InstalledPlugin {
  const d = row.data as Record<string, unknown>;
  return {
    id: row.id,
    tenantId: row.tenantId,
    pluginId: d['pluginId'] as string,
    name: d['name'] as string,
    version: d['version'] as string,
    enabled: d['enabled'] as boolean,
    config: (d['config'] ?? {}) as Record<string, unknown>,
    installedAt: row.createdAt,
  };
}

export class PluginManager {
  constructor(private db: Database) {}

  async install(
    tenantId: string,
    manifest: PluginManifest,
    code: string,
    config: Record<string, unknown>,
  ): Promise<InstalledPlugin> {
    const data = {
      pluginId: manifest.pluginId,
      name: manifest.name,
      version: manifest.version,
      enabled: true,
      config,
      code,
    };

    const [record] = await this.db
      .insert(schema.entityRecords)
      .values({ tenantId, entityType: '__plugin', data })
      .returning();

    if (!record) throw new Error('Failed to install plugin');
    return rowToPlugin(record);
  }

  async uninstall(tenantId: string, pluginId: string): Promise<void> {
    const record = await this.db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, '__plugin'),
        sql`${schema.entityRecords.data}->>'pluginId' = ${pluginId}`,
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!record) throw new Error('Plugin not found');

    await this.db
      .update(schema.entityRecords)
      .set({
        data: { ...(record.data as Record<string, unknown>), enabled: false },
        updatedAt: new Date(),
      })
      .where(eq(schema.entityRecords.id, record.id));
  }

  async list(tenantId: string): Promise<InstalledPlugin[]> {
    const records = await this.db.query.entityRecords.findMany({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, '__plugin'),
        sql`${schema.entityRecords.data}->>'enabled' = 'true'`,
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    return records.map(rowToPlugin);
  }

  async get(tenantId: string, pluginId: string): Promise<InstalledPlugin | undefined> {
    const record = await this.db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, '__plugin'),
        sql`${schema.entityRecords.data}->>'pluginId' = ${pluginId}`,
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!record) return undefined;
    return rowToPlugin(record);
  }

  async getCode(tenantId: string, pluginId: string): Promise<string> {
    const plugin = await this.get(tenantId, pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

    const record = await this.db.query.entityRecords.findFirst({
      where: and(
        eq(schema.entityRecords.tenantId, tenantId),
        eq(schema.entityRecords.entityType, '__plugin'),
        sql`${schema.entityRecords.data}->>'pluginId' = ${pluginId}`,
        isNull(schema.entityRecords.deletedAt),
      ),
    });

    if (!record) throw new Error(`Plugin record not found: ${pluginId}`);
    const d = record.data as Record<string, unknown>;
    return d['code'] as string;
  }
}
