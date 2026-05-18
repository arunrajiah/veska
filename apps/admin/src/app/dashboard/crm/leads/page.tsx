import { apiFetch } from '@/lib/api.js';
import { LeadsTable } from './_components.js';

interface LeadRecord {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
}

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export default async function LeadsPage() {
  let leads: LeadRecord[] = [];
  try {
    const res = await apiFetch<{ data: LeadRecord[] } | LeadRecord[]>(
      '/api/v1/crm/leads?limit=50',
      TENANT_ID,
    );
    leads = Array.isArray(res) ? res : (res as { data: LeadRecord[] }).data ?? [];
  } catch {
    leads = [];
  }

  return (
    <div className="px-4 py-8 max-w-6xl">
      <LeadsTable initialLeads={leads} />
    </div>
  );
}
