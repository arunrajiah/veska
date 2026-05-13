// Job type registry — all BullMQ job names and their payload shapes

export type JobName =
  | 'process.inbound_message'
  | 'workflow.execute_step'
  | 'channel.send_message'
  | 'magic_link.prune_expired'
  | 'ai.enrich_entity'
  | 'integration.sync';

export interface InboundMessageJob {
  tenantId: string;
  channelName: string;
  rawMessage: unknown;
}

export interface WorkflowStepJob {
  tenantId: string;
  workflowRunId: string;
  stepId: string;
}

export interface SendMessageJob {
  tenantId: string;
  channelName: string;
  recipientChannelId: string;
  message: {
    text: string;
    threadId?: string;
    magicLink?: { label: string; url: string };
  };
}

export interface EnrichEntityJob {
  tenantId: string;
  entityType: string;
  entityId: string;
  fields: string[];
}

export interface IntegrationSyncJob {
  tenantId: string;
  integrationInstanceId: string;
  syncType: 'full' | 'incremental';
}

export type JobPayload<T extends JobName> =
  T extends 'process.inbound_message' ? InboundMessageJob :
  T extends 'workflow.execute_step' ? WorkflowStepJob :
  T extends 'channel.send_message' ? SendMessageJob :
  T extends 'ai.enrich_entity' ? EnrichEntityJob :
  T extends 'integration.sync' ? IntegrationSyncJob :
  Record<string, unknown>;
