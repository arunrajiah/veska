'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

export interface Project {
  id: string;
  data: {
    name?: string;
    description?: string;
    status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    startDate?: string;
    dueDate?: string;
    budget?: number;
    spent?: number;
    managerId?: string;
    managerName?: string;
    progress?: number;
    tags?: string[];
  };
}

const STATUS_STYLES: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-600',
  active: 'bg-green-50 text-green-700',
  on_hold: 'bg-yellow-50 text-yellow-700',
  completed: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-600',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-yellow-50 text-yellow-700',
  high: 'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function usd(v?: number) {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${clamped}%` }} />
    </div>
  );
}

function NewProjectSlideOver({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      name: fd.get('name'),
      description: fd.get('description') || undefined,
      startDate: fd.get('startDate') || undefined,
      dueDate: fd.get('dueDate') || undefined,
      budget: fd.get('budget') ? Number(fd.get('budget')) : undefined,
      priority: fd.get('priority'),
      managerName: fd.get('managerName') || undefined,
      status: 'planning',
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/projects`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
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
          <h2 className="text-base font-semibold text-gray-900">New Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input name="name" required placeholder="Project name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={3} placeholder="Project description…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input name="startDate" type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
              <input name="dueDate" type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Budget</label>
            <input name="budget" type="number" min="0" placeholder="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
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
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Manager Name</label>
            <input name="managerName" placeholder="Manager name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create Project'}
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

const TABS = ['All', 'Active', 'Planning', 'On Hold', 'Completed'] as const;
type Tab = typeof TABS[number];

const TAB_STATUS_MAP: Record<Tab, string | null> = {
  All: null,
  Active: 'active',
  Planning: 'planning',
  'On Hold': 'on_hold',
  Completed: 'completed',
};

export function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('All');

  const today = new Date().toISOString().slice(0, 10);

  const totalProjects = initialProjects.length;
  const activeCount = initialProjects.filter((p) => p.data?.status === 'active').length;
  const completedCount = initialProjects.filter((p) => p.data?.status === 'completed').length;
  const overdueCount = initialProjects.filter((p) => {
    const due = p.data?.dueDate;
    const status = p.data?.status;
    return due && due < today && status !== 'completed' && status !== 'cancelled';
  }).length;

  const filterStatus = TAB_STATUS_MAP[activeTab];
  const filtered = filterStatus ? initialProjects.filter((p) => p.data?.status === filterStatus) : initialProjects;

  function handleCreated() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalProjects} project{totalProjects !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Total Projects</p>
          <p className="text-2xl font-semibold text-gray-900">{totalProjects}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Active</p>
          <p className="text-2xl font-semibold text-green-700">{activeCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Completed</p>
          <p className="text-2xl font-semibold text-blue-700">{completedCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Overdue</p>
          <p className="text-2xl font-semibold text-red-600">{overdueCount}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No projects found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const d = project.data;
            const status = d?.status ?? 'planning';
            const priority = d?.priority ?? 'medium';
            const progress = d?.progress ?? 0;
            const isOverdue = d?.dueDate && d.dueDate < today && status !== 'completed' && status !== 'cancelled';

            return (
              <div
                key={project.id}
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1">
                    {d?.name ?? 'Unnamed project'}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 capitalize ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {status.replace(/_/g, ' ')}
                  </span>
                </div>

                {d?.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{d.description}</p>
                )}

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Progress</span>
                    <span className="text-xs font-medium text-gray-600">{progress}%</span>
                  </div>
                  <ProgressBar pct={progress} />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span className={`px-1.5 py-0.5 rounded font-medium ${PRIORITY_STYLES[priority] ?? 'bg-gray-100 text-gray-500'}`}>
                    {priority}
                  </span>
                  {isOverdue && (
                    <span className="text-red-500 font-medium">Overdue</span>
                  )}
                </div>

                <div className="space-y-1 text-xs text-gray-400">
                  {d?.dueDate && (
                    <p>Due: <span className={`${isOverdue ? 'text-red-500' : 'text-gray-600'}`}>{fmtDate(d.dueDate)}</span></p>
                  )}
                  {d?.managerName && (
                    <p>Manager: <span className="text-gray-600">{d.managerName}</span></p>
                  )}
                  {d?.budget != null && (
                    <p>Budget: <span className="text-gray-600">{usd(d.spent ?? 0)} / {usd(d.budget)}</span></p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewProjectSlideOver open={showNew} onClose={() => setShowNew(false)} onCreated={handleCreated} />
    </div>
  );
}
