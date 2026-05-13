import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-green-100 text-green-700',
  unqualified: 'bg-gray-100 text-gray-500',
};

interface LeadRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export default async function LeadsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: LeadRecord[] = [];
  try {
    const res = await apiFetch<LeadRecord[]>('/api/v1/crm/leads', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} leads</p>
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

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No leads yet.</p>
          <Link
            href="/dashboard/crm/leads/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Add your first lead
          </Link>
        </div>
      ) : (
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
              {records.map((record) => {
                const d = record.data;
                const status = (d['status'] as string) ?? 'new';
                const createdAt =
                  typeof record.createdAt === 'string'
                    ? record.createdAt.slice(0, 10)
                    : '';
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{String(d['name'] ?? '')}</p>
                        <p className="text-xs text-gray-400">{String(d['email'] ?? '')}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{String(d['company'] ?? '')}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{String(d['source'] ?? '')}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{createdAt}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/crm/leads/${record.id}`}
                        className="text-xs text-gray-500 hover:text-gray-900"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
