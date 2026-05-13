import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

const TASK_COLUMNS = ['todo', 'in_progress', 'review', 'done'] as const;

interface ProjectRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
}

interface TaskRecord {
  id: string;
  data: Record<string, unknown>;
}

interface MilestoneRecord {
  id: string;
  data: Record<string, unknown>;
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let project: ProjectRecord | null = null;
  let tasks: TaskRecord[] = [];
  let milestones: MilestoneRecord[] = [];

  try {
    project = await apiFetch<ProjectRecord>(`/api/v1/projects/${params.id}`, tenantId);
  } catch {
    project = null;
  }

  if (project) {
    try {
      const res = await apiFetch<TaskRecord[]>(`/api/v1/projects/tasks?projectId=${params.id}`, tenantId);
      tasks = Array.isArray(res) ? res : [];
    } catch {
      tasks = [];
    }
    try {
      const res = await apiFetch<MilestoneRecord[]>(`/api/v1/projects/milestones?projectId=${params.id}`, tenantId);
      milestones = Array.isArray(res) ? res : [];
    } catch {
      milestones = [];
    }
  }

  if (!project) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500">Project not found.</p>
        <Link href="/dashboard/projects" className="text-sm text-gray-600 hover:text-gray-900 mt-2 inline-block">
          ← Back to projects
        </Link>
      </div>
    );
  }

  const d = project.data;
  const status = (d['status'] as string) ?? 'planning';

  // Group tasks by status
  const tasksByStatus = TASK_COLUMNS.reduce<Record<string, TaskRecord[]>>((acc, col) => {
    acc[col] = tasks.filter((t) => (t.data['status'] as string) === col);
    return acc;
  }, {});

  return (
    <div className="px-8 py-8 max-w-6xl">
      <Link href="/dashboard/projects" className="text-sm text-gray-500 hover:text-gray-900 mb-6 inline-block">
        ← Projects
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-gray-900">{String(d['name'] ?? 'Unnamed project')}</h1>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex gap-4 text-xs text-gray-500">
            {d['owner'] && <span>Owner: {String(d['owner'])}</span>}
            {d['start_date'] && (
              <span>
                {String(d['start_date'])}
                {d['end_date'] && ` → ${String(d['end_date'])}`}
              </span>
            )}
            {typeof d['budget'] === 'number' && (
              <span>
                Budget: ${(d['budget'] as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/dashboard/projects/tasks/new?projectId=${params.id}`}
          className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Plus size={15} /> Add task
        </Link>
      </div>

      {d['description'] && (
        <p className="text-sm text-gray-600 mb-6">{String(d['description'])}</p>
      )}

      {/* Kanban tasks */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Tasks</h2>
        <div className="grid grid-cols-4 gap-4">
          {TASK_COLUMNS.map((col) => {
            const colTasks = tasksByStatus[col] ?? [];
            return (
              <div key={col} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-600 capitalize">{col.replace(/_/g, ' ')}</p>
                  <span className="text-xs text-gray-400">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => {
                    const td = task.data;
                    const priority = (td['priority'] as string) ?? 'medium';
                    return (
                      <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-800 mb-1 leading-snug">
                          {String(td['title'] ?? 'Untitled task')}
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-medium capitalize ${PRIORITY_COLORS[priority] ?? 'text-gray-500'}`}
                          >
                            {priority}
                          </span>
                          {td['assignee'] && (
                            <span className="text-xs text-gray-400">{String(td['assignee'])}</span>
                          )}
                        </div>
                        {td['due_date'] && (
                          <p className="text-xs text-gray-400 mt-1">{String(td['due_date'])}</p>
                        )}
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Milestones</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {milestones.map((milestone, i) => {
              const md = milestone.data;
              const completed = md['completed'] === true;
              return (
                <div
                  key={milestone.id}
                  className={`flex items-center gap-3 px-5 py-3 ${i < milestones.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${completed ? 'bg-green-500' : 'bg-gray-300'}`}
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {String(md['title'] ?? 'Untitled milestone')}
                    </p>
                    {md['description'] && (
                      <p className="text-xs text-gray-500">{String(md['description'])}</p>
                    )}
                  </div>
                  {md['due_date'] && (
                    <p className="text-xs text-gray-400 flex-shrink-0">{String(md['due_date'])}</p>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {completed ? 'Done' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
