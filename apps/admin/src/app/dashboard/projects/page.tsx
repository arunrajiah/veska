import { apiFetch } from '@/lib/api.js';
import { ProjectsClient } from './_components.js';
import type { Project } from './_components.js';

export default async function ProjectsPage() {
  const tenantId = 'demo-tenant';

  let projects: Project[] = [];
  try {
    const res = await apiFetch<{ data: Project[] }>('/api/v1/projects?limit=50', tenantId);
    projects = Array.isArray(res?.data) ? res.data : [];
  } catch {
    projects = [];
  }

  return <ProjectsClient initialProjects={projects} />;
}
