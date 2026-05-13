import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';

export interface AuditEvent {
  tenantId: string;
  actorIdentityId?: string;
  actorType: 'admin' | 'employee' | 'customer' | 'vendor' | 'agent' | 'plugin' | 'system';
  channel?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  capability?: string;
  before?: unknown;
  after?: unknown;
  aiReasoningTrace?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  constructor(private db: Database) {}

  async log(event: AuditEvent): Promise<void> {
    await this.db.insert(schema.auditLog).values({
      tenantId: event.tenantId,
      actorIdentityId: event.actorIdentityId,
      actorType: event.actorType,
      channel: event.channel,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      capability: event.capability,
      before: event.before as Record<string, unknown> | undefined,
      after: event.after as Record<string, unknown> | undefined,
      aiReasoningTrace: event.aiReasoningTrace,
      metadata: event.metadata ?? {},
    });
  }
}
