import { apiFetch } from '@/lib/api.js';
import { DealsTable } from './_components.js';

interface DealRecord {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
}

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export default async function DealsPage() {
  let deals: DealRecord[] = [];
  try {
    const res = await apiFetch<{ data: DealRecord[] } | DealRecord[]>(
      '/api/v1/crm/deals?limit=50',
      TENANT_ID,
    );
    deals = Array.isArray(res) ? res : (res as { data: DealRecord[] }).data ?? [];
  } catch {
    deals = [];
  }

  return (
    <div className="px-4 py-8 max-w-6xl">
      <DealsTable initialDeals={deals} />
    </div>
  );
}
