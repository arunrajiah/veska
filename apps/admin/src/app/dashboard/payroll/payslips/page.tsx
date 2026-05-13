import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';

interface PayslipRecord {
  id: string;
  entityType: string;
  data: {
    pay_run_id?: string;
    employee_id?: string;
    employee_name?: string;
    gross_pay?: number;
    deductions?: number;
    net_pay?: number;
    period_start?: string;
    period_end?: string;
    status?: string;
  };
  createdAt: string;
}

function usd(amount?: number) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default async function PayslipsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: PayslipRecord[] = [];
  try {
    const res = await apiFetch<PayslipRecord[]>('/api/v1/payroll/payslips', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payslips</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} payslip{records.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No payslips yet. Payslips are created within a pay run.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Pay run</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Gross</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Deductions</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Net</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{d.employee_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {d.pay_run_id ? (
                        <Link
                          href={`/dashboard/payroll/runs/${d.pay_run_id}`}
                          className="text-xs text-blue-600 hover:underline font-mono"
                        >
                          {d.pay_run_id.slice(0, 8)}…
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{usd(d.gross_pay)}</td>
                    <td className="px-4 py-3 text-gray-600">{usd(d.deductions)}</td>
                    <td className="px-4 py-3 text-gray-600">{usd(d.net_pay)}</td>
                    <td className="px-4 py-3">
                      {d.status === 'paid' ? (
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
        </div>
      )}
    </div>
  );
}
