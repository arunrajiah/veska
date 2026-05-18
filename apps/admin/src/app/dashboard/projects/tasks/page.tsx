import { apiFetch } from '@/lib/api.js';
import { AllTasksClient } from './_components.js';

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

export default async function TasksPage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let tasks: Task[] = [];
  let projects: Project[] = [];

  try {
    const res = await apiFetch<{ data: Project[] }>('/api/v1/projects?limit=50', tenantId);
    projects = Array.isArray(res?.data) ? res.data : [];
  } catch {
    projects = [];
  }

  // Fetch tasks across all projects
  const taskResults = await Promise.allSettled(
    projects.slice(0, 10).map((p) =>
      apiFetch<{ data: Task[] }>(`/api/v1/projects/${p.id}/tasks?limit=100`, tenantId)
    )
  );

  for (const result of taskResults) {
    if (result.status === 'fulfilled') {
      const t = Array.isArray(result.value?.data) ? result.value.data : [];
      tasks.push(...t);
    }
  }

  return <AllTasksClient tasks={tasks} projects={projects} />;
}
