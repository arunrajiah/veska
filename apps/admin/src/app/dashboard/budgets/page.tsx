import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

interface BudgetRecord {
  id: string;
  entityType: string;
  data: {
    name?: string;
    period?: string;
    year?: number;
    month?: number;
    quarter?: number;
    department_id?: string;
    department_name?: string;
    category?: string;
    allocated_amount?: number;
    currency?: string;
    notes?: string;
  };
  createdAt: string;
}

interface BudgetOverviewEntry {
  budget: BudgetRecord;
  allocated: number;
  actual: number;
  variance: number;
  utilizationPct: string;
}

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function UtilizationBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100);
  let barColor = 'bg-green-500';
  if (pct >= 100) barColor = 'bg-red-500';
  else if (pct >= 80) barColor = 'bg-yellow-400';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(1)}%</span>
    </div>
  );
}

function VarianceBadge({ variance }: { variance: number }) {
  if (variance >= 0) {
    return (
      <span className="text-green-700 font-medium">{formatCurrency(variance)}</span>
    );
  }
  return (
    <span className="text-red-600 font-medium">{formatCurrency(variance)}</span>
  );
}

function periodLabel(data: BudgetRecord['data']) {
  if (data.period === 'monthly' && data.month) {
    const d = new Date(data.year ?? 0, data.month - 1);
    return `${d.toLocaleString('en-US', { month: 'short' })} ${data.year}`;
  }
  if (data.period === 'quarterly' && data.quarter) {
    return `Q${data.quarter} ${data.year}`;
  }
  return `${data.period ?? '—'} ${data.year ?? ''}`.trim();
}

export default async function BudgetsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let overview: BudgetOverviewEntry[] = [];

  try {
    const res = await apiFetch<BudgetOverviewEntry[]>('/api/v1/budgets/overview', tenantId);
    overview = Array.isArray(res) ? res : [];
  } catch {
    overview = [];
  }

  const totalAllocated = overview.reduce((sum, e) => sum + e.allocated, 0);
  const totalActual = overview.reduce((sum, e) => sum + e.actual, 0);
  const totalVariance = totalAllocated - totalActual;

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Budgets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{overview.length} budgets</p>
        </div>
        <Link
          href="/dashboard/budgets/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New budget
        </Link>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Total allocated</p>
          <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalAllocated)}</p>
          <p className="text-xs text-gray-400 mt-0.5">across {overview.length} budgets</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Total actual spend</p>
          <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalActual)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalAllocated > 0
              ? `${((totalActual / totalAllocated) * 100).toFixed(1)}% of budget used`
              : 'no budget set'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Overall variance</p>
          <p className={`text-2xl font-semibold ${totalVariance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {formatCurrency(totalVariance)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalVariance >= 0 ? 'under budget' : 'over budget'}
          </p>
        </div>
      </div>

      {/* Table */}
      {overview.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No budgets yet.</p>
          <Link
            href="/dashboard/budgets/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Add your first budget
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Budget name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Period</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Allocated</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actual spend</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Variance</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-40">Utilization</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {overview.map((entry) => {
                const d = entry.budget.data;
                const utilPct = parseFloat(entry.utilizationPct);
                return (
                  <tr
                    key={entry.budget.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{d.name ?? '—'}</p>
                      {d.department_name && (
                        <p className="text-xs text-gray-400 mt-0.5">{d.department_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                        {d.category ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs capitalize">
                      {periodLabel(d)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {formatCurrency(entry.allocated, d.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(entry.actual, d.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <VarianceBadge variance={entry.variance} />
                    </td>
                    <td className="px-4 py-3">
                      <UtilizationBar pct={utilPct} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/budgets/${entry.budget.id}`}
                        className="text-xs text-gray-500 hover:text-gray-900"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
