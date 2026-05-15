'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, X, PieChart, TrendingUp, TrendingDown } from 'lucide-react';
import type { Budget, BudgetSummary } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function authHeaders(tenantId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': tenantId,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

function fmt(value: unknown, currency = 'USD'): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

function getBudgetName(b: Budget): string {
  return b.name ?? b.data?.name ?? '—';
}

function getBudgetCategory(b: Budget): string {
  return (b.data?.category as string) ?? '—';
}

function getBudgetPeriod(b: Budget): string {
  return b.period ?? (b.data?.period as string) ?? 'annual';
}

function getBudgetAllocated(b: Budget): number {
  const v = b.data?.totalBudget ?? 0;
  return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
}

function getBudgetSpent(b: Budget): number {
  const v = b.data?.spent ?? 0;
  return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
}

function getBudgetStatus(b: Budget): string {
  return b.status ?? (b.data?.status as string) ?? 'draft';
}

function getBudgetCurrency(b: Budget): string {
  return b.currency ?? (b.data?.currency as string) ?? 'USD';
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-50 text-blue-700',
  active: 'bg-green-50 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

function ProgressBar({ pct }: { pct: number }) {
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-400' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Budget Slide-over
// ---------------------------------------------------------------------------
interface NewBudgetSlideoverProps {
  tenantId: string;
  onClose: () => void;
  onCreated: (b: Budget) => void;
}

function NewBudgetSlideover({ tenantId, onClose, onCreated }: NewBudgetSlideoverProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    category: '',
    totalBudget: '',
    period: 'monthly',
    notes: '',
  });

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.totalBudget || isNaN(parseFloat(form.totalBudget))) { setError('Valid budget amount is required'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name,
        category: form.category || undefined,
        totalBudget: parseFloat(form.totalBudget),
        period: form.period,
        notes: form.notes || undefined,
        status: 'draft',
        spent: 0,
      };
      const res = await fetch(`${API_BASE}/api/v1/budgets`, {
        method: 'POST',
        headers: authHeaders(tenantId),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json() as Budget;
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold text-gray-900">New Budget</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <form id="new-budget-form" onSubmit={(e) => void handleSubmit(e)} className="flex-1 overflow-y-auto divide-y divide-gray-50">
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={set}
                required
                placeholder="e.g. Q2 Marketing"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <input
                name="category"
                value={form.category}
                onChange={set}
                placeholder="e.g. Marketing, Engineering"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Total Budget *</label>
              <input
                name="totalBudget"
                type="number"
                min="0"
                step="0.01"
                value={form.totalBudget}
                onChange={set}
                required
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Period</label>
              <select
                name="period"
                value={form.period}
                onChange={set}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={set}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
              />
            </div>
          </div>
        </form>

        {error && (
          <div className="px-5 py-2 bg-red-50 border-t border-red-100">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-budget-form"
            disabled={saving}
            className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Budget'}
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
  tenantId,
}: {
  budgets: Budget[];
  summary: BudgetSummary;
  tenantId: string;
}) {
  const [budgets, setBudgets] = useState(initialBudgets);
  const [showNew, setShowNew] = useState(false);

  // Compute stats
  const totalAllocated = budgets.reduce((s, b) => s + getBudgetAllocated(b), 0) || summary.totalBudgeted;
  const totalSpent = budgets.reduce((s, b) => s + getBudgetSpent(b), 0) || summary.totalActuals;
  const utilPct = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : summary.utilizationPct;
  const utilColor = utilPct >= 90 ? 'text-red-600' : utilPct >= 70 ? 'text-yellow-600' : 'text-green-700';

  return (
    <div className="px-8 py-8 max-w-6xl">
      {showNew && (
        <NewBudgetSlideover
          tenantId={tenantId}
          onClose={() => setShowNew(false)}
          onCreated={(b) => {
            setBudgets((prev) => [b, ...prev]);
            setShowNew(false);
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Budgets</h1>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New Budget
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <PieChart size={13} className="text-gray-400" />
            <p className="text-xs text-gray-500">Total Budgets</p>
          </div>
          <p className="text-xl font-semibold text-gray-900">{budgets.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={13} className="text-gray-400" />
            <p className="text-xs text-gray-500">Total Allocated</p>
          </div>
          <p className="text-xl font-semibold text-gray-900">{fmt(totalAllocated)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={13} className="text-gray-400" />
            <p className="text-xs text-gray-500">Total Spent</p>
          </div>
          <p className="text-xl font-semibold text-gray-900">{fmt(totalSpent)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">% Utilization</p>
          <p className={`text-xl font-semibold ${utilColor}`}>{utilPct.toFixed(1)}%</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${utilPct >= 90 ? 'bg-red-500' : utilPct >= 70 ? 'bg-yellow-400' : 'bg-green-500'}`}
              style={{ width: `${Math.min(utilPct, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {budgets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No budgets yet.</p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Create first budget
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Budget Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Period</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Allocated</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Spent</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Remaining</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-36">Progress</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => {
                const allocated = getBudgetAllocated(b);
                const spent = getBudgetSpent(b);
                const remaining = allocated - spent;
                const pct = allocated > 0 ? (spent / allocated) * 100 : 0;
                const currency = getBudgetCurrency(b);
                const status = getBudgetStatus(b);
                return (
                  <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{getBudgetName(b)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                        {getBudgetCategory(b)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{getBudgetPeriod(b)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{fmt(allocated, currency)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{fmt(spent, currency)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {fmt(remaining, currency)}
                    </td>
                    <td className="px-4 py-3 w-36">
                      <ProgressBar pct={pct} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/budgets/${b.id}`}
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
