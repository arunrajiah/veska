// Primitive type exports
export * from './primitives/entity.js';
export * from './primitives/workflow.js';
export * from './primitives/permission.js';
export * from './primitives/channel.js';
export * from './primitives/integration.js';

// Database
export { createDatabase, type Database, schema } from './db/index.js';

// AI
export { type LLMProvider, type CompletionParams, type CompletionResult, type Tool } from './ai/provider.js';
export { AnthropicProvider, type AnthropicProviderConfig } from './ai/anthropic-provider.js';
export { ConfigAgent, type ConfigDiff, type ConfigChange, type ApplyResult } from './ai/config-agent.js';
export { ActionAgent, type ActionAgentResult } from './ai/action-agent.js';

// Channels
export { SlackChannelAdapter } from './channels/slack/adapter.js';
export { resolveSlackIdentity } from './channels/slack/identity-resolver.js';
export { EmailChannelAdapter, type EmailChannelConfig } from './channels/email/adapter.js';
export { resolveEmailIdentity } from './channels/email/identity-resolver.js';
export { WhatsAppChannelAdapter, type WhatsAppChannelConfig } from './channels/whatsapp/adapter.js';
export { resolveWhatsAppIdentity } from './channels/whatsapp/identity-resolver.js';
export { TelegramChannelAdapter, type TelegramChannelConfig } from './channels/telegram/adapter.js';
export { resolveTelegramIdentity } from './channels/telegram/identity-resolver.js';

// Integrations
export { StripeIntegrationAdapter } from './integrations/index.js';

// Engine
export { WorkflowEngine } from './engine/index.js';

// Plugins
export { PluginRuntime, type PluginRunContext, type PluginRunResult } from './plugins/runtime.js';
export { PluginManager, type InstalledPlugin } from './plugins/manager.js';

// Services
export { TenantService, type CreateTenantParams, type BootstrapResult } from './services/tenant.service.js';
export { MagicLinkService, type MagicLinkParams, type MagicLinkVerifyResult } from './services/magic-link.service.js';
export { AuditService, type AuditEvent } from './services/audit.service.js';
export { WebhookDispatcherService, type WebhookEvent } from './services/webhook-dispatcher.service.js';

// Queue
export { QueueService } from './queue/queue.service.js';
export type { JobName, JobPayload, InboundMessageJob, WorkflowStepJob, SendMessageJob, EnrichEntityJob, AnomalyRecord, AnomalySummaryJob, InvoiceSendReminderJob } from './queue/jobs.js';
