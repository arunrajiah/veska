import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { ContractDetailPageClient } from './_components.js';

export interface ContractDetail {
  id: string;
  data: {
    title?: string;
    partyName?: string;
    partyEmail?: string;
    type?: string;
    status?: string;
    value?: number;
    startDate?: string;
    endDate?: string;
    autoRenew?: boolean;
    notes?: string;
    signedDate?: string;
  };
}

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let contract: ContractDetail | null = null;

  try {
    contract = await apiFetch<ContractDetail>(`/api/v1/contracts/${id}`, tenantId);
  } catch {
    contract = null;
  }

  if (!contract) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500 text-sm">Contract not found.</p>
        <Link
          href="/dashboard/contracts"
          className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to contracts
        </Link>
      </div>
    );
  }

  return <ContractDetailPageClient contract={contract} />;
}
