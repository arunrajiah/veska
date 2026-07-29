import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { DeleteButton } from './delete-button.js';
import { BudgetDetailClient } from './_components.js';

interface Budget {
  id: string;
  name?: string;
  description?: string;
  fiscalYear?: number;
  period?: string;
  quarter?: number;
  month?: number;
  currency?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  // legacy flat data shape
  entityType?: string;
  data?: Record<string, unknown>;
}

function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function periodLabel(b: Budget): string {
  const period = b.period ?? (b.data?.['period'] as string) ?? '';
  const year = b.fiscalYear ?? (b.data?.['year'] as number) ?? '';
  const quarter = b.quarter ?? (b.data?.['quarter'] as number);
  const month = b.month ?? (b.data?.['month'] as number);
  if (period === 'monthly' && month) {
    const d = new Date(Number(year), month - 1);
    return `${d.toLocaleString('en-US', { month: 'long' })} ${year}`;
  }
  if (period === 'quarterly' && quarter) return `Q${quarter} ${year}`;
  return `${period} ${year}`.trim();
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    approved: 'bg-blue-50 text-blue-700',
    active: 'bg-green-50 text-green-700',
    closed: 'bg-gray-100 text-gray-500',
  };
  const cls = map[status ?? ''] ?? 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}
    >
      {status ?? 'draft'}
    </span>
  );
}

export default async function BudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let budget: Budget | null = null;

  try {
    budget = await apiFetch<Budget>(`/api/v1/budgets/${id}`, tenantId);
  } catch {
    budget = null;
  }

  if (!budget) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Budget not found.</p>
        <Link
          href="/dashboard/budgets"
          className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to budgets
        </Link>
      </div>
    );
  }

  const name = budget.name ?? (budget.data?.['name'] as string) ?? 'Budget';
  const currency = budget.currency ?? (budget.data?.['currency'] as string) ?? 'USD';
  const status = budget.status ?? (budget.data?.['status'] as string) ?? 'draft';
  const description = budget.description ?? (budget.data?.['notes'] as string);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard/budgets" className="text-xs text-gray-400 hover:text-gray-700">
          ← Budgets
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-gray-900">{name}</h1>
            <StatusBadge status={status} />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">{periodLabel(budget)}</p>
            <span className="text-gray-300">·</span>
            <p className="text-sm text-gray-500">{currency}</p>
          </div>
          {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
        </div>
        <DeleteButton budgetId={id} tenantId={tenantId} />
      </div>

      {/* Detail card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
        </div>
        <dl className="divide-y divide-gray-50">
          {[
            { label: 'Name', value: name },
            { label: 'Period', value: periodLabel(budget) },
            { label: 'Currency', value: currency },
            { label: 'Status', value: <StatusBadge status={status} /> },
            {
              label: 'Created',
              value: new Date(budget.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }),
            },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-3 flex items-center gap-4">
              <dt className="text-xs text-gray-500 w-28 shrink-0">{label}</dt>
              <dd className="text-sm text-gray-900">
                {value || <span className="text-gray-300">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Line items + Actuals tabs */}
      <BudgetDetailClient budgetId={id} currency={currency} />
    </div>
  );
}
