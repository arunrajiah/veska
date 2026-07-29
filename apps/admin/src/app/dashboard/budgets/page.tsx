import { apiFetch } from '@/lib/api.js';
import { BudgetsClient } from './_components.js';

export interface Budget {
  id: string;
  name?: string;
  description?: string;
  fiscalYear?: number;
  period?: 'annual' | 'quarterly' | 'monthly';
  quarter?: number;
  month?: number;
  currency?: string;
  status?: 'draft' | 'approved' | 'active' | 'closed';
  createdAt?: string;
  updatedAt?: string;
  // generic entity shape fallback
  entityType?: string;
  data?: {
    name?: string;
    category?: string;
    period?: string;
    totalBudget?: number;
    spent?: number;
    status?: string;
    currency?: string;
    year?: number;
    quarter?: number;
    month?: number;
    [key: string]: unknown;
  };
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalActuals: number;
  utilizationPct: number;
  activeBudgets: Array<{ id: string; name: string }>;
}

async function fetchBudgets(tenantId: string): Promise<Budget[]> {
  try {
    const res = await apiFetch<Budget[] | { data: Budget[] }>('/api/v1/budgets?limit=20', tenantId);
    return Array.isArray(res) ? res : ((res as { data: Budget[] }).data ?? []);
  } catch {
    return [];
  }
}

async function fetchSummary(tenantId: string): Promise<BudgetSummary> {
  try {
    return await apiFetch<BudgetSummary>('/api/v1/budgets/summary', tenantId);
  } catch {
    return { totalBudgeted: 0, totalActuals: 0, utilizationPct: 0, activeBudgets: [] };
  }
}

export default async function BudgetsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';
  const [budgets, summary] = await Promise.all([fetchBudgets(tenantId), fetchSummary(tenantId)]);

  // Compute derived summary from budget data if API didn't provide it
  const derivedSummary: BudgetSummary = {
    totalBudgeted:
      summary.totalBudgeted ||
      budgets.reduce((s, b) => {
        const v = b.data?.totalBudget ?? 0;
        return s + (typeof v === 'number' ? v : parseFloat(String(v)) || 0);
      }, 0),
    totalActuals:
      summary.totalActuals ||
      budgets.reduce((s, b) => {
        const v = b.data?.spent ?? 0;
        return s + (typeof v === 'number' ? v : parseFloat(String(v)) || 0);
      }, 0),
    utilizationPct: summary.utilizationPct ?? 0,
    activeBudgets: summary.activeBudgets ?? [],
  };

  return <BudgetsClient budgets={budgets} summary={derivedSummary} tenantId={tenantId} />;
}
