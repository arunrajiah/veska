import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { healthRouter } from './routes/health.js';
import { channelsRouter } from './routes/channels.js';
import { configRouter } from './routes/config.js';
import { entitiesRouter } from './routes/entities.js';
import { tenantsRouter } from './routes/tenants.js';
import { magicLinksRouter } from './routes/magic-links.js';
import { crmRouter } from './routes/crm.js';
import { supportRouter } from './routes/support.js';
import { financeRouter } from './routes/finance.js';
import { tenantContext } from './middleware/tenant-context.js';
import {
  sharedDb,
  sharedLlm,
  sharedAuditService,
  sharedMagicLinkService,
  sharedQueueService,
  sharedRedis,
} from './shared.js';
import { SlackAppManager } from './slack/slack-app.js';
import { registerMessageWorker } from './slack/message-worker.js';

// ── App setup ─────────────────────────────────────────────────
const app = new Hono();
app.use('*', logger());
app.use('*', secureHeaders());

// Public routes
app.route('/health', healthRouter);
app.route('/api/v1/tenants', tenantsRouter);
app.route('/ml', magicLinksRouter);

// Email inbound webhook (Resend/Postmark sends POST here)
app.post('/webhooks/email', async (c) => {
  const payload = await c.req.json();
  // Enqueue for async processing so the webhook returns quickly
  await sharedQueueService.enqueue('inbound_message', {
    tenantId: payload.tenantId ?? (c.req.header('X-Veska-Tenant-Id') ?? ''),
    channelName: 'email',
    rawPayload: payload,
  });
  return c.json({ received: true });
});

// Tenant-scoped API routes
const api = new Hono();
api.use('*', tenantContext);
api.route('/config', configRouter);
api.route('/entities', entitiesRouter);
api.route('/channels', channelsRouter);
api.route('/crm', crmRouter);
api.route('/support', supportRouter);
api.route('/finance', financeRouter);
app.route('/api/v1', api);

// ── Slack setup ───────────────────────────────────────────────
const slackManager = new SlackAppManager({
  db: sharedDb,
  queueService: sharedQueueService,
  llm: sharedLlm,
  magicLinkService: sharedMagicLinkService,
  auditService: sharedAuditService,
});

// ── Queue workers ─────────────────────────────────────────────
registerMessageWorker(
  sharedQueueService,
  sharedDb,
  sharedLlm,
  sharedAuditService,
  sharedMagicLinkService,
  slackManager,
);

// ── Graceful shutdown ─────────────────────────────────────────
const shutdown = async () => {
  console.log('Shutting down…');
  await sharedQueueService.close();
  await sharedRedis.quit();
  process.exit(0);
};
process.on('SIGTERM', () => { void shutdown(); });
process.on('SIGINT', () => { void shutdown(); });

// ── Start server ──────────────────────────────────────────────
const port = parseInt(process.env['PORT'] ?? '3001', 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Veska API running on http://localhost:${info.port}`);
});

export default app;
