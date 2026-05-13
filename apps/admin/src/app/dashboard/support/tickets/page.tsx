import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  waiting_customer: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

interface TicketRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default async function TicketsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: TicketRecord[] = [];
  try {
    const res = await apiFetch<TicketRecord[]>('/api/v1/support/tickets', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  const openCount = records.filter((r) => r.data['status'] === 'open').length;

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{openCount} open</p>
        </div>
        <Link
          href="/dashboard/support/tickets/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New ticket
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-5">
        {(['all', 'open', 'in_progress', 'waiting_customer', 'resolved'] as const).map((s) => (
          <button
            key={s}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 capitalize transition-colors"
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No tickets yet.</p>
          <Link
            href="/dashboard/support/tickets/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Create first ticket
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Channel</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Updated</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                const status = (d['status'] as string) ?? 'open';
                const priority = (d['priority'] as string) ?? 'medium';
                const ticketNum = (d['ticket_number'] as string) ?? record.id.slice(0, 8).toUpperCase();
                const updatedAt =
                  typeof record.updatedAt === 'string'
                    ? record.updatedAt.slice(0, 10)
                    : '';
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/support/tickets/${record.id}`}
                        className="font-mono text-xs text-gray-500 hover:text-gray-900"
                      >
                        {ticketNum}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/support/tickets/${record.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {String(d['subject'] ?? '')}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {String(d['contact'] ?? d['contact_email'] ?? '')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium capitalize ${PRIORITY_COLORS[priority] ?? 'text-gray-500'}`}
                      >
                        {priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">
                      {String(d['channel'] ?? '')}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{updatedAt}</td>
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
