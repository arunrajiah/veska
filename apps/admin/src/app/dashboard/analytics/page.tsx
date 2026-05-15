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
  let summary: AnalyticsSummary = {};

  try {
    const res = await fetch(`${API_BASE}/analytics/summary`, {
      cache: 'no-store',
      headers: { 'x-tenant-id': 'demo-tenant' },
    });
    if (res.ok) {
      summary = (await res.json()) as AnalyticsSummary;
    }
  } catch {
    // fall through — component handles empty state gracefully
  }

  return <AnalyticsClient summary={summary} />;
}
