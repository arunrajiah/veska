import { apiFetch } from '@/lib/api.js';
import { PayrollRunsClient } from './_components.js';
import type { PayrollRun } from './_components.js';

export default async function PayrollRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const tenantId = 'demo-tenant';

  let runs: PayrollRun[] = [];
  try {
    const res = await apiFetch<{ data: PayrollRun[] }>('/api/v1/payroll/runs?limit=20', tenantId);
    runs = Array.isArray(res?.data) ? res.data : [];
  } catch {
    runs = [];
  }

  return <PayrollRunsClient initialRuns={runs} />;
}
