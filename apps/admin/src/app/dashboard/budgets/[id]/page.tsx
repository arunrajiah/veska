import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { DeleteButton } from './delete-button.js';

interface BudgetRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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

  let textColor = 'text-green-700';
  if (pct >= 100) textColor = 'text-red-600';
  else if (pct >= 80) textColor = 'text-yellow-600';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${textColor}`}>{pct.toFixed(1)}% utilized</span>
        <span className="text-xs text-gray-400">
          {pct < 80 ? 'On track' : pct < 100 ? 'Approaching limit' : 'Over budget'}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export default async function BudgetDetailPage({ params }: { params: { id: string } }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = params;

  let record: BudgetRecord | null = null;
  let overviewEntry: BudgetOverviewEntry | null = null;

  try {
    record = await apiFetch<BudgetRecord>(`/api/v1/budgets/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
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

  try {
    const overview = await apiFetch<BudgetOverviewEntry[]>('/api/v1/budgets/overview', tenantId);
    overviewEntry = overview.find((e) => e.budget.id === id) ?? null;
  } catch {
    overviewEntry = null;
  }

  const d = record.data;
  const currency = String(d['currency'] ?? 'USD');
  const allocatedAmount = Number(d['allocated_amount'] ?? 0);
  const utilPct = overviewEntry ? parseFloat(overviewEntry.utilizationPct) : 0;

  function periodLabel() {
    const period = String(d['period'] ?? '');
    const year = d['year'] ?? '';
    if (period === 'monthly' && d['month']) {
      const dt = new Date(Number(year), Number(d['month']) - 1);
      return `${dt.toLocaleString('en-US', { month: 'long' })} ${year}`;
    }
    if (period === 'quarterly' && d['quarter']) {
      return `Q${d['quarter']} ${year}`;
    }
    return `${period} ${year}`.trim();
  }

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Name', value: String(d['name'] ?? '—') },
    { label: 'Category', value: <span className="capitalize">{String(d['category'] ?? '—')}</span> },
    { label: 'Period', value: periodLabel() },
    { label: 'Allocated', value: <span className="font-medium">{formatCurrency(allocatedAmount, currency)}</span> },
    { label: 'Currency', value: currency },
    ...(d['department_name'] ? [{ label: 'Department', value: String(d['department_name']) }] : []),
    ...(d['department_id'] ? [{ label: 'Department ID', value: String(d['department_id']) }] : []),
    {
      label: 'Created',
      value: new Date(record.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      }),
    },
  ];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/budgets" className="text-xs text-gray-400 hover:text-gray-700">
          ← Budgets
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{String(d['name'] ?? 'Budget')}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500 capitalize">{String(d['category'] ?? '')} budget</p>
            <span className="text-gray-300">·</span>
            <p className="text-sm text-gray-500">{periodLabel()}</p>
          </div>
        </div>
        <DeleteButton budgetId={id} tenantId={tenantId} />
      </div>

      {/* Utilization overview */}
      {overviewEntry && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Budget utilization
            </h2>
          </div>
          <div className="px-5 py-5">
            <UtilizationBar pct={utilPct} />
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500">Allocated</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">
                  {formatCurrency(overviewEntry.allocated, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Actual spend</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">
                  {formatCurrency(overviewEntry.actual, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Variance</p>
                <p className={`text-lg font-semibold mt-0.5 ${overviewEntry.variance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(overviewEntry.variance, currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
        </div>
        <dl className="divide-y divide-gray-50">
          {fields.map(({ label, value }) => (
            <div key={label} className="px-5 py-3 flex items-center gap-4">
              <dt className="text-xs text-gray-500 w-28 shrink-0">{label}</dt>
              <dd className="text-sm text-gray-900">
                {value || <span className="text-gray-300">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Notes */}
      {d['notes'] && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h2>
          </div>
          <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">
            {String(d['notes'])}
          </p>
        </div>
      )}
    </div>
  );
}
