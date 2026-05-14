import Link from 'next/link';
import { Plus, RefreshCw, Pause, Play, Pencil, Trash2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

interface RecurringInvoice {
  id: string;
  name: string;
  status: string;
  frequency: string;
  startDate: string;
  nextRunDate?: string | null;
  runCount?: number;
  templateData?: {
    customerName?: string;
    amount?: number;
    currency?: string;
  };
}

function formatCurrency(amount: unknown, currency = 'USD'): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount ?? '0'));
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

async function fetchRecurring(): Promise<RecurringInvoice[]> {
  try {
    const res = await fetch(
      'http://localhost:3001/api/v1/recurring-invoices?tenantId=demo',
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data ?? []);
  } catch {
    return [];
  }
}

export default async function RecurringInvoicesPage() {
  const records = await fetchRecurring();

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <RefreshCw size={22} className="text-indigo-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Recurring Invoices</h1>
          </div>
          <p className="text-sm text-gray-500 ml-9">
            Automatically generate invoices on a schedule.
          </p>
        </div>
        <Link
          href="/dashboard/finance/recurring/new"
          className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Create Template
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-20 text-center">
          <RefreshCw size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 font-medium mb-1">No recurring invoices yet</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mb-5">
            Set up templates to automatically generate invoices for recurring customers.
          </p>
          <Link
            href="/dashboard/finance/recurring/new"
            className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} />
            Create your first template
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Customer</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Frequency
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Next Run</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">
                  Total Runs
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => {
                const td = rec.templateData ?? {};
                const currency = td.currency ?? 'USD';
                const status = rec.status ?? 'active';
                const nextRun =
                  rec.nextRunDate ? rec.nextRunDate.slice(0, 10) : '—';

                return (
                  <tr
                    key={rec.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{rec.name}</td>
                    <td className="px-4 py-3 text-gray-600">{td.customerName ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(td.amount, currency)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {FREQUENCY_LABELS[rec.frequency] ?? rec.frequency}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{nextRun}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{rec.runCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-2 py-1 rounded-lg transition-colors"
                          title={status === 'paused' ? 'Resume' : 'Pause'}
                        >
                          {status === 'paused' ? <Play size={11} /> : <Pause size={11} />}
                          {status === 'paused' ? 'Resume' : 'Pause'}
                        </button>
                        <Link
                          href={`/dashboard/finance/recurring/${rec.id}/edit`}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Pencil size={11} />
                          Edit
                        </Link>
                        <button className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 border border-red-100 px-2 py-1 rounded-lg transition-colors">
                          <Trash2 size={11} />
                          Delete
                        </button>
                      </div>
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
