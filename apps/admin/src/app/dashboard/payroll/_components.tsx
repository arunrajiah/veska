'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  Plus,
  X,
  ChevronDown,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

interface PayrollRun {
  id: string;
  name?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  currency?: string;
  employeeCount?: number;
  totalGross?: number;
  totalNet?: number;
  status?: string;
  notes?: string;
  createdAt?: string;
  data?: {
    name?: string;
    period?: string;
    period_start?: string;
    period_end?: string;
    currency?: string;
    employee_count?: number;
    total_gross?: number;
    total_net?: number;
    status?: string;
    notes?: string;
  };
}

interface PayrollSummary {
  ytdTotal?: number;
  headcount?: number;
  lastPaidDate?: string;
  monthlyTotals?: Array<{ month: string; total: number }>;
}

function fmt(amount?: number, currency = 'USD') {
  if (amount == null) return '—';
  return amount.toLocaleString('en-US', { style: 'currency', currency });
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function normalize(run: PayrollRun) {
  const d = run.data ?? {};
  return {
    id: run.id,
    name: run.name ?? d.name ?? '',
    period: run.period ?? d.period ?? 'monthly',
    periodStart: run.periodStart ?? d.period_start ?? '',
    periodEnd: run.periodEnd ?? d.period_end ?? '',
    currency: run.currency ?? d.currency ?? 'USD',
    employeeCount: run.employeeCount ?? d.employee_count ?? 0,
    totalGross: run.totalGross ?? d.total_gross,
    totalNet: run.totalNet ?? d.total_net,
    status: run.status ?? d.status ?? 'draft',
    notes: run.notes ?? d.notes ?? '',
    createdAt: run.createdAt ?? '',
  };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    processing: 'bg-blue-50 text-blue-700',
    approved: 'bg-indigo-50 text-indigo-700',
    paid: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-600',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {label}
    </span>
  );
}

function PeriodBadge({ period }: { period: string }) {
  const map: Record<string, string> = {
    monthly: 'bg-violet-50 text-violet-700',
    'bi-weekly': 'bg-sky-50 text-sky-700',
    weekly: 'bg-teal-50 text-teal-700',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[period] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {period}
    </span>
  );
}

function SlideOver({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name') as string,
      period: fd.get('period') as string,
      periodStart: fd.get('periodStart') as string,
      periodEnd: fd.get('periodEnd') as string,
      currency: fd.get('currency') as string,
      notes: (fd.get('notes') as string) || undefined,
    };
    try {
      const res = await fetch(`${API_BASE}/payroll-runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payroll run');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New payroll run</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input
              name="name"
              required
              placeholder="e.g. May 2026 Payroll"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Period *</label>
            <select
              name="period"
              required
              defaultValue="monthly"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="monthly">Monthly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Period start *</label>
              <input
                name="periodStart"
                type="date"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Period end *</label>
              <input
                name="periodEnd"
                type="date"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
            <select
              name="currency"
              defaultValue="USD"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Optional notes…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RunsTab({
  runs,
  onRefresh,
}: {
  runs: ReturnType<typeof normalize>[];
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function transition(id: string, status: string) {
    setActionLoading(`${id}-${status}`);
    try {
      await fetch(`${API_BASE}/payroll-runs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ status }),
      });
      startTransition(() => {
        router.refresh();
        onRefresh();
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteRun(id: string) {
    if (!confirm('Delete this payroll run?')) return;
    setActionLoading(`${id}-delete`);
    try {
      await fetch(`${API_BASE}/payroll-runs/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': TENANT_ID },
      });
      startTransition(() => {
        router.refresh();
        onRefresh();
      });
    } finally {
      setActionLoading(null);
    }
  }

  if (runs.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
        <Receipt size={32} className="mx-auto mb-3 text-gray-300" />
        <p className="text-gray-400 text-sm">No payroll runs yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Period</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Dates</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Employees</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Gross</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Net</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              <td className="px-4 py-3 font-medium text-gray-900">{run.name || '—'}</td>
              <td className="px-4 py-3">
                <PeriodBadge period={run.period} />
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {fmtDate(run.periodStart)} – {fmtDate(run.periodEnd)}
              </td>
              <td className="px-4 py-3 text-gray-600">{run.employeeCount}</td>
              <td className="px-4 py-3 text-gray-600">{fmt(run.totalGross, run.currency)}</td>
              <td className="px-4 py-3 text-gray-600">{fmt(run.totalNet, run.currency)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={run.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  <a
                    href={`/dashboard/payroll/${run.id}`}
                    className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    View
                  </a>
                  {run.status === 'processing' && (
                    <button
                      onClick={() => void transition(run.id, 'approved')}
                      disabled={actionLoading !== null}
                      className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {run.status === 'approved' && (
                    <button
                      onClick={() => void transition(run.id, 'paid')}
                      disabled={actionLoading !== null}
                      className="text-xs text-green-700 hover:text-green-900 px-2 py-1 rounded hover:bg-green-50 disabled:opacity-50"
                    >
                      Pay
                    </button>
                  )}
                  {run.status !== 'paid' && run.status !== 'cancelled' && (
                    <button
                      onClick={() => void deleteRun(run.id)}
                      disabled={actionLoading !== null}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsTab({ summary }: { summary: PayrollSummary }) {
  const monthly = summary.monthlyTotals ?? [];
  const ytd = summary.ytdTotal ?? 0;
  const avg =
    monthly.length > 0 ? monthly.reduce((s, m) => s + (m.total ?? 0), 0) / monthly.length : 0;
  const projected = avg * 12;

  // Build 12-month grid (use provided data or fill with zeros)
  const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const totals = MONTHS.map((m) => {
    const found = monthly.find((mt) => mt.month && mt.month.startsWith(m));
    return found?.total ?? 0;
  });
  const maxVal = Math.max(...totals, 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">YTD Total</p>
          <p className="text-2xl font-semibold text-gray-900">{fmt(ytd)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Avg Monthly</p>
          <p className="text-2xl font-semibold text-gray-900">{fmt(avg)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Projected Annual</p>
          <p className="text-2xl font-semibold text-indigo-700">{fmt(projected)}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-5">
          Monthly Payroll Cost
        </h3>
        <div className="flex items-end gap-2 h-40">
          {MONTHS.map((m, i) => {
            const total = totals[i] ?? 0;
            const h = total > 0 ? Math.max(4, Math.round((total / maxVal) * 100)) : 2;
            return (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-indigo-500 transition-all"
                  style={{ height: `${h}%`, minHeight: total > 0 ? '6px' : '2px' }}
                  title={fmt(total)}
                />
                <span className="text-xs text-gray-400">{m}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PayrollClient({
  runs: initialRuns,
  summary,
}: {
  runs: PayrollRun[];
  summary: PayrollSummary;
}) {
  const [tab, setTab] = useState<'runs' | 'analytics'>('runs');
  const [showForm, setShowForm] = useState(false);
  const [runs, setRuns] = useState(initialRuns.map(normalize));
  const router = useRouter();

  const ytd = summary.ytdTotal ?? runs.reduce((s, r) => s + (r.totalGross ?? 0), 0);
  const headcount =
    summary.headcount ?? (runs.length > 0 ? (runs[runs.length - 1]?.employeeCount ?? 0) : 0);
  const lastPaid =
    summary.lastPaidDate ??
    runs
      .filter((r) => r.status === 'paid')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.periodEnd;

  function handleCreated() {
    router.refresh();
    // optimistically note a refresh is needed
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {runs.length} run{runs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New payroll run
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <DollarSign size={16} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">YTD Total Payroll</p>
            <p className="text-lg font-semibold text-gray-900">{fmt(ytd)}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Users size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Headcount</p>
            <p className="text-lg font-semibold text-gray-900">{headcount ?? '—'}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Clock size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Last Paid Run</p>
            <p className="text-lg font-semibold text-gray-900">{fmtDate(lastPaid)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {(['runs', 'analytics'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'runs' ? 'Runs' : 'Analytics'}
          </button>
        ))}
      </div>

      {tab === 'runs' && (
        <RunsTab runs={runs} onRefresh={() => setRuns(initialRuns.map(normalize))} />
      )}
      {tab === 'analytics' && <AnalyticsTab summary={summary} />}

      <SlideOver open={showForm} onClose={() => setShowForm(false)} onCreated={handleCreated} />
    </div>
  );
}
