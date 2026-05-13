import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { healthRouter } from './routes/health.js';
import { channelsRouter } from './routes/channels.js';
import { configRouter } from './routes/config.js';
import { entitiesRouter } from './routes/entities.js';
import { tenantContext } from './middleware/tenant-context.js';

const app = new Hono();

app.use('*', logger());
app.use('*', secureHeaders());

// Public routes
app.route('/health', healthRouter);

// Tenant-scoped routes
const api = new Hono();
api.use('*', tenantContext);
api.route('/config', configRouter);
api.route('/entities', entitiesRouter);
api.route('/channels', channelsRouter);

app.route('/api/v1', api);

const port = parseInt(process.env['PORT'] ?? '3001', 10);

console.log(`Veska API starting on port ${port}`);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Veska API running on http://localhost:${info.port}`);
});

export default app;
