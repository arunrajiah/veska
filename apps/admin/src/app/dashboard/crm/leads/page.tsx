import Link from 'next/link';
import { Plus } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-green-100 text-green-700',
  unqualified: 'bg-gray-100 text-gray-500',
};

// Stub — in production fetched from GET /api/v1/crm/leads
const STUB_LEADS = [
  { id: '1', name: 'Sarah Chen', company: 'Nexus Labs', status: 'new', email: 'sarah@nexuslabs.com', source: 'website', createdAt: '2026-05-10' },
  { id: '2', name: 'James Okafor', company: 'BrightPath', status: 'contacted', email: 'james@brightpath.io', source: 'referral', createdAt: '2026-05-09' },
  { id: '3', name: 'Maria Santos', company: 'TechVault', status: 'qualified', email: 'maria@techvault.com', source: 'event', createdAt: '2026-05-07' },
];

export default function LeadsPage() {
  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{STUB_LEADS.length} leads</p>
        </div>
        <Link
          href="/dashboard/crm/leads/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New lead
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {(['all', 'new', 'contacted', 'qualified'] as const).map((s) => (
          <button
            key={s}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 capitalize transition-colors"
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Company</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Source</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {STUB_LEADS.map((lead) => (
              <tr key={lead.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{lead.name}</p>
                    <p className="text-xs text-gray-400">{lead.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{lead.company}</td>
                <td className="px-4 py-3 text-gray-500 capitalize">{lead.source}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{lead.createdAt}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/crm/leads/${lead.id}`}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
