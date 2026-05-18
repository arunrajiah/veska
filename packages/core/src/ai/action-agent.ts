import type { LLMProvider, Tool } from './provider.js';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';
import type { IncomingMessage, OutgoingMessage } from '../primitives/channel.js';
import type { Identity } from '../primitives/permission.js';
import { checkPermission } from '../primitives/permission.js';
import { eq } from 'drizzle-orm';
import type { AuditService } from '../services/audit.service.js';
import type { MagicLinkService } from '../services/magic-link.service.js';

// ──────────────────────────────────────────────────────────────
// Action agent — processes one inbound message end-to-end
// ──────────────────────────────────────────────────────────────

// AgentContext / AgentResponse — shared types used by the cloud extension
export interface AgentContext {
  db: Database;
  llm: LLMProvider;
  auditService: AuditService;
  magicLinkService: MagicLinkService;
  defaultModel?: string;
}

export interface AgentResponse {
  response: OutgoingMessage;
  actionsPerformed: string[];
  requiresApproval: boolean;
  reasoningTrace: string;
}

const ACTION_AGENT_SYSTEM = `You are the Veska Action Agent. You help users accomplish tasks by reading and writing business data.

You can:
- Look up and create/update entity records (customers, tickets, invoices, deals, etc.)
- Trigger workflows
- Generate magic links for tasks that need a web UI
- Answer questions about the business data

You cannot:
- Move money or approve financial transactions without explicit human confirmation
- Change system configuration (that's the Config Agent's job)
- Access data outside this tenant

Respond in the same language the user used. Be concise — this is a chat interface, not a document.
When an action needs confirmation, ask clearly. Never assume.`;

/** @deprecated Use AgentResponse instead */
export type ActionAgentResult = AgentResponse;

export class ActionAgent {
  protected db: Database;
  protected llm: LLMProvider;
  protected auditService: AuditService;
  protected magicLinkService: MagicLinkService;
  protected defaultModel: string;

  /** Extra tools registered by subclasses (e.g. cloud-only tools). */
  private extraTools: Tool[] = [];

  constructor(
    db: Database,
    llm: LLMProvider,
    auditService: AuditService,
    magicLinkService: MagicLinkService,
    defaultModel = 'claude-sonnet-4-6',
  ) {
    this.db = db;
    this.llm = llm;
    this.auditService = auditService;
    this.magicLinkService = magicLinkService;
    this.defaultModel = defaultModel;
  }

  /**
   * Register additional tools from a subclass or plugin.
   * These are merged with the permission-filtered tools at call time.
   */
  registerTools(tools: Tool[]): void {
    this.extraTools = [...this.extraTools, ...tools];
  }

  async process(
    message: IncomingMessage,
    identity: Identity,
  ): Promise<AgentResponse> {
    // Load tenant context: entity definitions + identity's roles
    const [entityDefs, roles] = await Promise.all([
      this.db.query.entityDefinitions.findMany({
        where: eq(schema.entityDefinitions.tenantId, message.tenantId),
      }),
      this.db.query.roles.findMany({
        where: eq(schema.roles.tenantId, message.tenantId),
      }),
    ]);

    // Build the tool surface for this identity (only permitted tools)
    const tools = this.buildTools(identity, roles, entityDefs);

    const result = await this.llm.complete({
      model: this.defaultModel,
      system: ACTION_AGENT_SYSTEM,
      messages: [{ role: 'user', content: message.text }],
      tools,
      maxTokens: 2048,
    });

    const actionsPerformed: string[] = [];
    let requiresApproval = false;
    let responseText = result.content;

    // Execute tool calls
    for (const toolCall of result.toolCalls) {
      const toolResult = await this.executeTool(
        toolCall.name,
        toolCall.input,
        message,
        identity,
      );
      actionsPerformed.push(`${toolCall.name}: ${toolResult.summary}`);
      if (toolResult.requiresApproval) requiresApproval = true;
      if (toolResult.responseText) responseText = toolResult.responseText;
    }

    // Log the action
    await this.auditService.log({
      tenantId: message.tenantId,
      actorIdentityId: identity.id,
      actorType: identity.type as 'admin' | 'employee' | 'customer' | 'vendor' | 'agent' | 'plugin' | 'system',
      channel: message.channelName,
      action: 'message.processed',
      aiReasoningTrace: result.content,
      metadata: {
        messageId: message.id,
        actionsPerformed,
        toolCallCount: result.toolCalls.length,
      },
    });

    return {
      response: {
        text: responseText || "I've taken care of that.",
        threadId: message.threadId,
      },
      actionsPerformed,
      requiresApproval,
      reasoningTrace: result.content,
    };
  }

  private buildTools(
    identity: Identity,
    roles: typeof schema.roles.$inferSelect[],
    entityDefs: typeof schema.entityDefinitions.$inferSelect[],
  ) {
    const tools = [];

    // Entity read tool — available to anyone with *.read
    tools.push({
      name: 'find_records',
      description: 'Search for entity records. Use this to look up customers, tickets, invoices, deals, etc.',
      inputSchema: {
        type: 'object',
        properties: {
          entityType: { type: 'string', enum: entityDefs.map((e) => e.name) },
          filters: { type: 'object', description: 'Field filters as key-value pairs' },
          limit: { type: 'number', default: 10 },
        },
        required: ['entityType'],
      },
    });

    // Entity create tool — only if permitted
    const canCreate = entityDefs.some((e) => {
      const result = checkPermission(
        identity,
        roles as unknown as import('../primitives/permission.js').Role[],
        `${e.name.toLowerCase()}.create` as import('../primitives/permission.js').Capability,
      );
      return result.allowed;
    });

    if (canCreate) {
      tools.push({
        name: 'create_record',
        description: 'Create a new entity record.',
        inputSchema: {
          type: 'object',
          properties: {
            entityType: { type: 'string', enum: entityDefs.map((e) => e.name) },
            data: { type: 'object', description: 'Field values for the new record' },
          },
          required: ['entityType', 'data'],
        },
      });

      tools.push({
        name: 'update_record',
        description: 'Update an existing entity record.',
        inputSchema: {
          type: 'object',
          properties: {
            entityType: { type: 'string' },
            id: { type: 'string' },
            data: { type: 'object', description: 'Fields to update' },
          },
          required: ['entityType', 'id', 'data'],
        },
      });
    }

    // Magic link tool — for UI-heavy tasks
    tools.push({
      name: 'generate_magic_link',
      description: 'Generate a magic link for a task that needs a web UI (e.g. reviewing a list, reconciling a statement).',
      inputSchema: {
        type: 'object',
        properties: {
          resourceType: { type: 'string' },
          resourceId: { type: 'string' },
          action: { type: 'string' },
          label: { type: 'string', description: 'Button label for the link' },
        },
        required: ['resourceType', 'action', 'label'],
      },
    });

    // Merge in any tools registered by subclasses or plugins
    return [...tools, ...this.extraTools];
  }

  protected async executeTool(
    toolName: string,
    input: Record<string, unknown>,
    message: IncomingMessage,
    identity: Identity,
  ): Promise<{ summary: string; requiresApproval: boolean; responseText?: string }> {
    switch (toolName) {
      case 'find_records': {
        const entityType = input['entityType'] as string;
        const records = await this.db.query.entityRecords.findMany({
          where: eq(schema.entityRecords.tenantId, message.tenantId),
          limit: (input['limit'] as number | undefined) ?? 10,
        });
        const filtered = records.filter((r) => r.entityType === entityType);
        return { summary: `found ${filtered.length} ${entityType} records`, requiresApproval: false };
      }

      case 'create_record': {
        await this.db.insert(schema.entityRecords).values({
          tenantId: message.tenantId,
          entityType: input['entityType'] as string,
          data: input['data'] as Record<string, unknown>,
          createdBy: identity.id,
        });
        return { summary: `created ${input['entityType'] as string}`, requiresApproval: false };
      }

      case 'update_record': {
        await this.db
          .update(schema.entityRecords)
          .set({ data: input['data'] as Record<string, unknown>, updatedAt: new Date() })
          .where(eq(schema.entityRecords.id, input['id'] as string));
        return { summary: `updated ${input['entityType'] as string} ${input['id'] as string}`, requiresApproval: false };
      }

      case 'generate_magic_link': {
        const url = await this.magicLinkService.create({
          tenantId: message.tenantId,
          identityId: identity.id,
          resourceType: input['resourceType'] as string,
          resourceId: input['resourceId'] as string | undefined,
          action: input['action'] as string,
          expiryMinutes: 60,
        });
        return {
          summary: `generated magic link for ${input['action'] as string}`,
          requiresApproval: false,
          responseText: `Here's your link: [${input['label'] as string}](${url})`,
        };
      }

      default:
        return { summary: `unknown tool: ${toolName}`, requiresApproval: false };
    }
  }
}
