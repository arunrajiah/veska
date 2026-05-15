import { WorkflowsClient } from './_components.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Workflow {
  id: string;
  name: string;
  status?: string;
  enabled?: boolean;
  trigger?: Record<string, unknown>;
  conditions?: unknown[];
  actions?: unknown[];
  lastRunAt?: string;
  createdAt?: string;
}

export default async function WorkflowsPage() {
  let workflows: Workflow[] = [];
  try {
    const res = await fetch(`${API_BASE}/workflows?limit=50`, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'demo-tenant',
      },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      workflows = Array.isArray(data) ? data : (data.workflows ?? data.data ?? []);
    }
  } catch {
    workflows = [];
  }

  return <WorkflowsClient initialWorkflows={workflows} />;
}
