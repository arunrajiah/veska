import Link from 'next/link';

const CATEGORIES = ['All', 'Integrations', 'Finance', 'CRM', 'Support', 'AI', 'Industry packs'];

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
    price: '$9/mo',
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
    price: '$19/mo',
    installs: '214',
    icon: '🏠',
  },
];

export default function MarketplacePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm transition-colors">Veska</Link>
            <span className="text-gray-200">/</span>
            <span className="text-sm font-medium text-gray-900">Marketplace</span>
          </div>
          <Link href="/submit" className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
            Submit plugin
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Marketplace</h1>
          <p className="mt-2 text-gray-500 max-w-xl">
            Extend Veska with integrations, industry modules, and AI capabilities. All plugins run in
            isolated sandboxes with capability-based permissions.
          </p>
        </div>

        <div className="mb-6">
          <input
            type="search"
            placeholder="Search plugins…"
            className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                cat === 'All'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLUGINS.map((plugin) => (
            <Link
              key={plugin.id}
              href={`/plugins/${plugin.id}`}
              className="group border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{plugin.icon}</span>
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-gray-700">{plugin.name}</h3>
                    <p className="text-xs text-gray-400">by {plugin.author}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  plugin.price === 'Free' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  {plugin.price}
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2">{plugin.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{plugin.category}</span>
                <span className="text-xs text-gray-400">{plugin.installs} installs</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 border border-gray-200 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Build a plugin</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Plugins run in isolated worker_threads sandboxes with a capability-based SDK. Publish to
            the marketplace and reach thousands of Veska users.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/docs/plugins" className="text-sm bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors">
              Plugin SDK docs
            </Link>
            <Link href="/submit" className="text-sm border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              Submit for review
            </Link>
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
