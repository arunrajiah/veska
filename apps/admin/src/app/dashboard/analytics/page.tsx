import { cookies } from 'next/headers';
import { AnalyticsClient } from './_components.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface AnalyticsSummary {
  revenue30d?: number;
  expenses30d?: number;
  headcount?: number;
  openTickets?: number;
  pipelineValue?: number;
  budgetUtilPct?: number;
}

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const tenantId = cookieStore.get('veska_tenant')?.value ?? process.env.VESKA_TENANT_ID ?? 'demo-tenant';
  const sessionToken = cookieStore.get('veska_session')?.value;
  const identityId = cookieStore.get('veska_identity')?.value ?? cookieStore.get('veska_user')?.value ?? 'system';

  let summary: AnalyticsSummary = {};

  try {
    const res = await fetch(`${API_BASE}/api/v1/analytics/summary`, {
      cache: 'no-store',
      headers: {
        'X-Veska-Tenant-Id': tenantId,
        'X-Veska-Identity-Id': identityId,
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
    });
    if (res.ok) {
      summary = (await res.json()) as AnalyticsSummary;
    }
  } catch {
    // fall through — component handles empty state gracefully
  }

  return <AnalyticsClient summary={summary} />;
}
