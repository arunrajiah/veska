import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';
import { BudgetsClient } from './_components.js';

export interface Budget {
  id: string;
  name: string;
  description?: string;
  fiscalYear: number;
  period: 'annual' | 'quarterly' | 'monthly';
  quarter?: number;
  month?: number;
  currency: string;
  status: 'draft' | 'approved' | 'active' | 'closed';
  createdAt: string;
  updatedAt?: string;
  // legacy shape fallback
  entityType?: string;
  data?: Record<string, unknown>;
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalActuals: number;
  utilizationPct: number;
  activeBudgets: Array<{ id: string; name: string }>;
}

export default async function BudgetsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let budgets: Budget[] = [];
  let summary: BudgetSummary = {
    totalBudgeted: 0,
    totalActuals: 0,
    utilizationPct: 0,
    activeBudgets: [],
  };

  try {
    const res = await apiFetch<Budget[] | { data: Budget[] }>('/api/v1/budgets', tenantId);
    budgets = Array.isArray(res) ? res : (res as { data: Budget[] }).data ?? [];
  } catch {
    budgets = [];
  }

  try {
    const res = await apiFetch<BudgetSummary>('/api/v1/budgets/summary', tenantId);
    summary = res;
  } catch {
    // keep defaults
  }

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Budgets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{budgets.length} budget{budgets.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/dashboard/budgets/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New budget
        </Link>
      </div>

      <BudgetsClient budgets={budgets} summary={summary} />
    </div>
  );
}
