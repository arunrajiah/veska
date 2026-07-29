import { ReportsClient } from './_components.js';

const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Report {
  id: string;
  name: string;
  entityType: string;
  description?: string;
  createdAt?: string;
  config?: Record<string, unknown>;
}

export default async function ReportsPage() {
  let reports: Report[] = [];

  try {
    const res = await fetch(`${API_BASE}/reports/saved`, {
      cache: 'no-store',
      headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
    });
    if (res.ok) {
      const json = (await res.json()) as Report[] | { results?: Report[]; data?: Report[] };
      reports = Array.isArray(json)
        ? json
        : ((json as { results?: Report[] }).results ?? (json as { data?: Report[] }).data ?? []);
    }
  } catch {
    // fall through
  }

  return <ReportsClient reports={reports} />;
}
