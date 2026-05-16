import { swaggerUI } from '@hono/swagger-ui';
import { Hono } from 'hono';

export const docsRouter = new Hono();

// Serve Swagger UI at /docs
docsRouter.get('/docs', swaggerUI({ url: '/openapi.json' }));

// Serve the OpenAPI spec
docsRouter.get('/openapi.json', (c) => {
  return c.json({
    openapi: '3.0.0',
    info: {
      title: 'Veska API',
      version: '1.0.0',
      description: 'Veska AI-native ERP REST API',
      contact: { name: 'Veska', url: 'https://github.com/arunrajiah/veska' },
      license: { name: 'Apache 2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0' },
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Local development' },
      { url: 'https://api.veska.app', description: 'Production' },
    ],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication and session management' },
      { name: 'Finance', description: 'Invoices, expenses, ledger' },
      { name: 'HR', description: 'Employees, leave requests, payroll' },
      { name: 'CRM', description: 'Contacts, deals, pipeline' },
      { name: 'Projects', description: 'Projects and tasks' },
      { name: 'Support', description: 'Tickets and knowledge base' },
      { name: 'AI', description: 'AI assistant and usage' },
      { name: 'Approvals', description: 'Approval chains and requests' },
      { name: 'Search', description: 'Full-text search' },
      { name: 'Webhooks', description: 'Webhook configuration' },
    ],
    paths: buildPaths(),
  });
});

function buildPaths(): Record<string, unknown> {
  return {
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Session token' },
          401: { description: 'Invalid credentials' },
          429: { description: 'Rate limited' },
        },
        security: [],
      },
    },
    '/api/v1/finance/invoices': {
      get: {
        tags: ['Finance'],
        summary: 'List invoices',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: { 200: { description: 'Invoice list' } },
      },
      post: {
        tags: ['Finance'],
        summary: 'Create invoice',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/v1/finance/invoices/bulk': {
      post: {
        tags: ['Finance'],
        summary: 'Bulk invoice action (send/void/delete)',
        responses: { 200: { description: 'Results' } },
      },
    },
    '/api/v1/finance/invoices/export': {
      get: {
        tags: ['Finance'],
        summary: 'Export invoices as CSV',
        responses: { 200: { description: 'CSV file' } },
      },
    },
    '/api/v1/hr/employees': {
      get: {
        tags: ['HR'],
        summary: 'List employees',
        responses: { 200: { description: 'Employee list' } },
      },
      post: {
        tags: ['HR'],
        summary: 'Create employee',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/v1/hr/leave': {
      get: {
        tags: ['HR'],
        summary: 'List leave requests',
        responses: { 200: { description: 'Leave request list' } },
      },
      post: {
        tags: ['HR'],
        summary: 'Create leave request',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/v1/crm/contacts': {
      get: {
        tags: ['CRM'],
        summary: 'List contacts',
        responses: { 200: { description: 'Contact list' } },
      },
      post: {
        tags: ['CRM'],
        summary: 'Create contact',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/v1/conversations': {
      get: {
        tags: ['AI'],
        summary: 'List AI conversations',
        responses: { 200: { description: 'Conversations' } },
      },
      post: {
        tags: ['AI'],
        summary: 'Create conversation',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/v1/conversations/{id}/chat': {
      post: {
        tags: ['AI'],
        summary: 'Send message to AI assistant',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'AI response' } },
      },
    },
    '/api/v1/search': {
      get: {
        tags: ['Search'],
        summary: 'Full-text search across all entities',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'types', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Search results' } },
      },
    },
    '/api/v1/approval-requests/triggers': {
      get: {
        tags: ['Approvals'],
        summary: 'List approval triggers',
        responses: { 200: { description: 'Triggers' } },
      },
    },
    '/api/v1/webhooks': {
      get: {
        tags: ['Webhooks'],
        summary: 'List configured webhooks',
        responses: { 200: { description: 'Webhooks' } },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Create webhook',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: { type: 'string', format: 'uri' },
                  events: { type: 'array', items: { type: 'string' } },
                  secret: { type: 'string' },
                  enabled: { type: 'boolean', default: true },
                },
                required: ['url', 'events'],
              },
            },
          },
        },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/v1/import-export/contacts': {
      post: {
        tags: ['Search'],
        summary: 'Import contacts from CSV',
        responses: { 200: { description: 'Import results' } },
      },
    },
  };
}
