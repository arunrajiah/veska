import { WorkflowsClient } from './_components.js';
import type { Workflow } from './_components.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
      workflows = Array.isArray(data) ? (data as Workflow[]) : ((data.workflows ?? data.data ?? []) as Workflow[]);
    }
  } catch {
    workflows = [];
  }

  return <WorkflowsClient initialWorkflows={workflows} />;
}
