// The SDK interface injected into every plugin worker.
// All data access is mediated through this object — plugins never touch the DB directly.

export interface EntityQuery {
  entityType: string;
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
}

export interface EntityMutation {
  entityType: string;
  data: Record<string, unknown>;
}

export interface ChannelMessage {
  channelName: string;
  recipientChannelId: string;
  text: string;
  blocks?: unknown[];
  magicLink?: { label: string; url: string };
}

export interface AgentRunParams {
  agentId: string;
  input: Record<string, unknown>;
}

export interface VeskaPluginContext {
  /** The tenant this plugin execution is scoped to. */
  readonly tenantId: string;
  /** The plugin's own ID. */
  readonly pluginId: string;

  entities: {
    find(query: EntityQuery): Promise<unknown[]>;
    findOne(entityType: string, id: string): Promise<unknown | null>;
    create(mutation: EntityMutation): Promise<{ id: string }>;
    update(entityType: string, id: string, data: Record<string, unknown>): Promise<void>;
    delete(entityType: string, id: string): Promise<void>;
  };

  workflows: {
    trigger(workflowId: string, context?: Record<string, unknown>): Promise<{ runId: string }>;
  };

  channels: {
    send(msg: ChannelMessage): Promise<void>;
  };

  ai: {
    run(params: AgentRunParams): Promise<unknown>;
  };

  /** Write to the structured audit log. */
  audit: {
    log(action: string, details?: Record<string, unknown>): Promise<void>;
  };
}
