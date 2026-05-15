import { apiFetch } from '@/lib/api.js';
import { ContractsPageClient } from './_components.js';

export interface Contract {
  id: string;
  data: {
    title?: string;
    partyName?: string;
    partyEmail?: string;
    type?: 'vendor' | 'customer' | 'employee' | 'nda' | 'service';
    status?: 'draft' | 'review' | 'active' | 'expired' | 'terminated';
    value?: number;
    startDate?: string;
    endDate?: string;
    autoRenew?: boolean;
    notes?: string;
    signedDate?: string;
  };
}

export default async function ContractsPage() {
  const tenantId = 'demo-tenant';

  let contracts: Contract[] = [];

  try {
    const res = await apiFetch<{ data: Contract[] } | Contract[]>('/api/v1/contracts?limit=50', tenantId);
    contracts = Array.isArray(res) ? res : (res.data ?? []);
  } catch {
    contracts = [];
  }

  return <ContractsPageClient contracts={contracts} />;
}
