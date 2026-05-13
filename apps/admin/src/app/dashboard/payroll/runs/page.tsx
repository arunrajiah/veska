import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

interface PayRunRecord {
  id: string;
  entityType: string;
  data: {
    period_start?: string;
    period_end?: string;
    status?: string;
    total_gross?: number;
    total_net?: number;
    total_deductions?: number;
    employee_count?: number;
    notes?: string;
  };
  createdAt: string;
}

function StatusBadge({ status }: { status?: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
        Completed
      </span>
    );
  }
  if (status === 'processing') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
        Processing
      </span>
    );
  }
  if (status === 'cancelled') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      Draft
    </span>
  );
}

function usd(amount?: number) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default async function PayRunsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: PayRunRecord[] = [];
  try {
    const res = await apiFetch<PayRunRecord[]>('/api/v1/payroll/runs', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pay runs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} run{records.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/dashboard/payroll/runs/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New pay run
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No pay runs yet.</p>
          <Link
            href="/dashboard/payroll/runs/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Create your first pay run
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Period</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Employees</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Gross</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Net</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                const periodStart = d.period_start ? d.period_start.slice(0, 10) : '—';
                const periodEnd = d.period_end ? d.period_end.slice(0, 10) : '—';
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{periodStart} – {periodEnd}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.employee_count ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600">{usd(d.total_gross)}</td>
                    <td className="px-4 py-3 text-gray-600">{usd(d.total_net)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/payroll/runs/${record.id}`}
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
