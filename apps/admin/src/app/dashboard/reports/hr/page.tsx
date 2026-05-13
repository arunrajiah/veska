import { apiFetch } from '@/lib/api.js';

interface DeptEntry {
  department: string;
  count: number;
}

interface TypeEntry {
  type: string;
  count: number;
}

interface EmployeeRecord {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
}

interface HrReport {
  totalEmployees: number;
  activeCount: number;
  onLeaveCount: number;
  inactiveCount: number;
  byDepartment: DeptEntry[];
  recentHires: EmployeeRecord[];
  leaveStats: {
    pending: number;
    approved: number;
    rejected: number;
    byType: TypeEntry[];
  };
}

export default async function HrReportPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let report: HrReport = {
    totalEmployees: 0,
    activeCount: 0,
    onLeaveCount: 0,
    inactiveCount: 0,
    byDepartment: [],
    recentHires: [],
    leaveStats: { pending: 0, approved: 0, rejected: 0, byType: [] },
  };

  try {
    report = await apiFetch<HrReport>('/api/v1/reports/hr', tenantId);
  } catch {
    // fall through to empty state
  }

  const headcountStats = [
    { label: 'Total employees', value: report.totalEmployees, color: 'text-gray-900' },
    { label: 'Active', value: report.activeCount, color: 'text-green-700' },
    { label: 'On leave', value: report.onLeaveCount, color: 'text-blue-700' },
    { label: 'Inactive', value: report.inactiveCount, color: 'text-gray-500' },
  ];

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">HR &amp; Headcount</h1>
        <p className="text-sm text-gray-500 mt-1">
          Employee status, department breakdown, and leave statistics.
        </p>
      </div>

      {/* Headcount stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {headcountStats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-2">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* By department */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">By department</h2>
          </div>
          {report.byDepartment.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">No employees yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Department</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Count</th>
                </tr>
              </thead>
              <tbody>
                {report.byDepartment.map((d) => (
                  <tr key={d.department} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-gray-700">{d.department}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Leave stats */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">Leave requests</h2>
          </div>
          <div className="px-5 py-4 grid grid-cols-3 gap-3 border-b border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Pending</p>
              <p className="text-lg font-semibold text-yellow-600">{report.leaveStats.pending}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Approved</p>
              <p className="text-lg font-semibold text-green-700">{report.leaveStats.approved}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Rejected</p>
              <p className="text-lg font-semibold text-red-600">{report.leaveStats.rejected}</p>
            </div>
          </div>
          {report.leaveStats.byType.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">No leave requests yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Leave type</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Count</th>
                </tr>
              </thead>
              <tbody>
                {report.leaveStats.byType.map((t) => (
                  <tr key={t.type} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 capitalize text-gray-700">{t.type}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{t.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent hires */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Recent hires (last 30 days)</h2>
        </div>
        {report.recentHires.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No new hires in the last 30 days.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Department</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody>
              {report.recentHires.map((emp) => {
                const d = emp.data as Record<string, unknown>;
                const name = [d['first_name'], d['last_name']].filter(Boolean).join(' ');
                const joinedAt =
                  typeof emp.createdAt === 'string'
                    ? emp.createdAt.slice(0, 10)
                    : new Date(emp.createdAt).toISOString().slice(0, 10);
                return (
                  <tr key={emp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{name}</td>
                    <td className="px-5 py-3 text-gray-600">{(d['department'] as string) ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{(d['title'] as string) ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{joinedAt}</td>
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
