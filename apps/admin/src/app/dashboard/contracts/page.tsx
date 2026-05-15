import { apiFetch } from '@/lib/api.js';
import { ContractsClient } from './_components.js';

export interface Contract {
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
}

export interface ContractSummary {
  byStatus?: Record<string, number>;
  totalValue?: number;
  activeCount?: number;
  expiringCount?: number;
}

export default async function ContractsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let contracts: Contract[] = [];
  let summary: ContractSummary = {};

  try {
    const res = await apiFetch<Contract[]>('/contracts', tenantId);
    contracts = Array.isArray(res) ? res : [];
  } catch {
    contracts = [];
  }

  try {
    const res = await apiFetch<ContractSummary>('/contracts/summary', tenantId);
    summary = res ?? {};
  } catch {
    summary = {};
  }

  return <ContractsClient contracts={contracts} summary={summary} />;
}
