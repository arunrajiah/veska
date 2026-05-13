export const metadata = {
  title: 'API Reference — Veska Docs',
  description: 'Complete REST API reference for Veska.',
};

const apiGroups = [
  {
    name: 'Authentication',
    description: 'All API requests require two headers:',
    note: (
      <>
        <code>X-Veska-Tenant-Id: your-tenant-id</code> — your workspace identifier
        <br />
        <code>Authorization: Bearer &lt;api-key&gt;</code> — an API key from Settings → Developer
      </>
    ),
    endpoints: [],
  },
  {
    name: 'Entities',
    base: '/api/v1/entities',
    description: 'Generic entity CRUD. Works for any entity type defined in your workspace (Contact, Lead, Ticket, Invoice, or custom).',
    endpoints: [
      { method: 'GET', path: '/definitions', desc: 'List all entity type definitions for the tenant' },
      { method: 'GET', path: '/:entityType', desc: 'List records of a given entity type' },
      { method: 'GET', path: '/:entityType/:id', desc: 'Fetch a single entity record by ID' },
      { method: 'POST', path: '/:entityType', desc: 'Create a new entity record' },
      { method: 'PATCH', path: '/:entityType/:id', desc: 'Partially update an entity record' },
      { method: 'DELETE', path: '/:entityType/:id', desc: 'Soft-delete an entity record' },
    ],
  },
  {
    name: 'CRM',
    base: '/api/v1/crm',
    description: 'Contacts, leads, deals, and activities.',
    endpoints: [
      { method: 'GET', path: '/contacts', desc: 'List contacts (filter by q, tag, assigned_to)' },
      { method: 'GET', path: '/contacts/:id', desc: 'Fetch a contact with activity timeline' },
      { method: 'POST', path: '/contacts', desc: 'Create a contact' },
      { method: 'PATCH', path: '/contacts/:id', desc: 'Update a contact' },
      { method: 'DELETE', path: '/contacts/:id', desc: 'Soft-delete a contact' },
      { method: 'GET', path: '/leads', desc: 'List leads (filter by status, assigned_to, q)' },
      { method: 'POST', path: '/leads', desc: 'Create a lead' },
      { method: 'PATCH', path: '/leads/:id', desc: 'Update a lead' },
      { method: 'GET', path: '/deals', desc: 'List deals (filter by stage, assigned_to)' },
      { method: 'POST', path: '/deals', desc: 'Create a deal' },
      { method: 'PATCH', path: '/deals/:id/stage', desc: 'Move a deal to a new pipeline stage' },
      { method: 'GET', path: '/activities', desc: 'List activity log entries' },
      { method: 'POST', path: '/activities', desc: 'Log a manual activity (call, meeting, note)' },
    ],
  },
  {
    name: 'Support',
    base: '/api/v1/support',
    description: 'Helpdesk tickets and conversations.',
    endpoints: [
      { method: 'GET', path: '/tickets', desc: 'List tickets (filter by status, priority, assignee_id, q)' },
      { method: 'GET', path: '/tickets/:id', desc: 'Fetch a ticket with its message thread' },
      { method: 'POST', path: '/tickets', desc: 'Create a ticket' },
      { method: 'PATCH', path: '/tickets/:id', desc: 'Update ticket fields (status, assignee, priority)' },
      { method: 'POST', path: '/tickets/:id/messages', desc: 'Add a reply to a ticket thread' },
      { method: 'POST', path: '/tickets/:id/assign', desc: 'Assign ticket to an agent' },
      { method: 'POST', path: '/tickets/:id/resolve', desc: 'Mark a ticket as resolved' },
    ],
  },
  {
    name: 'Finance',
    base: '/api/v1/finance',
    description: 'Invoices, expenses, and revenue reporting.',
    endpoints: [
      { method: 'GET', path: '/invoices', desc: 'List invoices (filter by status, customer_id)' },
      { method: 'GET', path: '/invoices/:id', desc: 'Fetch an invoice with line items' },
      { method: 'POST', path: '/invoices', desc: 'Create an invoice' },
      { method: 'PATCH', path: '/invoices/:id', desc: 'Update invoice fields or status' },
      { method: 'POST', path: '/invoices/:id/send', desc: 'Send invoice to customer via email' },
      { method: 'GET', path: '/expenses', desc: 'List expenses' },
      { method: 'POST', path: '/expenses', desc: 'Record an expense' },
      { method: 'GET', path: '/report/revenue', desc: 'Revenue summary (query: period, group_by)' },
    ],
  },
  {
    name: 'Workflows',
    base: '/api/v1/workflows',
    description: 'Automation workflow definitions and run history.',
    endpoints: [
      { method: 'GET', path: '/', desc: 'List all workflow definitions' },
      { method: 'GET', path: '/:id', desc: 'Fetch a workflow definition' },
      { method: 'POST', path: '/:id/trigger', desc: 'Manually trigger a workflow run' },
      { method: 'GET', path: '/:id/runs', desc: 'List run history for a workflow' },
      { method: 'GET', path: '/runs/:runId', desc: 'Fetch a single run with step-level logs' },
    ],
  },
  {
    name: 'Plugins',
    base: '/api/v1/plugins',
    description: 'Install, configure, and manage plugins.',
    endpoints: [
      { method: 'GET', path: '/', desc: 'List installed plugins' },
      { method: 'POST', path: '/install', desc: 'Install a plugin by registry ID or local path' },
      { method: 'GET', path: '/:id', desc: 'Fetch plugin details and config schema' },
      { method: 'PATCH', path: '/:id/config', desc: 'Update plugin configuration values' },
      { method: 'POST', path: '/:id/enable', desc: 'Enable a disabled plugin' },
      { method: 'POST', path: '/:id/disable', desc: 'Disable an active plugin' },
      { method: 'DELETE', path: '/:id', desc: 'Uninstall a plugin' },
    ],
  },
  {
    name: 'Integrations',
    base: '/api/v1/integrations',
    description: 'Channel adapter status and configuration.',
    endpoints: [
      { method: 'GET', path: '/', desc: 'List all configured channel integrations' },
      { method: 'GET', path: '/:channelName/status', desc: 'Get connection status for a channel' },
      { method: 'POST', path: '/:channelName/test', desc: 'Send a test message through a channel' },
    ],
  },
  {
    name: 'Webhooks',
    base: '/api/v1/webhooks',
    description: 'Register outbound webhooks that Veska fires on entity events.',
    endpoints: [
      { method: 'GET', path: '/', desc: 'List registered webhook endpoints' },
      { method: 'POST', path: '/', desc: 'Register a new webhook (url, events, secret)' },
      { method: 'PATCH', path: '/:id', desc: 'Update a webhook endpoint' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a webhook' },
      { method: 'GET', path: '/:id/deliveries', desc: 'List recent delivery attempts and status codes' },
    ],
  },
  {
    name: 'Audit',
    base: '/api/v1/audit',
    description: 'Structured audit log of all actions performed in the workspace.',
    endpoints: [
      { method: 'GET', path: '/logs', desc: 'Query audit log (filter by actor, action, resource, date range)' },
      { method: 'GET', path: '/logs/:id', desc: 'Fetch a single audit log entry with full detail' },
    ],
  },
  {
    name: 'Config',
    base: '/api/v1/config',
    description: 'Propose, review, apply, and roll back workspace configuration changes via AI.',
    endpoints: [
      { method: 'POST', path: '/propose', desc: 'Submit a natural language request; returns a structured diff' },
      { method: 'POST', path: '/apply/:diffId', desc: 'Apply an approved config diff atomically' },
      { method: 'POST', path: '/rollback/:configVersionId', desc: 'Roll back to a previous config version' },
    ],
  },
  {
    name: 'API Keys',
    base: '/api/v1/api-keys',
    description: 'Manage programmatic API keys for your workspace.',
    endpoints: [
      { method: 'GET', path: '/', desc: 'List API keys (secret values are never returned)' },
      { method: 'POST', path: '/', desc: 'Create a new API key; secret returned once on creation' },
      { method: 'DELETE', path: '/:id', desc: 'Revoke an API key immediately' },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: 'text-blue-700 bg-blue-50 border-blue-200',
  POST: 'text-green-700 bg-green-50 border-green-200',
  PATCH: 'text-amber-700 bg-amber-50 border-amber-200',
  DELETE: 'text-red-700 bg-red-50 border-red-200',
};

export default function ApiPage() {
  return (
    <article className="prose-sm max-w-none">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">API Reference</h1>
      <p className="text-gray-500 mb-4 text-sm leading-relaxed">
        Veska exposes a REST API at <span className="font-mono text-xs text-gray-700">/api/v1</span>. All responses are JSON. All write endpoints accept <span className="font-mono text-xs text-gray-700">Content-Type: application/json</span>.
      </p>

      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 mb-10">
        <p className="text-xs font-mono text-gray-500 mb-2">Base URL</p>
        <p className="font-mono text-sm text-gray-800">https://your-domain/api/v1</p>
      </div>

      {/* Auth */}
      <section className="mb-8 rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Authentication</h2>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-600 mb-4">Every request requires two headers:</p>
          <div className="rounded bg-gray-50 border border-gray-100 p-4 mb-4">
            <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre">{`X-Veska-Tenant-Id: your-tenant-id
Authorization: Bearer <api-key>`}</pre>
          </div>
          <p className="text-xs text-gray-500">
            API keys are created and revoked in <strong>Settings → Developer → API keys</strong>. Keys are shown only once at creation.
          </p>
        </div>
      </section>

      {/* Endpoint groups */}
      <div className="space-y-6">
        {apiGroups.filter(g => g.endpoints.length > 0).map((group) => (
          <section key={group.name} className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
              <div className="flex items-baseline gap-3">
                <h2 className="text-sm font-semibold text-gray-900">{group.name}</h2>
                {group.base && (
                  <span className="font-mono text-xs text-gray-400">{group.base}</span>
                )}
              </div>
              {group.description && (
                <p className="text-xs text-gray-500 mt-1">{group.description}</p>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {group.endpoints.map((ep) => (
                <div key={`${ep.method}${ep.path}`} className="flex items-center gap-4 px-5 py-3">
                  <span className={`shrink-0 font-mono text-xs font-medium px-2 py-0.5 rounded border ${methodColors[ep.method] ?? 'text-gray-700 bg-gray-50 border-gray-200'}`}>
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs text-gray-700 w-64 shrink-0">
                    {group.base}{ep.path}
                  </span>
                  <span className="text-xs text-gray-500">{ep.desc}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Errors */}
      <section className="mt-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Error responses</h2>
        <div className="rounded-lg border border-gray-200 overflow-hidden text-xs">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['400', 'Bad request — validation error in request body'],
                ['401', 'Unauthorized — missing or invalid API key'],
                ['403', 'Forbidden — key does not have permission for this resource'],
                ['404', 'Not found — resource does not exist or belongs to another tenant'],
                ['409', 'Conflict — duplicate resource (e.g. slug already taken)'],
                ['422', 'Unprocessable — business rule violation'],
                ['500', 'Server error — see logs'],
              ].map(([status, meaning]) => (
                <tr key={status}>
                  <td className="px-4 py-2.5 font-mono text-gray-700">{status}</td>
                  <td className="px-4 py-2.5 text-gray-500">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 mt-4">
          <p className="text-xs text-gray-400 font-mono mb-2">Error body format</p>
          <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre">{`{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email address" }
  ]
}`}</pre>
        </div>
      </section>
    </article>
  );
}
