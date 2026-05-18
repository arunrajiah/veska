import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { ProjectDetailClient } from './_components.js';
import type { Task } from './_components.js';

interface Project {
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

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
  const { id } = await params;

  let project: Project | null = null;
  let tasks: Task[] = [];

  try {
    project = await apiFetch<Project>(`/api/v1/projects/${id}`, tenantId);
  } catch {
    project = null;
  }

  if (project) {
    try {
      const res = await apiFetch<{ data: Task[] }>(`/api/v1/projects/${id}/tasks?limit=100`, tenantId);
      tasks = Array.isArray(res?.data) ? res.data : [];
    } catch {
      tasks = [];
    }
  }

  if (!project) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500 text-sm">Project not found.</p>
        <Link href="/dashboard/projects" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to projects
        </Link>
      </div>
    );
  }

  const d = project.data;
  const status = d?.status ?? 'planning';
  const priority = d?.priority ?? 'medium';

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-4">
        <Link href="/dashboard/projects" className="text-xs text-gray-400 hover:text-gray-700">
          ← Projects
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-gray-900">{d?.name ?? 'Unnamed project'}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
              {status.replace(/_/g, ' ')}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${PRIORITY_STYLES[priority] ?? 'bg-gray-100 text-gray-500'}`}>
              {priority}
            </span>
          </div>
        </div>
      </div>

      <ProjectDetailClient
        projectId={id}
        project={Object.fromEntries(
          Object.entries({
            name: d?.name,
            description: d?.description,
            status: d?.status,
            priority: d?.priority,
            startDate: d?.startDate,
            dueDate: d?.dueDate,
            budget: d?.budget,
            spent: d?.spent,
            managerName: d?.managerName,
            progress: d?.progress,
            tags: d?.tags,
          }).filter(([, v]) => v !== undefined)
        ) as {
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
        }}
        tasks={tasks}
      />
    </div>
  );
}
