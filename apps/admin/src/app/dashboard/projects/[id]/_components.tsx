'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronDown, ChevronRight } from 'lucide-react';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

export interface Task {
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

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-gray-300',
  medium: 'bg-yellow-400',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-yellow-50 text-yellow-700',
  high: 'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const KANBAN_COLS = [
  { key: 'todo', label: 'Todo' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
] as const;

function AddTaskSlideOver({ projectId, open, onClose, onCreated }: { projectId: string; open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      projectId,
    };
    try {
      const res = await fetch(`/api/veska/projects/${projectId}/tasks`, {
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
          <h2 className="text-base font-semibold text-gray-900">Add Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input name="title" required placeholder="Task title"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={3} placeholder="Task description…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select name="status" defaultValue="todo"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select name="priority" defaultValue="medium"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Assignee Name</label>
            <input name="assigneeName" placeholder="Assignee name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
              <input name="dueDate" type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Est. Hours</label>
              <input name="estimatedHours" type="number" min="0" step="0.5" placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Add Task'}
            </button>
            <button type="button" onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskCard({ task, projectId }: { task: Task; projectId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);

  const d = task.data;
  const priority = d?.priority ?? 'medium';

  async function markDone() {
    setMarking(true);
    try {
      await fetch(`/api/veska/projects/${projectId}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ status: 'done' }),
      });
      startTransition(() => router.refresh());
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div
        className="flex items-start gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[priority] ?? 'bg-gray-300'}`} />
        <p className="text-xs font-medium text-gray-800 leading-snug flex-1">{d?.title ?? 'Untitled task'}</p>
        {expanded ? <ChevronDown size={12} className="text-gray-400 flex-shrink-0 mt-0.5" /> : <ChevronRight size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />}
      </div>

      <div className="mt-1.5 ml-4 flex items-center gap-2 text-xs text-gray-400">
        {d?.assigneeName && <span>{d.assigneeName}</span>}
        {d?.dueDate && <span>{fmtDate(d.dueDate)}</span>}
      </div>

      {expanded && (
        <div className="mt-2 ml-4 pt-2 border-t border-gray-100 space-y-1.5">
          {d?.description && <p className="text-xs text-gray-600">{d.description}</p>}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {d?.estimatedHours != null && <span>Est: {d.estimatedHours}h</span>}
            {d?.loggedHours != null && <span>Logged: {d.loggedHours}h</span>}
          </div>
          {d?.status !== 'done' && (
            <button
              onClick={(e) => { e.stopPropagation(); void markDone(); }}
              disabled={marking}
              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {marking ? 'Saving…' : 'Mark Done'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectDetailClient({
  projectId,
  project,
  tasks,
}: {
  projectId: string;
  project: {
    name?: string;
    description?: string;
    status?: string;
    priority?: string;
    startDate?: string;
    dueDate?: string;
    budget?: number;
    spent?: number;
    managerName?: string;
    progress?: number;
    tags?: string[];
  };
  tasks: Task[];
}) {
  const [showAddTask, setShowAddTask] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const status = project.status ?? 'planning';
  const priority = project.priority ?? 'medium';
  const progress = project.progress ?? 0;

  const STATUS_STYLES: Record<string, string> = {
    planning: 'bg-gray-100 text-gray-600',
    active: 'bg-green-50 text-green-700',
    on_hold: 'bg-yellow-50 text-yellow-700',
    completed: 'bg-blue-50 text-blue-700',
    cancelled: 'bg-red-50 text-red-600',
  };

  const PRIORITY_BADGE_MAP: Record<string, string> = {
    low: 'bg-gray-100 text-gray-500',
    medium: 'bg-yellow-50 text-yellow-700',
    high: 'bg-orange-50 text-orange-700',
    critical: 'bg-red-50 text-red-700',
  };

  const tasksByStatus = KANBAN_COLS.reduce<Record<string, Task[]>>((acc, col) => {
    acc[col.key] = tasks.filter((t) => (t.data?.status ?? 'todo') === col.key);
    return acc;
  }, {});

  function usd(v?: number) {
    if (v == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  }

  return (
    <>
      {/* Large progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Progress</span>
          <span className="text-sm font-semibold text-gray-900">{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className="bg-indigo-500 h-3 rounded-full transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Project details */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Project Details</h2>
            {project.description && (
              <p className="text-sm text-gray-600 mb-4">{project.description}</p>
            )}
            <dl className="space-y-2 text-sm">
              {project.startDate && (
                <div className="flex justify-between">
                  <dt className="text-gray-400 text-xs">Start Date</dt>
                  <dd className="text-gray-700 text-xs">{fmtDate(project.startDate)}</dd>
                </div>
              )}
              {project.dueDate && (
                <div className="flex justify-between">
                  <dt className="text-gray-400 text-xs">Due Date</dt>
                  <dd className="text-gray-700 text-xs">{fmtDate(project.dueDate)}</dd>
                </div>
              )}
              {project.budget != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-400 text-xs">Budget</dt>
                  <dd className="text-gray-700 text-xs">{usd(project.spent ?? 0)} / {usd(project.budget)}</dd>
                </div>
              )}
              {project.managerName && (
                <div className="flex justify-between">
                  <dt className="text-gray-400 text-xs">Manager</dt>
                  <dd className="text-gray-700 text-xs">{project.managerName}</dd>
                </div>
              )}
            </dl>
            {project.tags && project.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1">
                {project.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Tasks kanban */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Tasks</h2>
            <button
              onClick={() => setShowAddTask(true)}
              className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            >
              + Add Task
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {KANBAN_COLS.map((col) => {
              const colTasks = tasksByStatus[col.key] ?? [];
              return (
                <div key={col.key} className="bg-gray-50 rounded-xl p-3 min-h-32">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-600">{col.label}</p>
                    <span className="text-xs text-gray-400 bg-white rounded-full px-1.5 py-0.5 border border-gray-200">{colTasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map((task) => (
                      <TaskCard key={task.id} task={task} projectId={projectId} />
                    ))}
                    {colTasks.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AddTaskSlideOver
        projectId={projectId}
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        onCreated={() => startTransition(() => router.refresh())}
      />
    </>
  );
}
