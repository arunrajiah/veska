import { apiFetch } from '@/lib/api.js';
import { ContractDetailClient } from './_components.js';

interface ContractEvent {
  id: string;
  type?: string;
  actor?: string;
  notes?: string;
  createdAt?: string;
}

export interface ContractDetail {
  id: string;
  title?: string;
  type?: string;
  partyA?: string;
  partyB?: string;
  partyBEmail?: string;
  value?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  autoRenew?: boolean;
  renewalNoticeDays?: number;
  tags?: string[];
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  events?: ContractEvent[];
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let contract: ContractDetail | null = null;
  let events: ContractEvent[] = [];

  try {
    contract = await apiFetch<ContractDetail>(`/contracts/${id}`, tenantId);
  } catch {
    contract = null;
  }

  try {
    const res = await apiFetch<ContractEvent[]>(`/contracts/${id}/events`, tenantId);
    events = Array.isArray(res) ? res : contract?.events ?? [];
  } catch {
    events = contract?.events ?? [];
  }

  if (!contract) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500 text-sm">Contract not found.</p>
        <a href="/dashboard/contracts" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to contracts
        </a>
      </div>
    );
  }

  return <ContractDetailClient contract={contract} events={events} tenantId={tenantId} />;
}
