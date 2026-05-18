import { ReportDetailClient } from './_components.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ReportConfig {
  metrics?: Array<{ field: string; aggregation: string; label: string }>;
  filters?: Array<{ field: string; operator: string; value: string }>;
  groupBy?: string;
  dateRange?: { field: string; from: string; to: string };
}

interface Report {
  id: string;
  name: string;
  entityType: string;
  description?: string;
  createdAt?: string;
  config?: ReportConfig;
}

interface Schedule {
  id: string;
  cron: string;
  recipients: string[];
  createdAt?: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params;

  let report: Report = {
    id,
    name: 'Report',
    entityType: 'invoice',
  };

  let schedules: Schedule[] = [];

  try {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      cache: 'no-store',
      headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
    });
    if (res.ok) {
      report = (await res.json()) as Report;
    }
  } catch {
    // fall through
  }

  try {
    const res = await fetch(`${API_BASE}/reports/${id}/schedules`, {
      cache: 'no-store',
      headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
    });
    if (res.ok) {
      const json = await res.json() as Schedule[] | { results?: Schedule[] };
      schedules = Array.isArray(json) ? json : (json.results ?? []);
    }
  } catch {
    // fall through
  }

  return <ReportDetailClient report={report} initialSchedules={schedules} />;
}
