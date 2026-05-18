import { apiFetch } from '@/lib/api.js';
import { TimeEntriesClient } from './_components.js';

interface TimeEntry {
  id: string;
  data: {
    employeeId?: string;
    employeeName?: string;
    projectId?: string;
    projectName?: string;
    taskId?: string;
    date?: string;
    hours?: number;
    description?: string;
    billable?: boolean;
    status?: 'pending' | 'approved';
  };
}

export default async function TimeEntriesPage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let entries: TimeEntry[] = [];
  try {
    const res = await apiFetch<{ data: TimeEntry[] }>('/api/v1/time-tracking?limit=100', tenantId);
    entries = Array.isArray(res?.data) ? res.data : [];
  } catch {
    try {
      const res = await apiFetch<{ data: TimeEntry[] }>('/api/v1/time?limit=50', tenantId);
      entries = Array.isArray(res?.data) ? res.data : [];
    } catch {
      entries = [];
    }
  }

  return <TimeEntriesClient entries={entries} />;
}
