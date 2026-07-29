'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

interface Task {
  id: string;
  data: {
    title?: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'review' | 'done';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    assigneeId?: string;
    assigneeName?: string;
    dueDate?: string;
    estimatedHours?: number;
    loggedHours?: number;
    projectId?: string;
  };
}

interface Project {
  id: string;
  data: { name?: string };
}

const STATUS_STYLES: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-50 text-blue-700',
  review: 'bg-purple-50 text-purple-700',
  done: 'bg-green-50 text-green-700',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-yellow-50 text-yellow-700',
  high: 'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700',
};

const TABS = ['All', 'Todo', 'In Progress', 'Review', 'Done'] as const;
type Tab = (typeof TABS)[number];
const TAB_STATUS: Record<Tab, string | null> = {
  All: null,
  Todo: 'todo',
  'In Progress': 'in_progress',
  Review: 'review',
  Done: 'done',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function NewTaskSlideOver({
  open,
  onClose,
  onCreated,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  projects: Project[];
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? '');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProjectId) {
      setError('Please select a project');
      return;
    }
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      title: fd.get('title'),
      description: fd.get('description') || undefined,
      status: fd.get('status') ?? 'todo',
      priority: fd.get('priority') ?? 'medium',
      assigneeName: fd.get('assigneeName') || undefined,
      dueDate: fd.get('dueDate') || undefined,
      estimatedHours: fd.get('estimatedHours') ? Number(fd.get('estimatedHours')) : undefined,
      projectId: selectedProjectId,
    };
    try {
      const res = await fetch(`/api/veska/projects/${selectedProjectId}/tasks`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Project *</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            >
              {projects.length === 0 && <option value="">No projects available</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.data?.name ?? p.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input
              name="title"
              required
              placeholder="Task title"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Task description…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                defaultValue="todo"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select
                name="priority"
                defaultValue="medium"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Assignee Name</label>
            <input
              name="assigneeName"
              placeholder="Assignee name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
              <input
                name="dueDate"
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Est. Hours</label>
              <input
                name="estimatedHours"
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating…' : 'Add Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AllTasksClient({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [showNew, setShowNew] = useState(false);

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.data?.name ?? p.id]));

  const total = tasks.length;
  const todo = tasks.filter((t) => (t.data?.status ?? 'todo') === 'todo').length;
  const inProgress = tasks.filter((t) => t.data?.status === 'in_progress').length;
  const done = tasks.filter((t) => t.data?.status === 'done').length;

  const filterStatus = TAB_STATUS[activeTab];
  const filtered = filterStatus
    ? tasks.filter((t) => (t.data?.status ?? 'todo') === filterStatus)
    : tasks;

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} task{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + New Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Total
          </p>
          <p className="text-2xl font-semibold text-gray-900">{total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Todo</p>
          <p className="text-2xl font-semibold text-gray-600">{todo}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            In Progress
          </p>
          <p className="text-2xl font-semibold text-blue-700">{inProgress}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Done</p>
          <p className="text-2xl font-semibold text-green-700">{done}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No tasks found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Project</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Assignee</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Priority</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Due Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Hours</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const d = task.data;
                const status = d?.status ?? 'todo';
                const priority = d?.priority ?? 'medium';
                const projectName = d?.projectId
                  ? (projectMap[d.projectId] ?? d.projectId.slice(0, 8) + '…')
                  : '—';

                return (
                  <tr
                    key={task.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{d?.title ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {d?.projectId ? (
                        <a
                          href={`/dashboard/projects/${d.projectId}`}
                          className="hover:text-gray-900"
                        >
                          {projectName}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{d?.assigneeName ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_STYLES[priority] ?? 'bg-gray-100 text-gray-500'}`}
                      >
                        {priority}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(d?.dueDate)}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {d?.estimatedHours != null ? `${d.estimatedHours}h est` : ''}
                      {d?.loggedHours != null ? ` / ${d.loggedHours}h logged` : ''}
                      {d?.estimatedHours == null && d?.loggedHours == null ? '—' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <NewTaskSlideOver
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={() => startTransition(() => router.refresh())}
        projects={projects}
      />
    </div>
  );
}
