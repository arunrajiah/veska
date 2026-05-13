import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

interface TimeSummary {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  thisWeekHours: number;
  lastWeekHours: number;
  byEmployee: Array<{ employee_name: string; totalHours: number; billableHours: number }>;
  byProject: Array<{ project_name: string; totalHours: number; billableHours: number }>;
}

function formatHours(h: number) {
  return h.toFixed(1) + 'h';
}

function billablePct(total: number, billable: number) {
  if (total === 0) return '—';
  return Math.round((billable / total) * 100) + '%';
}

export default async function TimeOverviewPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let summary: TimeSummary = {
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    thisWeekHours: 0,
    lastWeekHours: 0,
    byEmployee: [],
    byProject: [],
  };

  try {
    const res = await apiFetch<TimeSummary>('/api/v1/time/entries/summary', tenantId);
    summary = res;
  } catch {
    // keep defaults
  }

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Time Tracking</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of logged hours</p>
        </div>
        <Link
          href="/dashboard/time/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Log time
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Total Hours</p>
          <p className="text-2xl font-semibold text-gray-900">{formatHours(summary.totalHours)}</p>
          <p className="text-xs text-gray-400 mt-0.5">all time</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Billable Hours</p>
          <p className="text-2xl font-semibold text-green-700">{formatHours(summary.billableHours)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {billablePct(summary.totalHours, summary.billableHours)} of total
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">This Week</p>
          <p className="text-2xl font-semibold text-gray-900">{formatHours(summary.thisWeekHours)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Mon–Sun</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Last Week</p>
          <p className="text-2xl font-semibold text-gray-500">{formatHours(summary.lastWeekHours)}</p>
          <p className="text-xs text-gray-400 mt-0.5">previous week</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* By Employee */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">By Employee</h2>
          </div>
          {summary.byEmployee.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Employee</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Total</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Billable</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Billable %</th>
                </tr>
              </thead>
              <tbody>
                {summary.byEmployee.map((row) => (
                  <tr key={row.employee_name} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 text-gray-900 font-medium">{row.employee_name}</td>
                    <td className="px-5 py-2.5 text-right text-gray-700">{formatHours(row.totalHours)}</td>
                    <td className="px-5 py-2.5 text-right text-green-700">{formatHours(row.billableHours)}</td>
                    <td className="px-5 py-2.5 text-right text-gray-400 text-xs">
                      {billablePct(row.totalHours, row.billableHours)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* By Project */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">By Project</h2>
          </div>
          {summary.byProject.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No project data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Project</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Total</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">Billable</th>
                </tr>
              </thead>
              <tbody>
                {summary.byProject.map((row) => (
                  <tr key={row.project_name} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 text-gray-900 font-medium">{row.project_name}</td>
                    <td className="px-5 py-2.5 text-right text-gray-700">{formatHours(row.totalHours)}</td>
                    <td className="px-5 py-2.5 text-right text-green-700">{formatHours(row.billableHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
