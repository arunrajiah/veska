import type { LLMProvider } from './provider.js';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ConfigDiff {
  id: string;
  tenantId: string;
  naturalLanguageRequest: string;
  summary: string;
  changes: ConfigChange[];
  createdAt: Date;
  status: 'pending_approval' | 'approved' | 'rejected' | 'applied' | 'rolled_back';
}

export interface ConfigChange {
  type: 'entity_definition' | 'workflow_definition' | 'role' | 'channel_config' | 'tenant_settings';
  operation: 'create' | 'update' | 'delete';
  resourceId?: string;
  resourceName: string;
  before?: unknown;
  after?: unknown;
  description: string;
}

export interface ApplyResult {
  success: boolean;
  configVersionId: string;
  appliedChanges: number;
  error?: string;
}

// ──────────────────────────────────────────────────────────────
// Config Agent
// ──────────────────────────────────────────────────────────────

const CONFIG_AGENT_SYSTEM_PROMPT = `You are the Veska Configuration Agent. Your role is to help administrators configure their Veska instance by making precise, safe changes to the system configuration.

You operate on six core primitives:
1. **Entities** — typed record definitions (like Customer, Invoice, Lead)
2. **Fields** — typed attributes on entities
3. **Workflows** — stateful processes with triggers, conditions, and actions
4. **Permissions** — capability-based access control (roles + capabilities)
5. **Channels** — communication channel configurations (Slack, WhatsApp, Email, etc.)
6. **Integrations** — connectors to external systems

When the admin makes a request, you must:
1. Read the current configuration using the provided tools
2. Determine the minimal set of changes needed
3. Propose a structured diff describing exactly what will change
4. Never apply changes without explicit admin approval
5. Never touch the ledger or financial data
6. Prefer additive changes over destructive ones

Your responses should be calm, precise, and jargon-free. Think like a senior operator, not a salesperson.`;

export class ConfigAgent {
  private pendingDiffs = new Map<string, ConfigDiff>();

  constructor(
    private db: Database,
    private llm: LLMProvider,
    private opusModel = 'claude-opus-4-6',
  ) {}

  /**
   * Process a natural language configuration request and return a proposed diff.
   * Does NOT apply any changes — the admin must call applyChange() to proceed.
   */
  async proposeChange(tenantId: string, request: string): Promise<ConfigDiff> {
    const currentConfig = await this.readCurrentConfig(tenantId);

    const result = await this.llm.complete({
      model: this.opusModel,
      system: CONFIG_AGENT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Current tenant configuration:\n${JSON.stringify(currentConfig, null, 2)}\n\nAdmin request: ${request}\n\nPropose the minimal set of configuration changes needed. Return a JSON object with this structure:\n{\n  "summary": "one-line description of the change",\n  "changes": [\n    {\n      "type": "entity_definition|workflow_definition|role|channel_config|tenant_settings",\n      "operation": "create|update|delete",\n      "resourceName": "name of the resource",\n      "description": "what specifically changes and why",\n      "after": { /* the new configuration object */ }\n    }\n  ]\n}`,
        },
      ],
      maxTokens: 4096,
    });

    let parsed: { summary: string; changes: ConfigChange[] };
    try {
      // Extract JSON from the response (may be wrapped in markdown code blocks)
      const jsonMatch = result.content.match(/```(?:json)?\s*([\s\S]*?)```/) ??
        result.content.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch?.[1] ?? result.content;
      parsed = JSON.parse(jsonStr) as typeof parsed;
    } catch {
      throw new Error(`Config agent returned unparseable response: ${result.content}`);
    }

    const diff: ConfigDiff = {
      id: randomUUID(),
      tenantId,
      naturalLanguageRequest: request,
      summary: parsed.summary,
      changes: parsed.changes,
      createdAt: new Date(),
      status: 'pending_approval',
    };

    this.pendingDiffs.set(diff.id, diff);
    return diff;
  }

  /**
   * Apply an approved diff atomically.
   * Only call this after the admin has explicitly confirmed the diff.
   */
  async applyChange(diffId: string, approvedByIdentityId: string): Promise<ApplyResult> {
    const diff = this.pendingDiffs.get(diffId);
    if (!diff) {
      throw new Error(`Diff ${diffId} not found or already applied`);
    }
    if (diff.status !== 'pending_approval') {
      throw new Error(`Diff ${diffId} is in status "${diff.status}", expected "pending_approval"`);
    }

    const tenant = await this.db.query.tenants.findFirst({
      where: eq(schema.tenants.id, diff.tenantId),
    });
    if (!tenant) throw new Error(`Tenant ${diff.tenantId} not found`);

    // Apply all changes in a transaction
    await this.db.transaction(async (tx) => {
      for (const change of diff.changes) {
        await this.applyConfigChange(tx as unknown as Database, diff.tenantId, change);
      }

      // Record the new config version
      const [version] = await tx
        .insert(schema.configVersions)
        .values({
          tenantId: diff.tenantId,
          version: new Date().toISOString(),
          config: await this.readCurrentConfig(diff.tenantId),
          appliedBy: approvedByIdentityId,
          naturalLanguageRequest: diff.naturalLanguageRequest,
          diff: diff as unknown as Record<string, unknown>,
        })
        .returning({ id: schema.configVersions.id });

      if (!version) throw new Error('Failed to create config version');

      // Update the tenant's current config pointer
      await tx
        .update(schema.tenants)
        .set({ currentConfigId: version.id, updatedAt: new Date() })
        .where(eq(schema.tenants.id, diff.tenantId));
    });

    diff.status = 'applied';

    return {
      success: true,
      configVersionId: diffId,
      appliedChanges: diff.changes.length,
    };
  }

  /**
   * Roll back to a previous config version.
   */
  async rollback(tenantId: string, configVersionId: string, approvedByIdentityId: string): Promise<void> {
    const version = await this.db.query.configVersions.findFirst({
      where: eq(schema.configVersions.id, configVersionId),
    });
    if (!version) throw new Error(`Config version ${configVersionId} not found`);
    if (version.tenantId !== tenantId) throw new Error('Config version belongs to a different tenant');

    // Record the rollback as a new config version (append-only history)
    await this.db.transaction(async (tx) => {
      const [newVersion] = await tx
        .insert(schema.configVersions)
        .values({
          tenantId,
          version: new Date().toISOString(),
          config: version.config,
          appliedBy: approvedByIdentityId,
          naturalLanguageRequest: `Rollback to version ${configVersionId}`,
          diff: { rollbackTo: configVersionId },
        })
        .returning({ id: schema.configVersions.id });

      if (!newVersion) throw new Error('Failed to create rollback config version');

      await tx
        .update(schema.tenants)
        .set({ currentConfigId: newVersion.id, updatedAt: new Date() })
        .where(eq(schema.tenants.id, tenantId));
    });
  }

  private async readCurrentConfig(tenantId: string): Promise<unknown> {
    const [entities, workflows, rolesData, channels] = await Promise.all([
      this.db.query.entityDefinitions.findMany({
        where: eq(schema.entityDefinitions.tenantId, tenantId),
      }),
      this.db.query.workflowDefinitions.findMany({
        where: eq(schema.workflowDefinitions.tenantId, tenantId),
      }),
      this.db.query.roles.findMany({
        where: eq(schema.roles.tenantId, tenantId),
      }),
      this.db.query.channelConfigs.findMany({
        where: eq(schema.channelConfigs.tenantId, tenantId),
      }),
    ]);

    return { entities, workflows, roles: rolesData, channels };
  }

  private async applyConfigChange(
    db: Database,
    tenantId: string,
    change: ConfigChange,
  ): Promise<void> {
    switch (change.type) {
      case 'entity_definition':
        await this.applyEntityChange(db, tenantId, change);
        break;
      case 'workflow_definition':
        await this.applyWorkflowChange(db, tenantId, change);
        break;
      case 'role':
        await this.applyRoleChange(db, tenantId, change);
        break;
      default:
        throw new Error(`Unsupported config change type: ${change.type}`);
    }
  }

  private async applyEntityChange(db: Database, tenantId: string, change: ConfigChange): Promise<void> {
    const data = change.after as Record<string, unknown>;
    switch (change.operation) {
      case 'create':
        await db.insert(schema.entityDefinitions).values({
          tenantId,
          name: data['name'] as string,
          pluralName: data['pluralName'] as string,
          label: data['label'] as string,
          pluralLabel: data['pluralLabel'] as string,
          description: data['description'] as string | undefined,
          fields: (data['fields'] as unknown[]) ?? [],
          aiDescription: data['aiDescription'] as string | undefined,
        });
        break;
      case 'update':
        if (!change.resourceId) throw new Error('resourceId required for update');
        await db
          .update(schema.entityDefinitions)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(schema.entityDefinitions.id, change.resourceId));
        break;
      case 'delete':
        if (!change.resourceId) throw new Error('resourceId required for delete');
        await db
          .delete(schema.entityDefinitions)
          .where(eq(schema.entityDefinitions.id, change.resourceId));
        break;
    }
  }

  private async applyWorkflowChange(db: Database, tenantId: string, change: ConfigChange): Promise<void> {
    const data = change.after as Record<string, unknown>;
    switch (change.operation) {
      case 'create':
        await db.insert(schema.workflowDefinitions).values({
          tenantId,
          name: data['name'] as string,
          description: data['description'] as string | undefined,
          trigger: data['trigger'] as Record<string, unknown>,
          steps: (data['steps'] as unknown[]) ?? [],
          entryStep: data['entryStep'] as string,
        });
        break;
      case 'update':
        if (!change.resourceId) throw new Error('resourceId required for update');
        await db
          .update(schema.workflowDefinitions)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(schema.workflowDefinitions.id, change.resourceId));
        break;
      case 'delete':
        if (!change.resourceId) throw new Error('resourceId required for delete');
        await db
          .delete(schema.workflowDefinitions)
          .where(eq(schema.workflowDefinitions.id, change.resourceId));
        break;
    }
  }

  private async applyRoleChange(db: Database, tenantId: string, change: ConfigChange): Promise<void> {
    const data = change.after as Record<string, unknown>;
    switch (change.operation) {
      case 'create':
        await db.insert(schema.roles).values({
          tenantId,
          name: data['name'] as string,
          description: data['description'] as string | undefined,
          capabilities: (data['capabilities'] as string[]) ?? [],
        });
        break;
      case 'update':
        if (!change.resourceId) throw new Error('resourceId required for update');
        await db
          .update(schema.roles)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(schema.roles.id, change.resourceId));
        break;
      case 'delete':
        if (!change.resourceId) throw new Error('resourceId required for delete');
        await db.delete(schema.roles).where(eq(schema.roles.id, change.resourceId));
        break;
    }
  }
}
