import 'dotenv/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
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
import { hrRouter } from './routes/hr.js';
import { inventoryRouter } from './routes/inventory.js';
import { workflowsRouter } from './routes/workflows.js';
import { pluginsRouter } from './routes/plugins.js';
import { integrationsRouter } from './routes/integrations.js';
import { auditRouter } from './routes/audit.js';
import { webhooksRouter } from './routes/webhooks.js';
import { apiKeysRouter } from './routes/api-keys.js';
import { purchasingRouter } from './routes/purchasing.js';
import { grnRouter } from './routes/grn.js';
import { salesRouter } from './routes/sales.js';
import { notificationsRouter } from './routes/notifications.js';
import { notificationChannelsRouter } from './routes/notification-channels.js';
import { projectsRouter } from './routes/projects.js';
import { reportsRouter } from './routes/reports.js';
import { expensesRouter } from './routes/expenses.js';
import { approvalChainsRouter } from './routes/approval-chains.js';
import { approvalRequestsRouter } from './routes/approval-requests.js';
import { budgetsRouter } from './routes/budgets.js';
import { timeRouter } from './routes/time.js';
import { timeTrackingRouter } from './routes/time-tracking.js';
import { crmTablesRouter } from './routes/crm-tables.js';
import { payrollRouter } from './routes/payroll.js';
import { aiRouter } from './routes/ai.js';
import { analyticsRouter } from './routes/analytics.js';
import { usersRouter } from './routes/users.js';
import { rolesRouter } from './routes/roles.js';
import { attachmentsRouter } from './routes/attachments.js';
import { importExportRouter } from './routes/import-export.js';
import { dashboardRouter } from './routes/dashboard.js';
import { currenciesRouter } from './routes/currencies.js';
import { customFieldsRouter } from './routes/custom-fields.js';
import { recurringInvoicesRouter } from './routes/recurring-invoices.js';
import { invoiceEmailRouter } from './routes/invoice-email.js';
import { searchRouter } from './routes/search.js';
import { documentTemplatesRouter } from './routes/document-templates.js';
import { assetsRouter } from './routes/assets.js';
import { dataPrivacyRouter } from './routes/data-privacy.js';
import { payrollRunsRouter } from './routes/payroll-runs.js';
import { contractsRouter } from './routes/contracts.js';
import { vendorsRouter } from './routes/vendors.js';
import { serviceDeskRouter } from './routes/service-desk.js';
import { knowledgeBaseRouter } from './routes/knowledge-base.js';
import { portalRouter } from './routes/portal.js';
import { portalMgmtRouter } from './routes/portal-mgmt.js';
import { lmsRouter } from './routes/lms.js';
import { eventsRouter } from './routes/events.js';
import { sseRouter } from './routes/sse.js';
import { roomsRouter } from './routes/rooms.js';
import { facilitiesRouter } from './routes/facilities.js';
import { productCatalogRouter } from './routes/product-catalog.js';
import { tenantSettingsRouter } from './routes/tenant-settings.js';
import { taxRatesRouter } from './routes/tax-rates.js';
import { emailLogRouter } from './routes/email-log.js';
import { inboundChannelsRouter } from './routes/inbound-channels.js';
import { stripeWebhookRouter } from './routes/stripe-webhook.js';
import { setupRouter } from './routes/setup.js';
import { jobQueuesRouter } from './routes/job-queues.js';
import { registerEmailWorker } from './workers/email-worker.js';
import { startRecurringInvoiceJob } from './jobs/recurring-invoices.job.js';
import { serveStatic } from '@hono/node-server/serve-static';
import { standardLimit, aiLimit, authLimit } from './lib/rate-limiters.js';
import { tenantContext } from './middleware/tenant-context.js';
import { requireSession } from './middleware/session.js';
import { requirePermission } from './middleware/rbac.js';
import { authRouter } from './routes/auth.js';
import { rateLimit, inMemoryRateLimit } from './middleware/rate-limit.js';
import { docsRouter } from './routes/docs.js';
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
import { registerEnrichmentWorker } from './workers/enrichment-worker.js';
import { registerAnomalyWorker } from './workers/anomaly-worker.js';
import { WorkflowEngine } from '@veska/core';

// ── App setup ─────────────────────────────────────────────────
const app = new Hono();
app.use('*', logger());
app.use('*', secureHeaders());

// CORS — allow same-origin and localhost dev origins
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') ?? '';
  const allowed =
    origin === '' ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('https://localhost:') ||
    (process.env['CORS_ORIGIN'] ? origin === process.env['CORS_ORIGIN'] : false);
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowed ? origin : '',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Veska-Tenant-Id,X-Veska-Identity-Id,x-tenant-id',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  await next();
  if (allowed && origin) {
    c.res.headers.set('Access-Control-Allow-Origin', origin);
    c.res.headers.set('Access-Control-Allow-Credentials', 'true');
  }
});

// Local file storage — serve uploaded files when not using cloud storage
if (!process.env['AWS_S3_BUCKET']) {
  const uploadRoot = process.env['UPLOAD_DIR'] ?? './uploads';
  app.use('/uploads/*', serveStatic({ root: uploadRoot }));
}

// Auth routes — no tenant middleware; apply strict rate limiting
app.use('/auth/*', authLimit);
app.route('/auth', authRouter);

// Public routes
app.route('/health', healthRouter);
app.route('/api/v1/tenants', tenantsRouter);
// OpenAPI docs — public, no auth required
app.route('/', docsRouter);
app.route('/ml', magicLinksRouter);
app.route('/portal', portalRouter);

// Inbound channel webhooks — authenticate via signing secrets, NOT Bearer tokens.
// Must be mounted BEFORE the requireSession() middleware on the `api` sub-app.
app.route('/api/v1/channels/inbound', inboundChannelsRouter);

// Stripe webhook — authenticated by Stripe signature, NOT Bearer tokens.
// Must be mounted BEFORE the requireSession() middleware.
app.route('/webhooks/stripe', stripeWebhookRouter);

// Magic link creation (POST) is also available as a session-protected API route
// via the api sub-app below (/api/v1 → magic-links).
// The /ml prefix is kept for token verification (public, no auth required).

// Inbound channel webhooks — enqueue for async processing
app.post('/webhooks/email', async (c) => {
  const webhookSecret = process.env['EMAIL_WEBHOOK_SECRET'];
  const providedSecret = c.req.header('X-Webhook-Secret') ?? c.req.query('secret');
  if (webhookSecret && providedSecret !== webhookSecret) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const payload = await c.req.json<Record<string, unknown>>();
  await sharedQueueService.enqueue('inbound_message', {
    tenantId: String(payload['tenantId'] ?? c.req.header('X-Veska-Tenant-Id') ?? ''),
    channelName: 'email',
    rawMessage: payload,
  });
  return c.json({ received: true });
});

// Twilio sends form-encoded data for WhatsApp; respond with 200 immediately
app.post('/webhooks/whatsapp', async (c) => {
  const webhookSecret = process.env['WHATSAPP_WEBHOOK_SECRET'];
  const signature = c.req.header('X-Hub-Signature-256') ?? '';
  if (webhookSecret && signature) {
    const rawBody = await c.req.text();
    const expected = 'sha256=' + createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return c.json({ error: 'Invalid signature' }, 403);
    }
  }

  const body = await c.req.parseBody();
  const tenantId = c.req.header('X-Veska-Tenant-Id') ?? '';
  await sharedQueueService.enqueue('inbound_message', {
    tenantId,
    channelName: 'whatsapp',
    rawMessage: body,
  });
  // Twilio expects TwiML or empty 200
  return c.text('', 200);
});

// Telegram Bot API sends POST to this endpoint
app.post('/webhooks/telegram', async (c) => {
  const secretToken = c.req.header('X-Telegram-Bot-Api-Secret-Token');
  const expectedSecret = process.env['TELEGRAM_WEBHOOK_SECRET'];
  if (expectedSecret && secretToken !== expectedSecret) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const update = await c.req.json<Record<string, unknown>>();
  const tenantId = c.req.header('X-Veska-Tenant-Id') ?? '';
  await sharedQueueService.enqueue('inbound_message', {
    tenantId,
    channelName: 'telegram',
    rawMessage: update,
  });
  return c.json({ ok: true });
});

// Tenant-scoped API routes
const api = new Hono();
// All /api/v1/* routes require a valid session (Bearer token)
api.use('*', requireSession());
api.use('*', tenantContext);
api.use('*', rateLimit(sharedRedis, { windowMs: 60_000, max: 120 }));
// Sliding-window rate limiters (package: @veska-cloud/rate-limit)
api.use('*', standardLimit);
api.use('/ai/*', aiLimit);
// Per-route in-memory limits (belt-and-suspenders on top of Redis limits)
api.use('/conversations/*', inMemoryRateLimit({
  windowMs: 60_000,
  max: 20,
  keyFn: (c) => c.get('tenantCtx')?.identityId ?? c.req.header('x-forwarded-for') ?? 'unknown',
}));
api.use('/import-export/*', inMemoryRateLimit({ windowMs: 60_000, max: 10 }));
// Permission guards for sensitive modules
api.use('/payroll/*', requirePermission('payroll:read'));
api.use('/payroll-runs/*', requirePermission('payroll:read'));
api.use('/hr/*', requirePermission('hr:read'));
api.use('/finance/*', requirePermission('invoices:read'));
api.use('/budgets/*', requirePermission('invoices:read'));
api.use('/contracts/*', requirePermission('invoices:read'));
api.use('/reports/*', requirePermission('reports:read'));
api.use('/analytics/*', requirePermission('reports:read'));
api.route('/config', configRouter);
api.route('/entities', entitiesRouter);
api.route('/channels', channelsRouter);
api.route('/crm', crmRouter);
api.route('/support', supportRouter);
api.route('/finance', financeRouter);
api.route('/hr', hrRouter);
api.route('/inventory', inventoryRouter);
api.route('/purchasing', purchasingRouter);
api.route('/grn', grnRouter);
api.route('/projects', projectsRouter);
api.route('/expenses', expensesRouter);
api.route('/budgets', budgetsRouter);
api.route('/time', timeRouter);
api.route('/time-tracking', timeTrackingRouter);
api.route('/crm-tables', crmTablesRouter);
api.route('/payroll', payrollRouter);
api.route('/payroll-runs', payrollRunsRouter);
api.route('/contracts', contractsRouter);
api.route('/vendors', vendorsRouter);
api.route('/service-desk', serviceDeskRouter);
api.route('/kb', knowledgeBaseRouter);
api.route('/portal-mgmt', portalMgmtRouter);
api.route('/lms', lmsRouter);
api.route('/events', eventsRouter);
api.route('/rooms', roomsRouter);
api.route('/facilities', facilitiesRouter);
api.route('/tenant-settings', tenantSettingsRouter);
api.route('/tax-rates', taxRatesRouter);
api.route('/email-log', emailLogRouter);
api.route('/catalog', productCatalogRouter);
api.route('/ai', aiRouter);
api.route('/analytics', analyticsRouter);
api.route('/sales', salesRouter);
api.route('/notifications', notificationsRouter);
api.route('/reports', reportsRouter);
api.use('/search/*', standardLimit);
api.route('/search', searchRouter);
api.route('/document-templates', documentTemplatesRouter);
api.route('/assets', assetsRouter);
api.route('/workflows', workflowsRouter);
api.route('/plugins', pluginsRouter);
api.route('/integrations', integrationsRouter);
api.route('/privacy', dataPrivacyRouter);
api.route('/audit', auditRouter);
api.route('/webhooks', webhooksRouter);
api.route('/api-keys', apiKeysRouter);
api.route('/magic-links', magicLinksRouter);
api.route('/setup', setupRouter);
// Job queue monitoring — admin only
api.use('/job-queues/*', requirePermission('admin:*'));
api.route('/job-queues', jobQueuesRouter);
api.route('/users', usersRouter);
api.route('/roles', rolesRouter);
api.route('/notification-channels', notificationChannelsRouter);
api.route('/attachments', attachmentsRouter);
api.route('/import-export', importExportRouter);
api.route('/approval-chains', approvalChainsRouter);
api.route('/approval-requests', approvalRequestsRouter);
api.route('/dashboard', dashboardRouter);
api.route('/currencies', currenciesRouter);
api.route('/custom-fields', customFieldsRouter);
api.route('/recurring-invoices', recurringInvoicesRouter);
api.route('/invoices/email', invoiceEmailRouter);
api.route('/sse', sseRouter);
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

// Workflow step executor worker
const workflowEngine = new WorkflowEngine(sharedDb, sharedQueueService, sharedAuditService, sharedLlm);
sharedQueueService.registerWorker('workflow.execute_step', async (job) => {
  const { tenantId, workflowRunId, stepId } = job.data as { tenantId: string; workflowRunId: string; stepId: string };
  await workflowEngine.executeStep({ tenantId, workflowRunId, stepId });
});

// AI entity enrichment worker
registerEnrichmentWorker(sharedQueueService, sharedDb, sharedLlm, sharedAuditService);

// AI anomaly detection worker (repeatable, every 6 hours)
registerAnomalyWorker(sharedQueueService, sharedDb, sharedLlm);

// Email delivery worker (portal invites, invoice reminders)
registerEmailWorker(sharedQueueService);

// Recurring invoice scheduler (runs every hour)
startRecurringInvoiceJob(sharedDb);

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
