'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Folder, FolderOpen, CheckCircle2, AlertCircle, Plus, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Project {
  id: string;
  data: {
    name?: string;
    description?: string;
    status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    startDate?: string;
    dueDate?: string;
    budget?: number;
    spent?: number;
    managerId?: string;
    managerName?: string;
    progress?: number;
    memberCount?: number;
    tasksDone?: number;
    tasksTotal?: number;
    tags?: string[];
  };
}

const STATUS_STYLES: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-600',
  active: 'bg-green-50 text-green-700',
  on_hold: 'bg-yellow-50 text-yellow-700',
  completed: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-600',
  archived: 'bg-gray-100 text-gray-500',
};

const TABS = ['All', 'Active', 'Completed', 'Archived'] as const;
type Tab = (typeof TABS)[number];

const TAB_STATUS_MAP: Record<Tab, string | null> = {
  All: null,
  Active: 'active',
  Completed: 'completed',
  Archived: 'archived',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clamped}% complete`}
      className="w-full bg-gray-100 rounded-full h-1.5"
    >
      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${clamped}%` }} />
    </div>
  );
}

function MemberInitials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const initials = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold -ml-1 first:ml-0 border border-white">
      {initials.toUpperCase()}
    </span>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const t = useTranslations('projects');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/veska/projects?limit=50');
        if (res.ok) {
          const json = (await res.json()) as { data?: Project[] } | Project[];
          const data = Array.isArray(json) ? json : (json.data ?? []);
          setProjects(data);
        }
      } catch {
        // leave empty
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const totalProjects = projects.length;
  const activeCount = projects.filter((p) => p.data.status === 'active').length;
  const completedCount = projects.filter((p) => p.data.status === 'completed').length;
  const overdueCount = projects.filter((p) => {
    const due = p.data.dueDate;
    const status = p.data.status;
    return (
      due &&
      due < today &&
      status !== 'completed' &&
      status !== 'cancelled' &&
      status !== 'archived'
    );
  }).length;

  const filterStatus = TAB_STATUS_MAP[activeTab];
  const filtered = filterStatus ? projects.filter((p) => p.data.status === filterStatus) : projects;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage all your projects</p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} />
          {t('newProject')}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Folder size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('title')}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-0.5">{totalProjects}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="p-2 bg-green-50 rounded-lg">
            <FolderOpen size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('status.active')}</p>
            <p className="text-2xl font-semibold text-green-700 mt-0.5">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <CheckCircle2 size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('status.completed')}</p>
            <p className="text-2xl font-semibold text-blue-700 mt-0.5">{completedCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="p-2 bg-red-50 rounded-lg">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Overdue Tasks</p>
            <p className="text-2xl font-semibold text-red-600 mt-0.5">{overdueCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Project filter tabs"
        className="flex gap-1 border-b border-gray-200 overflow-x-auto"
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls="projects-tab-panel"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div id="projects-tab-panel" role="tabpanel" aria-label={`${activeTab} projects`}>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading projects…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <Folder size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-600">
              {totalProjects === 0 ? 'No projects yet' : `No ${activeTab.toLowerCase()} projects`}
            </p>
            {totalProjects === 0 && (
              <>
                <p className="text-xs text-gray-400 mt-1 mb-4">
                  Organize your work and collaborate with your team.
                </p>
                <Link
                  href="/dashboard/projects/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={14} />
                  Create your first project
                </Link>
              </>
            )}
          </div>
        ) : (
          <div aria-live="polite" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const d = project.data;
              const status = d.status ?? 'planning';
              const progress = d.progress ?? 0;
              const isOverdue =
                d.dueDate &&
                d.dueDate < today &&
                status !== 'completed' &&
                status !== 'cancelled' &&
                status !== 'archived';

              return (
                <div
                  key={project.id}
                  role="article"
                  aria-label={d.name ?? 'Untitled project'}
                  tabIndex={0}
                  onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/dashboard/projects/${project.id}`);
                    }
                  }}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1">
                      {d.name ?? 'Untitled project'}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 capitalize ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {d.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{d.description}</p>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {d.tasksDone ?? 0}/{d.tasksTotal ?? 0} tasks
                      </span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <ProgressBar pct={progress} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {d.managerName && <MemberInitials name={d.managerName} />}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      {isOverdue ? (
                        <span className="text-red-500 font-medium">Overdue</span>
                      ) : d.dueDate ? (
                        <span>Due {fmtDate(d.dueDate)}</span>
                      ) : null}
                      <ChevronRight size={13} className="text-gray-300" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
