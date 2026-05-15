import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';

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

export default async function PayrollPage() {
  const tenantId = 'demo-tenant';

  let runs: PayrollRun[] = [];
  let payslips: PayrollItem[] = [];

  try {
    const res = await apiFetch<{ data: PayrollRun[] }>('/api/v1/payroll/runs?limit=20', tenantId);
    runs = Array.isArray(res?.data) ? res.data : [];
  } catch {
    runs = [];
  }

  try {
    const res = await apiFetch<{ data: PayrollItem[] }>('/api/v1/payroll?limit=50', tenantId);
    payslips = Array.isArray(res?.data) ? res.data : [];
  } catch {
    payslips = [];
  }

  const lastRun = runs[0];
  const lastRunDate = lastRun?.data?.processedAt ?? lastRun?.data?.period;
  const totalEmployeesPaid = runs
    .filter((r) => r.data?.status === 'completed')
    .reduce((s, r) => Math.max(s, r.data?.employeeCount ?? 0), 0);

  // Total net this month
  const now = new Date();
  const monthStr = now.toISOString().slice(0, 7); // "YYYY-MM"
  const thisMonthNet = runs
    .filter((r) => r.data?.status === 'completed' && r.data?.period?.startsWith(monthStr))
    .reduce((s, r) => s + (r.data?.totalNet ?? 0), 0);

  const recentRuns = runs.slice(0, 5);

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage payroll runs and payslips</p>
        </div>
        <Link
          href="/dashboard/payroll/runs"
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          View All Runs
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Total Runs</p>
          <p className="text-2xl font-semibold text-gray-900">{runs.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Last Run Date</p>
          <p className="text-lg font-semibold text-gray-900">{lastRunDate ? fmtDate(lastRunDate) : '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Employees Paid</p>
          <p className="text-2xl font-semibold text-gray-900">{totalEmployeesPaid || '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Total Net This Month</p>
          <p className="text-2xl font-semibold text-gray-900">{thisMonthNet > 0 ? usd(thisMonthNet) : '—'}</p>
        </div>
      </div>

      {/* Recent payroll runs */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Recent Payroll Runs</h2>
          <Link href="/dashboard/payroll/runs" className="text-xs text-gray-500 hover:text-gray-900">
            View all →
          </Link>
        </div>
        {recentRuns.length === 0 ? (
          <p className="px-6 py-12 text-sm text-gray-400 text-center">No payroll runs yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Run #</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Period</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Employees</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Total Gross</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Total Net</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run) => (
                <tr key={run.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    #{run.data?.runNumber ?? run.id.slice(0, 6)}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{run.data?.period ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{run.data?.employeeCount ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{usd(run.data?.totalGross)}</td>
                  <td className="px-5 py-3 text-gray-600">{usd(run.data?.totalNet)}</td>
                  <td className="px-5 py-3"><StatusBadge {...(run.data?.status ? { status: run.data.status } : {})} /></td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/dashboard/payroll/runs/${run.id}`} className="text-xs text-gray-500 hover:text-gray-900">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
