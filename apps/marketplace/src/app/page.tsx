import Link from 'next/link';

export default function MarketplacePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Link href="https://veska.com" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
            Veska
          </Link>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-sm">Marketplace</span>
        </div>
        <Link
          href="/submit"
          className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-md hover:bg-gray-700 transition-colors"
        >
          Submit a plugin
        </Link>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Marketplace</h1>
          <p className="mt-2 text-gray-500">
            Extend Veska with integrations, modules, and industry packs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Stripe Integration', description: 'Sync payments, subscriptions, and customer data.', tag: 'Integration', free: true },
            { name: 'QuickBooks Export', description: 'Export transactions to QuickBooks Online.', tag: 'Integration', free: true },
            { name: 'Google Calendar Sync', description: 'Sync meetings, follow-ups, and deadlines.', tag: 'Integration', free: true },
            { name: 'Shopify Connector', description: 'Pull orders, products, and customers into Veska CRM.', tag: 'Integration', free: true },
            { name: 'Inventory Lite', description: 'Basic stock tracking and low-stock alerts.', tag: 'Module', free: true },
          ].map((plugin) => (
            <div key={plugin.name} className="rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{plugin.tag}</span>
                <span className="text-xs text-gray-400">{plugin.free ? 'Free' : 'Paid'}</span>
              </div>
              <h3 className="font-medium text-gray-900 mt-2">{plugin.name}</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{plugin.description}</p>
              <button className="mt-4 text-sm text-blue-600 hover:text-blue-800 transition-colors">
                Install →
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
