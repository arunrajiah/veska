// Job type registry — all BullMQ job names and their payload shapes

export type JobName =
  | 'process.inbound_message'
  | 'workflow.execute_step'
  | 'workflow.test_run'
  | 'channel.send_message'
  | 'magic_link.prune_expired'
  | 'ai.enrich_entity'
  | 'ai.anomaly_summary'
  | 'invoice.send_reminder'
  | 'integration.sync'
  | 'portal.send_invite';

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

export interface AnomalyRecord {
  type: 'budget_overrun' | 'sla_breach' | 'overdue_invoice' | 'expiring_contract';
  description: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface AnomalySummaryJob {
  tenantId: string;
  anomalies: AnomalyRecord[];
}

export interface InvoiceSendReminderJob {
  tenantId: string;
  invoiceId: string;
  recipientEmail: string;
}

export interface PortalSendInviteJob {
  tenantId: string;
  tokenId: string;
  email: string;
  portalUrl: string;
}

export interface WorkflowTestRunJob {
  tenantId: string;
  workflowId: string;
  triggeredBy: 'manual_test';
}

export type JobPayload<T extends JobName> =
  T extends 'process.inbound_message' ? InboundMessageJob :
  T extends 'workflow.execute_step' ? WorkflowStepJob :
  T extends 'workflow.test_run' ? WorkflowTestRunJob :
  T extends 'channel.send_message' ? SendMessageJob :
  T extends 'ai.enrich_entity' ? EnrichEntityJob :
  T extends 'ai.anomaly_summary' ? AnomalySummaryJob :
  T extends 'invoice.send_reminder' ? InvoiceSendReminderJob :
  T extends 'integration.sync' ? IntegrationSyncJob :
  T extends 'portal.send_invite' ? PortalSendInviteJob :
  Record<string, unknown>;
