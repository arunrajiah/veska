import { apiFetch } from '@/lib/api.js';
import { GRNClient } from './_components.js';
import type { GRN } from './_components.js';

export default async function GRNListPage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let grns: GRN[] = [];
  try {
    const res = await apiFetch<{ data: GRN[] } | GRN[]>('/api/v1/grn?limit=50', tenantId);
    grns = Array.isArray(res) ? res : (res.data ?? []);
  } catch {
    grns = [];
  }

  return <GRNClient grns={grns} />;
}
