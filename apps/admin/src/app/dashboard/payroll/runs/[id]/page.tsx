import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { StatusButtons } from './_components.js';

interface PayslipRecord {
  id: string;
  data: {
    employee_name?: string;
    gross_pay?: number;
    deductions?: number;
    net_pay?: number;
    status?: string;
  };
}

interface PayRunDetail {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  payslips: PayslipRecord[];
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

function usd(amount: unknown) {
  const n = Number(amount);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default async function PayRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = await params;

  let record: PayRunDetail | null = null;
  try {
    record = await apiFetch<PayRunDetail>(`/api/v1/payroll/runs/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Pay run not found.</p>
        <Link href="/dashboard/payroll/runs" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to pay runs
        </Link>
      </div>
    );
  }

  const d = record.data;
  const status = String(d['status'] ?? 'draft');
  const periodStart = d['period_start'] ? String(d['period_start']).slice(0, 10) : '—';
  const periodEnd = d['period_end'] ? String(d['period_end']).slice(0, 10) : '—';

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Period', value: `${periodStart} – ${periodEnd}` },
    { label: 'Status', value: <StatusBadge status={status} /> },
    { label: 'Employees', value: String(d['employee_count'] ?? 0) },
    { label: 'Total gross', value: usd(d['total_gross']) },
    { label: 'Total deductions', value: usd(d['total_deductions']) },
    { label: 'Total net', value: usd(d['total_net']) },
  ];

  const payslips = record.payslips ?? [];

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard/payroll/runs" className="text-xs text-gray-400 hover:text-gray-700">
          ← Pay runs
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pay run</h1>
          <p className="text-sm text-gray-500 mt-0.5">{periodStart} – {periodEnd}</p>
        </div>
        <StatusButtons runId={id} tenantId={tenantId} currentStatus={status} />
      </div>

      {/* Info card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
        </div>
        <dl className="divide-y divide-gray-50">
          {fields.map(({ label, value }) => (
            <div key={label} className="px-5 py-3 flex items-center gap-4">
              <dt className="text-xs text-gray-500 w-36 shrink-0">{label}</dt>
              <dd className="text-sm text-gray-900">{value || <span className="text-gray-300">—</span>}</dd>
            </div>
          ))}
        </dl>
      </div>

      {d['notes'] && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h2>
          </div>
          <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">{String(d['notes'])}</p>
        </div>
      )}

      {/* Payslips table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Payslips ({payslips.length})
          </h2>
        </div>
        {payslips.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No payslips for this run yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Gross</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Deductions</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Net</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((slip) => {
                const sd = slip.data;
                return (
                  <tr key={slip.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{sd.employee_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{usd(sd.gross_pay)}</td>
                    <td className="px-4 py-3 text-gray-600">{usd(sd.deductions)}</td>
                    <td className="px-4 py-3 text-gray-600">{usd(sd.net_pay)}</td>
                    <td className="px-4 py-3">
                      {sd.status === 'paid' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Draft
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
