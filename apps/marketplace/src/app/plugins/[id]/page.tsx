import Link from 'next/link';
import InstallButton from './install-button';

const PLUGINS = [
  {
    id: 'com.veska.stripe',
    name: 'Stripe',
    description: 'Sync payments, subscriptions, and customer data. Automatically create invoices when Stripe charges succeed.',
    category: 'Integrations',
    author: 'Veska',
    price: 'Free',
    installs: '1.2k',
    icon: '💳',
  },
  {
    id: 'com.veska.quickbooks',
    name: 'QuickBooks Online',
    description: 'Export transactions, invoices, and journal entries to QuickBooks. Two-way sync for customers and vendors.',
    category: 'Finance',
    author: 'Veska',
    price: 'Free',
    installs: '847',
    icon: '📊',
  },
  {
    id: 'com.veska.google-calendar',
    name: 'Google Calendar',
    description: 'Sync follow-up meetings, deal deadlines, and ticket SLA times with Google Calendar.',
    category: 'Integrations',
    author: 'Veska',
    price: 'Free',
    installs: '2.1k',
    icon: '📅',
  },
  {
    id: 'com.veska.shopify',
    name: 'Shopify',
    description: 'Pull orders, products, and customer data into Veska CRM. Trigger support tickets on order issues.',
    category: 'Integrations',
    author: 'Veska',
    price: 'Free',
    installs: '643',
    icon: '🛍️',
  },
  {
    id: 'com.veska.inventory',
    name: 'Inventory Lite',
    description: 'Basic stock tracking, low-stock alerts, and purchase order creation.',
    category: 'Industry packs',
    author: 'Veska',
    price: 'Free',
    installs: '389',
    icon: '📦',
  },
  {
    id: 'com.veska.ai-enrich',
    name: 'AI Lead Enrichment',
    description: 'Automatically enrich leads with company size, funding stage, and contact details using public data.',
    category: 'AI',
    author: 'Veska',
    price: 'Free',
    installs: '512',
    icon: '✨',
  },
  {
    id: 'com.veska.hubspot-import',
    name: 'HubSpot Import',
    description: 'One-click import of contacts, companies, deals, and activities from HubSpot CRM.',
    category: 'CRM',
    author: 'Veska',
    price: 'Free',
    installs: '928',
    icon: '🔄',
  },
  {
    id: 'com.veska.sla-monitor',
    name: 'SLA Monitor',
    description: 'Set response and resolution SLA targets by ticket priority. Auto-escalate breaches to Slack.',
    category: 'Support',
    author: 'Veska',
    price: 'Free',
    installs: '731',
    icon: '⏱️',
  },
  {
    id: 'com.veska.realestate',
    name: 'Real Estate Pack',
    description: 'Property listings, lease management, tenant tracking, and maintenance requests.',
    category: 'Industry packs',
    author: 'Veska',
    price: 'Free',
    installs: '214',
    icon: '🏠',
  },
];

const CAPABILITY_MAP: Record<string, string[]> = {
  'com.veska.stripe': ['Contact.read', 'Invoice.create', 'Invoice.read', 'Webhook.receive'],
  'com.veska.quickbooks': ['Invoice.read', 'Invoice.create', 'Contact.read', 'Contact.create'],
  'com.veska.google-calendar': ['Contact.read', 'Deal.read', 'Ticket.read', 'Calendar.write'],
  'com.veska.shopify': ['Contact.read', 'Contact.create', 'Ticket.create', 'Order.read'],
  'com.veska.inventory': ['Product.read', 'Product.write', 'Order.read', 'Alert.create'],
  'com.veska.ai-enrich': ['Lead.read', 'Lead.write', 'Contact.read', 'Contact.write'],
  'com.veska.hubspot-import': ['Contact.create', 'Deal.create', 'Company.create', 'Activity.create'],
  'com.veska.sla-monitor': ['Ticket.read', 'Ticket.write', 'Alert.create', 'Notification.send'],
  'com.veska.realestate': ['Contact.read', 'Contact.create', 'Document.read', 'Document.write'],
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PluginDetailPage({ params }: PageProps) {
  const { id } = await params;
  const plugin = PLUGINS.find((p) => p.id === id);

  if (!plugin) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm transition-colors">Veska</Link>
            <span className="text-gray-200">/</span>
            <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm transition-colors">Marketplace</Link>
            <span className="text-gray-200">/</span>
            <span className="text-sm font-medium text-gray-900">Plugin not found</span>
          </div>
        </header>
        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-20 text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Plugin not found</h1>
          <p className="text-gray-500 text-sm mb-6">
            No plugin with id <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{id}</code> exists in the marketplace.
          </p>
          <Link
            href="/"
            className="inline-flex text-sm bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Marketplace
          </Link>
        </main>
      </div>
    );
  }

  const capabilities = CAPABILITY_MAP[plugin.id] ?? ['Contact.read'];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm transition-colors">Veska</Link>
            <span className="text-gray-200">/</span>
            <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm transition-colors">Marketplace</Link>
            <span className="text-gray-200">/</span>
            <span className="text-sm font-medium text-gray-900">{plugin.name}</span>
          </div>
          <Link href="/submit" className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
            Submit plugin
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          ← Back to Marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8">
              <div className="flex items-start gap-5 mb-6">
                <span className="text-5xl">{plugin.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h1 className="text-2xl font-semibold text-gray-900">{plugin.name}</h1>
                    <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${
                      plugin.price === 'Free' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {plugin.price}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">by {plugin.author}</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">{plugin.description}</p>
            </div>

            {/* Capabilities */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Required capabilities</h2>
              <p className="text-sm text-gray-500 mb-4">
                This plugin requests the following permissions. It runs in an isolated sandbox and
                can only access what you explicitly grant.
              </p>
              <div className="flex flex-wrap gap-2">
                {capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="font-mono text-xs bg-gray-50 border border-gray-200 text-gray-700 px-2.5 py-1 rounded-lg"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {/* About */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">About</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                This plugin is published by {plugin.author} and is available in the {plugin.category} category.
                All Veska marketplace plugins run in isolated <code className="font-mono bg-gray-100 px-1 rounded">worker_threads</code> sandboxes
                with capability-based permissions, ensuring your data stays safe.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <InstallButton pluginId={plugin.id} pluginName={plugin.name} />
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Category</span>
                  <span className="text-gray-900 font-medium">{plugin.category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Author</span>
                  <span className="text-gray-900 font-medium">{plugin.author}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Price</span>
                  <span className="text-gray-900 font-medium">{plugin.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Installs</span>
                  <span className="text-gray-900 font-medium">{plugin.installs}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Sandbox security</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Plugins run in isolated worker_threads. No network access beyond declared
                integrations. All capability calls are logged in the audit trail.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <span>© 2026 Veska, Inc.</span>
          <div className="flex gap-5">
            <Link href="/docs/plugins" className="hover:text-gray-600">Plugin docs</Link>
            <Link href="/submit" className="hover:text-gray-600">Submit plugin</Link>
            <Link href="https://github.com/arunrajiah/veska" className="hover:text-gray-600">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
