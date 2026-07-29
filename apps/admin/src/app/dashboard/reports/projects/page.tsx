import { apiFetch } from '@/lib/api.js';

interface ProjectProgress {
  projectId: string;
  name: string;
  status: string;
  taskCount: number;
  completedTasks: number;
  progressPct: number;
}

interface ProjectsReport {
  totalProjects: number;
  byStatus: {
    planning: number;
    active: number;
    on_hold: number;
    completed: number;
  };
  taskStats: {
    total: number;
    todo: number;
    in_progress: number;
    review: number;
    done: number;
  };
  completionRate: number;
  overdueTaskCount: number;
  projectsWithProgress: ProjectProgress[];
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-600',
  active: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

export default async function ProjectsReportPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let report: ProjectsReport = {
    totalProjects: 0,
    byStatus: { planning: 0, active: 0, on_hold: 0, completed: 0 },
    taskStats: { total: 0, todo: 0, in_progress: 0, review: 0, done: 0 },
    completionRate: 0,
    overdueTaskCount: 0,
    projectsWithProgress: [],
  };

  try {
    report = await apiFetch<ProjectsReport>('/api/v1/reports/projects', tenantId);
  } catch {
    // fall through to empty state
  }

  const topStats = [
    { label: 'Total projects', value: report.totalProjects.toString(), color: 'text-gray-900' },
    { label: 'Active', value: report.byStatus.active.toString(), color: 'text-blue-700' },
    { label: 'Completed', value: report.byStatus.completed.toString(), color: 'text-green-700' },
    { label: 'Overdue tasks', value: report.overdueTaskCount.toString(), color: 'text-red-600' },
  ];

  const completionPct = report.completionRate.toFixed(1);
  const doneCount = report.taskStats.done;
  const totalTasks = report.taskStats.total;

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Project Status</h1>
        <p className="text-sm text-gray-500 mt-1">
          Project pipeline, task completion rates, and overdue tasks.
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {topStats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-2">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Task completion overview */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-900">Overall task completion</h2>
          <span className="text-sm font-semibold text-gray-700">
            {doneCount} / {totalTasks} tasks done ({completionPct}%)
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4">
          <div
            className="bg-green-500 h-2.5 rounded-full transition-all"
            style={{ width: `${Math.min(report.completionRate, 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { label: 'To do', value: report.taskStats.todo, color: 'text-gray-600' },
            { label: 'In progress', value: report.taskStats.in_progress, color: 'text-blue-600' },
            { label: 'In review', value: report.taskStats.review, color: 'text-yellow-600' },
            { label: 'Done', value: report.taskStats.done, color: 'text-green-600' },
          ].map((t) => (
            <div key={t.label}>
              <p className={`text-lg font-semibold ${t.color}`}>{t.value}</p>
              <p className="text-xs text-gray-500">{t.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Projects with progress */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Projects with progress</h2>
        </div>
        {report.projectsWithProgress.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No projects yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Tasks</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 w-48">Progress</th>
              </tr>
            </thead>
            <tbody>
              {report.projectsWithProgress.map((p) => (
                <tr
                  key={p.projectId}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                >
                  <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">
                    {p.completedTasks}/{p.taskCount}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(p.progressPct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">
                        {p.progressPct.toFixed(1)}%
                      </span>
                    </div>
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
