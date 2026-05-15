'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, PieChart, TrendingUp, TrendingDown } from 'lucide-react';
import type { Budget, BudgetSummary } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status ?? 'draft'}
    </span>
  );
}

function PeriodBadge({ budget }: { budget: Budget }) {
  const period = budget.period ?? (budget.data?.['period'] as string) ?? 'annual';
  const year = budget.fiscalYear ?? (budget.data?.['year'] as number) ?? new Date().getFullYear();
  const quarter = budget.quarter ?? (budget.data?.['quarter'] as number);
  const month = budget.month ?? (budget.data?.['month'] as number);

  let label = `${period} ${year}`;
  if (period === 'quarterly' && quarter) label = `Q${quarter} ${year}`;
  if (period === 'monthly' && month) {
    const d = new Date(year, month - 1);
    label = `${d.toLocaleString('en-US', { month: 'short' })} ${year}`;
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 capitalize">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// New Budget Slide-over / Modal Form
// ---------------------------------------------------------------------------
const PERIODS = [
  { value: 'annual', label: 'Annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
];

interface NewBudgetFormProps {
  tenantId?: string;
  onClose: () => void;
  onCreated: (b: Budget) => void;
}

function NewBudgetForm({ onClose, onCreated }: NewBudgetFormProps) {
  const curYear = new Date().getFullYear();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    fiscalYear: String(curYear),
    period: 'annual',
    quarter: '',
    month: '',
    currency: 'USD',
    status: 'draft',
  });

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const submit = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        fiscalYear: Number(form.fiscalYear),
        period: form.period,
        currency: form.currency,
        status: form.status,
      };
      if (form.period === 'quarterly' && form.quarter) body.quarter = Number(form.quarter);
      if (form.period === 'monthly' && form.month) body.month = Number(form.month);

      const res = await fetch(`${API_BASE}/api/v1/budgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'demo-tenant',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json() as Budget;
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">New Budget</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
          {[
            { id: 'name', label: 'Name *', type: 'text', placeholder: 'e.g. FY2026 Marketing' },
            { id: 'description', label: 'Description', type: 'text', placeholder: 'Optional description' },
          ].map(({ id, label, placeholder }) => (
            <div key={id} className="px-5 py-3">
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input
                name={id}
                type="text"
                value={(form as Record<string, string>)[id]}
                onChange={set}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
          ))}

          <div className="px-5 py-3">
            <label className="block text-xs text-gray-500 mb-1">Fiscal Year</label>
            <input
              name="fiscalYear"
              type="number"
              min="2000"
              max="2100"
              value={form.fiscalYear}
              onChange={set}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          <div className="px-5 py-3">
            <label className="block text-xs text-gray-500 mb-1">Period</label>
            <select name="period" value={form.period} onChange={set}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white">
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {form.period === 'quarterly' && (
            <div className="px-5 py-3">
              <label className="block text-xs text-gray-500 mb-1">Quarter</label>
              <select name="quarter" value={form.quarter} onChange={set}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white">
                <option value="">Select quarter</option>
                {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
              </select>
            </div>
          )}

          {form.period === 'monthly' && (
            <div className="px-5 py-3">
              <label className="block text-xs text-gray-500 mb-1">Month</label>
              <select name="month" value={form.month} onChange={set}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white">
                <option value="">Select month</option>
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
          )}

          <div className="px-5 py-3">
            <label className="block text-xs text-gray-500 mb-1">Currency</label>
            <select name="currency" value={form.currency} onChange={set}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white">
              {['USD','EUR','GBP','INR','CAD','AUD'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="px-5 py-3">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select name="status" value={form.status} onChange={set}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white">
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="px-5 py-2 bg-red-50 border-t border-red-100">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} disabled={saving}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => void submit()} disabled={saving}
            className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50">
            {saving ? 'Creating…' : 'Create budget'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------
export function BudgetsClient({
  budgets: initialBudgets,
  summary,
}: {
  budgets: Budget[];
  summary: BudgetSummary;
}) {
  const router = useRouter();
  const [budgets, setBudgets] = useState(initialBudgets);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/budgets/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': 'demo-tenant' },
      });
      if (res.ok) setBudgets((prev) => prev.filter((b) => b.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const util = summary.utilizationPct ?? 0;
  const utilColor = util >= 100 ? 'text-red-600' : util >= 80 ? 'text-yellow-600' : 'text-green-700';

  return (
    <>
      {showForm && (
        <NewBudgetForm
          onClose={() => setShowForm(false)}
          onCreated={(b) => {
            setBudgets((prev) => [b, ...prev]);
            setShowForm(false);
          }}
        />
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <PieChart size={14} className="text-gray-400" />
            <p className="text-xs text-gray-500">Total Budgeted</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{fmt(summary.totalBudgeted ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-0.5">across {budgets.length} budget{budgets.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-gray-400" />
            <p className="text-xs text-gray-500">Total Actuals</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{fmt(summary.totalActuals ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-0.5">actual spend to date</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            {util >= 100 ? <TrendingDown size={14} className="text-red-400" /> : <TrendingUp size={14} className="text-green-400" />}
            <p className="text-xs text-gray-500">Utilization</p>
          </div>
          <p className={`text-2xl font-semibold ${utilColor}`}>{util.toFixed(1)}%</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${util >= 100 ? 'bg-red-500' : util >= 80 ? 'bg-yellow-400' : 'bg-green-500'}`}
              style={{ width: `${Math.min(util, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active budgets badges */}
      {summary.activeBudgets && summary.activeBudgets.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-xs text-gray-500 self-center">Active:</span>
          {summary.activeBudgets.map((ab) => (
            <Link
              key={ab.id}
              href={`/dashboard/budgets/${ab.id}`}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
            >
              {ab.name}
            </Link>
          ))}
        </div>
      )}

      {/* Quick-add button */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{budgets.length} budget{budgets.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <Plus size={14} /> Quick add
        </button>
      </div>

      {/* Table */}
      {budgets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No budgets yet.</p>
          <Link
            href="/dashboard/budgets/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Create your first budget
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fiscal Year</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Period</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Currency</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => {
                const name = b.name ?? (b.data?.['name'] as string) ?? '—';
                const year = b.fiscalYear ?? (b.data?.['year'] as number) ?? '—';
                const status = b.status ?? (b.data?.['status'] as string) ?? 'draft';
                const currency = b.currency ?? (b.data?.['currency'] as string) ?? 'USD';
                return (
                  <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{name}</p>
                      {b.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{b.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{year}</td>
                    <td className="px-4 py-3">
                      <PeriodBadge budget={b} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{currency}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/dashboard/budgets/${b.id}`}
                          className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/budgets/${b.id}`}
                          className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => void handleDelete(b.id)}
                          disabled={deletingId === b.id}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-40"
                        >
                          {deletingId === b.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
