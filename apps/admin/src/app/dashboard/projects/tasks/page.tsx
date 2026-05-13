import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

const STATUS_COLORS: Record<string, string> = {
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

interface TaskRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export default async function TasksPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: TaskRecord[] = [];
  try {
    const res = await apiFetch<TaskRecord[]>('/api/v1/projects/tasks', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} tasks</p>
        </div>
        <Link
          href="/dashboard/projects/tasks/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New task
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No tasks yet.</p>
          <Link
            href="/dashboard/projects/tasks/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Create first task
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Project</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Assignee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Due date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                const status = (d['status'] as string) ?? 'todo';
                const priority = (d['priority'] as string) ?? 'medium';
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{String(d['title'] ?? '—')}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {d['project_id'] ? (
                        <Link
                          href={`/dashboard/projects/${String(d['project_id'])}`}
                          className="hover:text-gray-900"
                        >
                          {String(d['project_id']).slice(0, 8)}…
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{String(d['assignee'] ?? '—')}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium capitalize ${PRIORITY_COLORS[priority] ?? 'text-gray-500'}`}>
                        {priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{String(d['due_date'] ?? '—')}</td>
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
