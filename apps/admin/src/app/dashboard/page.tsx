import Link from 'next/link';

const QUICK_STATS = [
  { label: 'Open tickets', value: '—', href: '/dashboard/support/tickets?status=open' },
  { label: 'Open deals', value: '—', href: '/dashboard/crm/deals?stage=negotiation' },
  { label: 'Unpaid invoices', value: '—', href: '/dashboard/finance/invoices?status=sent' },
  { label: 'New leads', value: '—', href: '/dashboard/crm/leads?status=new' },
];

export default function DashboardOverviewPage() {
  return (
    <div className="px-8 py-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {QUICK_STATS.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
          >
            <p className="text-xs text-gray-500 mb-2">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 col-span-2">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Recent activity</h2>
          <p className="text-sm text-gray-400">
            Activity feed loads from the audit log. Connect your channels to start seeing events here.
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Quick actions</h2>
          <div className="space-y-2">
            {[
              { label: 'New lead', href: '/dashboard/crm/leads/new' },
              { label: 'New ticket', href: '/dashboard/support/tickets/new' },
              { label: 'New invoice', href: '/dashboard/finance/invoices/new' },
              { label: 'Configure channels', href: '/dashboard/channels' },
            ].map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="block text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                + {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
