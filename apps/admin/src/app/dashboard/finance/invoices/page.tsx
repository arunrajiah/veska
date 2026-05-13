import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-indigo-100 text-indigo-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-400',
};

interface InvoiceRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function formatCurrency(value: unknown, currency = 'USD'): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

export default async function InvoicesPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: InvoiceRecord[] = [];
  try {
    const res = await apiFetch<InvoiceRecord[]>('/api/v1/finance/invoices', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  const totalOutstanding = records
    .filter((r) => ['sent', 'overdue'].includes((r.data['status'] as string) ?? ''))
    .reduce((sum, r) => {
      const total = typeof r.data['total'] === 'number' ? r.data['total'] : parseFloat(String(r.data['total'] ?? '0'));
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatCurrency(totalOutstanding)} outstanding
          </p>
        </div>
        <Link
          href="/dashboard/finance/invoices/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New invoice
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-5">
        {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map((s) => (
          <button
            key={s}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 capitalize transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No invoices yet.</p>
          <Link
            href="/dashboard/finance/invoices/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Create first invoice
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Number</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Issue date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Due date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                const status = (d['status'] as string) ?? 'draft';
                const currency = (d['currency'] as string) ?? 'USD';
                const issueDate =
                  typeof d['issue_date'] === 'string' ? d['issue_date'].slice(0, 10) : '';
                const dueDate =
                  typeof d['due_date'] === 'string' ? d['due_date'].slice(0, 10) : '';
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {String(d['number'] ?? record.id.slice(0, 8).toUpperCase())}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {String(d['customer'] ?? d['customer_name'] ?? '')}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{issueDate}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{dueDate}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(d['total'], currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/finance/invoices/${record.id}`}
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
