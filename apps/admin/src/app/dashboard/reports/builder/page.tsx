import { ReportBuilderClient } from './_components.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface SavedReport {
  id: string;
  name: string;
  description?: string;
  config?: Record<string, unknown>;
  createdAt?: string;
}

export default async function ReportBuilderPage() {
  let savedReports: SavedReport[] = [];

  try {
    const res = await fetch(`${API_BASE}/reports/saved`, {
      cache: 'no-store',
      headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' },
    });
    if (res.ok) {
      const json = (await res.json()) as SavedReport[] | { results?: SavedReport[] };
      savedReports = Array.isArray(json) ? json : (json.results ?? []);
    }
  } catch {
    // fall through
  }

  return <ReportBuilderClient initialSavedReports={savedReports} />;
}
