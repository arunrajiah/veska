export const metadata = {
  title: 'Plugins & SDK — Veska Docs',
  description: 'Build and install plugins for Veska using the TypeScript SDK.',
};

export default function PluginsPage() {
  return (
    <article className="prose-sm max-w-none">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Plugins & SDK</h1>
      <p className="text-gray-500 mb-10 text-sm leading-relaxed">
        Extend Veska with custom logic, third-party integrations, and webhook handlers using the TypeScript Plugin SDK.
      </p>

      {/* What is a plugin */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">What is a plugin?</h2>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          A Veska plugin is an isolated TypeScript module that runs in a sandboxed worker process. Plugins can:
        </p>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            'React to entity changes and workflow events via named handler functions',
            'Read and write any entity type through a safe, mediated context API',
            'Send messages over any configured channel (Slack, Email, WhatsApp, Telegram)',
            'Trigger AI agents and structured workflows',
            'Write to the audit log for compliance and observability',
          ].map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-green-500 shrink-0">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-gray-500 mt-4 leading-relaxed">
          Plugins never access the database directly — all data access goes through the <span className="font-mono text-xs text-gray-700">VeskaPluginContext</span> object, which enforces tenant isolation and permission boundaries.
        </p>
      </section>

      {/* Plugin manifest */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Plugin manifest</h2>
        <p className="text-sm text-gray-500 mb-4">Every plugin ships a <span className="font-mono text-xs text-gray-700">veska-plugin.json</span> manifest:</p>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-5">
          <p className="text-xs text-gray-400 font-mono mb-3">veska-plugin.json</p>
          <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`{
  "id": "stripe",
  "name": "Stripe",
  "version": "1.0.0",
  "description": "Sync Stripe customers and invoices to Veska entities.",
  "author": "Veska",
  "entrypoint": "dist/index.js",
  "config": {
    "secretKey": {
      "type": "secret",
      "label": "Stripe Secret Key",
      "required": true
    }
  },
  "hooks": [
    {
      "event": "stripe.customer.created",
      "handler": "onCustomerCreated"
    },
    {
      "event": "stripe.invoice.paid",
      "handler": "onInvoicePaid"
    }
  ],
  "permissions": ["entities:read", "entities:write", "audit:write"]
}`}</pre>
        </div>
      </section>

      {/* VeskaPluginContext API */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">VeskaPluginContext API</h2>
        <p className="text-sm text-gray-500 mb-6">The context object injected into every plugin handler:</p>

        <div className="space-y-6">
          {/* entities */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
              <span className="font-mono text-xs font-medium text-gray-700">ctx.entities</span>
              <span className="text-xs text-gray-400">— read and write entity records</span>
            </div>
            <div className="p-4">
              <div className="rounded bg-gray-50 border border-gray-100 p-4">
                <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`// Find multiple records
ctx.entities.find({
  entityType: 'Contact',
  filters: { email: 'alice@example.com' },
  limit: 10,
  orderBy: { field: 'created_at', direction: 'desc' },
}): Promise<unknown[]>

// Find a single record by ID
ctx.entities.findOne(entityType: string, id: string): Promise<unknown | null>

// Create a record
ctx.entities.create({
  entityType: 'Invoice',
  data: { number: 'INV-001', total: 499.00, status: 'paid' },
}): Promise<{ id: string }>

// Update a record
ctx.entities.update(entityType, id, data): Promise<void>

// Delete a record
ctx.entities.delete(entityType, id): Promise<void>`}</pre>
              </div>
            </div>
          </div>

          {/* workflows */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
              <span className="font-mono text-xs font-medium text-gray-700">ctx.workflows</span>
              <span className="text-xs text-gray-400">— trigger automation workflows</span>
            </div>
            <div className="p-4">
              <div className="rounded bg-gray-50 border border-gray-100 p-4">
                <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`ctx.workflows.trigger(
  workflowId: string,
  context?: Record<string, unknown>
): Promise<{ runId: string }>`}</pre>
              </div>
            </div>
          </div>

          {/* channels */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
              <span className="font-mono text-xs font-medium text-gray-700">ctx.channels</span>
              <span className="text-xs text-gray-400">— send messages to any channel</span>
            </div>
            <div className="p-4">
              <div className="rounded bg-gray-50 border border-gray-100 p-4">
                <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`ctx.channels.send({
  channelName: 'slack',
  recipientChannelId: 'C01234567',
  text: 'Payment received: $499.00',
  magicLink: { label: 'View Invoice', url: 'https://...' },
}): Promise<void>`}</pre>
              </div>
            </div>
          </div>

          {/* ai */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
              <span className="font-mono text-xs font-medium text-gray-700">ctx.ai</span>
              <span className="text-xs text-gray-400">— run AI agents</span>
            </div>
            <div className="p-4">
              <div className="rounded bg-gray-50 border border-gray-100 p-4">
                <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`ctx.ai.run({
  agentId: 'summarize-ticket',
  input: { ticketId: '...' },
}): Promise<unknown>`}</pre>
              </div>
            </div>
          </div>

          {/* audit */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
              <span className="font-mono text-xs font-medium text-gray-700">ctx.audit</span>
              <span className="text-xs text-gray-400">— write to the structured audit log</span>
            </div>
            <div className="p-4">
              <div className="rounded bg-gray-50 border border-gray-100 p-4">
                <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`ctx.audit.log(
  action: string,          // e.g. 'stripe.customer.synced'
  details?: Record<string, unknown>
): Promise<void>`}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLI */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">CLI usage</h2>
        <p className="text-sm text-gray-500 mb-4">Scaffold a new plugin with the Veska CLI:</p>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-5 mb-4">
          <pre className="text-sm text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`# Create a new plugin
npx veska create-plugin my-plugin

# This generates:
#   my-plugin/
#     veska-plugin.json
#     src/index.ts
#     tsconfig.json
#     package.json

# Build and install
cd my-plugin && npm run build
veska plugin install ./my-plugin`}</pre>
        </div>
      </section>

      {/* Example */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">Example plugin</h2>
        <p className="text-sm text-gray-500 mb-4">
          The official Stripe plugin syncs customers and invoices from Stripe webhooks into Veska entities:
        </p>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-5">
          <p className="text-xs text-gray-400 font-mono mb-3">plugins/official/stripe/src/index.ts</p>
          <pre className="text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">{`import type { VeskaPluginContext } from '@veska/sdk';

// Called when a Stripe customer.created webhook fires
export async function onCustomerCreated(
  input: { customer: { id: string; email: string; name: string } },
  ctx: VeskaPluginContext,
): Promise<void> {
  const { customer } = input;

  // Check if contact already exists
  const existing = await ctx.entities.find({
    entityType: 'Contact',
    filters: { email: customer.email },
    limit: 1,
  });

  if (existing.length > 0) {
    await ctx.audit.log('stripe.customer.already_exists', {
      stripeId: customer.id,
    });
    return;
  }

  // Create contact from Stripe customer
  const [firstName, ...rest] = (customer.name ?? '').split(' ');
  await ctx.entities.create({
    entityType: 'Contact',
    data: {
      first_name: firstName,
      last_name: rest.join(' '),
      email: customer.email,
      notes: \`Imported from Stripe. ID: \${customer.id}\`,
    },
  });

  await ctx.audit.log('stripe.customer.synced', {
    stripeId: customer.id,
    email: customer.email,
  });
}`}</pre>
        </div>
      </section>

      {/* Installing plugins */}
      <section className="rounded-lg bg-gray-50 border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Installing plugins from the marketplace</h2>
        <p className="text-sm text-gray-500 mb-3">
          Browse and install official plugins from the Plugins section of the admin dashboard. Official plugins include:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {['Stripe', 'QuickBooks', 'Shopify', 'HubSpot', 'Twilio', 'PagerDuty'].map((p) => (
            <div key={p} className="bg-white border border-gray-200 rounded px-3 py-2 text-xs text-gray-700 font-medium">
              {p}
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
