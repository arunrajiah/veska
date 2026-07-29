'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, X, CheckCircle, XCircle } from 'lucide-react';
import { BulkActionBar } from '@/components/bulk-action-bar.js';
import type { Expense } from './page.js';

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

function getStatus(e: Expense): string {
  return e.data.status ?? 'draft';
}

function getTitle(e: Expense): string {
  return e.data.title ?? e.data.description ?? '—';
}

function getSubmittedBy(e: Expense): string {
  return e.data.submittedBy ?? e.data.employee_name ?? e.data.employee_id ?? '—';
}

function getAmount(e: Expense): number {
  const a = e.data.amount ?? 0;
  return typeof a === 'number' ? a : parseFloat(String(a)) || 0;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-50 text-yellow-700',
  submitted: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  paid: 'bg-blue-50 text-blue-700',
};

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

// ---------------------------------------------------------------------------
// Submit Expense Slide-over
// ---------------------------------------------------------------------------
interface SubmitExpenseSlideoverProps {
  tenantId: string;
  onClose: () => void;
  onCreated: (expense: Expense) => void;
}

function SubmitExpenseSlideover({ tenantId, onClose, onCreated }: SubmitExpenseSlideoverProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    amount: '',
    currency: 'USD',
    category: 'other',
    date: today,
    notes: '',
    receiptUrl: '',
  });

  const set = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!form.amount || isNaN(parseFloat(form.amount))) {
      setError('Valid amount is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        title: form.title,
        amount: parseFloat(form.amount),
        currency: form.currency,
        category: form.category,
        date: form.date,
        notes: form.notes || undefined,
        receiptUrl: form.receiptUrl || undefined,
        status: 'pending',
      };
      const res = await fetch(`/api/veska/expenses`, {
        method: 'POST',
        headers: authHeaders(tenantId),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = (await res.json()) as Expense;
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold text-gray-900">Submit Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <form
          id="submit-expense-form"
          onSubmit={(e) => void handleSubmit(e)}
          className="flex-1 overflow-y-auto divide-y divide-gray-50"
        >
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Title *</label>
              <input
                name="title"
                value={form.title}
                onChange={set}
                required
                placeholder="Team lunch, Flight to NY…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount *</label>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={set}
                  required
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Currency</label>
                <select
                  name="currency"
                  value={form.currency}
                  onChange={set}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                >
                  {['USD', 'EUR', 'GBP', 'INR'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={set}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                >
                  {['travel', 'meals', 'equipment', 'software', 'other'].map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={set}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Receipt URL</label>
              <input
                name="receiptUrl"
                type="url"
                value={form.receiptUrl}
                onChange={set}
                placeholder="https://…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
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
            form="submit-expense-form"
            disabled={saving}
            className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Submitting…' : 'Submit Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------
export function ExpensesClient({
  expenses: initialExpenses,
  tenantId,
}: {
  expenses: Expense[];
  tenantId: string;
}) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const filtered =
    activeTab === 'all'
      ? expenses
      : expenses.filter((e) => {
          const s = getStatus(e);
          if (activeTab === 'pending') return s === 'pending' || s === 'submitted';
          return s === activeTab;
        });

  const allVisibleSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((e) => next.delete(e.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((e) => next.add(e.id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch(`/api/veska/expenses/bulk`, {
        method: 'POST',
        headers: authHeaders(tenantId),
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = (await res.json()) as {
        processed: number;
        failed: { id: string; error: string }[];
      };
      const failCount = result.failed.length;
      setToast({
        message:
          failCount > 0
            ? `${result.processed} processed, ${failCount} failed`
            : `${result.processed} expense${result.processed !== 1 ? 's' : ''} ${action}d`,
        type: failCount > 0 ? 'error' : 'success',
      });
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Bulk action failed',
        type: 'error',
      });
    } finally {
      setBulkLoading(false);
    }
  };

  // Stats
  const totalSubmitted = expenses.reduce((s, e) => s + getAmount(e), 0);
  const pendingApproval = expenses.filter((e) =>
    ['pending', 'submitted'].includes(getStatus(e)),
  ).length;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const approvedThisMonth = expenses
    .filter((e) => {
      if (getStatus(e) !== 'approved') return false;
      return new Date(e.updatedAt ?? e.createdAt) >= startOfMonth;
    })
    .reduce((s, e) => s + getAmount(e), 0);
  const rejected = expenses.filter((e) => getStatus(e) === 'rejected').length;

  const handleApprove = async (expense: Expense) => {
    setActionLoading(expense.id + '-approve');
    try {
      const res = await fetch(`/api/veska/expenses/${expense.id}/approve`, {
        method: 'PATCH',
        headers: authHeaders(tenantId),
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === expense.id ? { ...e, data: { ...e.data, status: 'approved' } } : e,
        ),
      );
      setToast({ message: 'Expense approved', type: 'success' });
    } catch {
      setToast({ message: 'Failed to approve expense', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (expense: Expense) => {
    setActionLoading(expense.id + '-reject');
    try {
      const res = await fetch(`/api/veska/expenses/${expense.id}/reject`, {
        method: 'PATCH',
        headers: authHeaders(tenantId),
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === expense.id ? { ...e, data: { ...e.data, status: 'rejected' } } : e,
        ),
      );
      setToast({ message: 'Expense rejected', type: 'success' });
    } catch {
      setToast({ message: 'Failed to reject expense', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: Array<{ id: FilterTab; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="px-8 py-8 max-w-6xl">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {showNew && (
        <SubmitExpenseSlideover
          tenantId={tenantId}
          onClose={() => setShowNew(false)}
          onCreated={(expense) => {
            setExpenses((prev) => [expense, ...prev]);
            setShowNew(false);
            setToast({ message: 'Expense submitted', type: 'success' });
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Expenses</h1>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Submit Expense
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Total Submitted</p>
          <p className="text-xl font-semibold text-gray-900">{fmt(totalSubmitted)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Pending Approval</p>
          <p className="text-xl font-semibold text-yellow-600">{pendingApproval}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Approved This Month</p>
          <p className="text-xl font-semibold text-green-700">{fmt(approvedThisMonth)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Rejected</p>
          <p className="text-xl font-semibold text-red-600">{rejected}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activeTab === id
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No expenses found.</p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Submit your first expense
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Submitted By
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Category
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => {
                  const status = getStatus(expense);
                  const isPending = status === 'pending' || status === 'submitted';
                  const isChecked = selected.has(expense.id);
                  return (
                    <tr
                      key={expense.id}
                      onClick={() => router.push(`/dashboard/expenses/${expense.id}`)}
                      className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer ${isChecked ? 'bg-blue-50/30' : ''}`}
                    >
                      <td
                        className="px-4 py-3 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOne(expense.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOne(expense.id)}
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{getTitle(expense)}</td>
                      <td className="px-4 py-3 text-gray-600">{getSubmittedBy(expense)}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {expense.data.category ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {fmt(expense.data.amount, expense.data.currency)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {expense.data.date ? expense.data.date.slice(0, 10) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => void handleApprove(expense)}
                              disabled={actionLoading !== null}
                              className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 border border-green-100 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <CheckCircle size={11} />
                              {actionLoading === expense.id + '-approve' ? '…' : 'Approve'}
                            </button>
                            <button
                              onClick={() => void handleReject(expense)}
                              disabled={actionLoading !== null}
                              className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-100 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <XCircle size={11} />
                              {actionLoading === expense.id + '-reject' ? '…' : 'Reject'}
                            </button>
                          </div>
                        ) : (
                          <Link
                            href={`/dashboard/expenses/${expense.id}`}
                            className="text-xs text-gray-500 hover:text-gray-900"
                          >
                            View →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <BulkActionBar
            selectedCount={selected.size}
            onClear={() => setSelected(new Set())}
            actions={[
              {
                label: bulkLoading ? 'Processing…' : 'Approve All',
                onClick: () => void handleBulkAction('approve'),
              },
              {
                label: 'Reject All',
                onClick: () => void handleBulkAction('reject'),
                variant: 'danger',
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
