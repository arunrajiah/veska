export type ChannelType = 'email' | 'slack' | 'webhook';

export interface NotificationPayload {
  event: string;           // e.g. 'invoice.paid', 'po.approved'
  tenantId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  actorName?: string;
}

export interface ChannelConfig {
  type: ChannelType;
  enabled: boolean;
  // email channel
  toEmail?: string;
  fromEmail?: string;      // defaults to 'noreply@veska.com'
  resendApiKey?: string;
  // slack channel
  slackWebhookUrl?: string;
  // generic webhook
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface NotificationResult {
  channel: ChannelType;
  success: boolean;
  error?: string;
}
