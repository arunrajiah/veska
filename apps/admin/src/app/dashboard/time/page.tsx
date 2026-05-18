import { apiFetch } from '@/lib/api.js';
import { TimeTrackingPageClient } from './_components.js';
import type { TimeEntry } from './_components.js';

export default async function TimeTrackingPage() {
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

  return <TimeTrackingPageClient entries={entries} />;
}
