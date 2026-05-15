import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { ProcessRunButton, DownloadCSVButton } from './_components.js';

interface PayrollRun {
  id: string;
  data: {
    runNumber?: number;
    period?: string;
    status?: 'draft' | 'processing' | 'completed' | 'failed';
    totalGross?: number;
    totalNet?: number;
    totalTax?: number;
    employeeCount?: number;
    processedAt?: string;
    notes?: string;
  };
}

interface PayrollItem {
  id: string;
  data: {
    employeeId?: string;
    employeeName?: string;
    runId?: string;
    period?: string;
    grossPay?: number;
    netPay?: number;
    tax?: number;
    deductions?: Array<{ name: string; amount: number }>;
    allowances?: Array<{ name: string; amount: number }>;
    status?: 'draft' | 'paid';
  };
}

function usd(v?: number) {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    processing: 'bg-blue-50 text-blue-700',
    completed: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-600',
  };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status ?? 'draft'] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

export default async function PayrollRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const tenantId = 'demo-tenant';
  const { id } = await params;

  let run: PayrollRun | null = null;
  let payslips: PayrollItem[] = [];

  try {
    run = await apiFetch<PayrollRun>(`/api/v1/payroll/runs/${id}`, tenantId);
  } catch {
    run = null;
  }

  if (run) {
    try {
      const res = await apiFetch<{ data: PayrollItem[] }>(`/api/v1/payroll?limit=50`, tenantId);
      const all = Array.isArray(res?.data) ? res.data : [];
      payslips = all.filter((p) => p.data?.runId === id);
    } catch {
      payslips = [];
    }
  }

  if (!run) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Payroll run not found.</p>
        <Link href="/dashboard/payroll/runs" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to runs
        </Link>
      </div>
    );
  }

  const d = run.data;
  const csvPayslips = payslips.map((p) =>
    Object.fromEntries(
      Object.entries({
        employeeName: p.data?.employeeName,
        grossPay: p.data?.grossPay,
        tax: p.data?.tax,
        netPay: p.data?.netPay,
        status: p.data?.status,
      }).filter(([, v]) => v !== undefined)
    ) as { employeeName?: string; grossPay?: number; tax?: number; netPay?: number; status?: string }
  );

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-4">
        <Link href="/dashboard/payroll/runs" className="text-xs text-gray-400 hover:text-gray-700">
          ← Payroll Runs
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              Payroll Run #{d?.runNumber ?? run.id.slice(0, 6)}
            </h1>
            <StatusBadge {...(d?.status ? { status: d.status } : {})} />
          </div>
          <p className="text-sm text-gray-500 mt-1">{d?.period ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadCSVButton runId={run.id} payslips={csvPayslips} />
          <ProcessRunButton runId={run.id} status={(d?.status as string) ?? 'draft'} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Employees</p>
          <p className="text-2xl font-semibold text-gray-900">{d?.employeeCount ?? '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Total Gross</p>
          <p className="text-2xl font-semibold text-gray-900">{usd(d?.totalGross)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Total Net</p>
          <p className="text-2xl font-semibold text-gray-900">{usd(d?.totalNet)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Total Tax</p>
          <p className="text-2xl font-semibold text-gray-900">{usd(d?.totalTax)}</p>
        </div>
      </div>

      {/* Run details */}
      {(d?.processedAt || d?.notes) && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Details</h2>
          </div>
          <dl className="divide-y divide-gray-50">
            {d?.processedAt && (
              <div className="px-5 py-3 flex items-center gap-4">
                <dt className="text-xs text-gray-500 w-32 shrink-0">Processed At</dt>
                <dd className="text-sm text-gray-900">{fmtDate(d.processedAt)}</dd>
              </div>
            )}
            {d?.notes && (
              <div className="px-5 py-3 flex items-start gap-4">
                <dt className="text-xs text-gray-500 w-32 shrink-0 pt-0.5">Notes</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">{d.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Payslips */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Payslips ({payslips.length})
          </h2>
        </div>
        {payslips.length === 0 ? (
          <p className="px-5 py-12 text-sm text-gray-400 text-center">No payslips for this run.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Employee</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Gross</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Deductions</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Tax</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Net</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((slip) => {
                const sd = slip.data;
                const totalDeductions = (sd?.deductions ?? []).reduce((s, d) => s + (d.amount ?? 0), 0);
                return (
                  <tr key={slip.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{sd?.employeeName ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{usd(sd?.grossPay)}</td>
                    <td className="px-5 py-3 text-gray-600">{totalDeductions > 0 ? usd(totalDeductions) : '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{usd(sd?.tax)}</td>
                    <td className="px-5 py-3 text-gray-600">{usd(sd?.netPay)}</td>
                    <td className="px-5 py-3">
                      {sd?.status === 'paid' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">Paid</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">Draft</span>
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
