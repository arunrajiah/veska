'use client';

import { useState } from 'react';
import { RefreshCw, Plus, Pause, Play, X } from 'lucide-react';
import type { RecurringInvoice } from './page.js';


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

function getClientName(r: RecurringInvoice): string {
  return r.templateData?.customerName ?? r.data?.clientName ?? r.name ?? '—';
}

function getFrequency(r: RecurringInvoice): string {
  return r.frequency ?? r.data?.frequency ?? '—';
}

function getAmount(r: RecurringInvoice): unknown {
  return r.templateData?.amount ?? r.data?.amount ?? 0;
}

function getCurrency(r: RecurringInvoice): string {
  return r.templateData?.currency ?? r.data?.currency ?? 'USD';
}

function getNextDue(r: RecurringInvoice): string {
  const d = r.nextRunDate ?? r.data?.nextDue ?? '';
  return d ? d.slice(0, 10) : '—';
}

function getStatus(r: RecurringInvoice): string {
  return r.status ?? r.data?.status ?? 'active';
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
  annual: 'Annually',
};

// ---------------------------------------------------------------------------
// New Recurring Invoice Slide-over
// ---------------------------------------------------------------------------
interface NewRecurringSlideoverProps {
  tenantId: string;
  onClose: () => void;
  onCreated: (r: RecurringInvoice) => void;
}

function NewRecurringSlideover({ tenantId, onClose, onCreated }: NewRecurringSlideoverProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    frequency: 'monthly',
    amount: '',
    currency: 'USD',
    startDate: today,
    notes: '',
  });

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.clientName.trim()) { setError('Client name is required'); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { setError('Valid amount is required'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        clientName: form.clientName,
        clientEmail: form.clientEmail || undefined,
        frequency: form.frequency,
        amount: parseFloat(form.amount),
        currency: form.currency,
        startDate: form.startDate,
        notes: form.notes || undefined,
        status: 'active',
      };
      const res = await fetch(`/api/veska/finance/recurring`, {
        method: 'POST',
        headers: authHeaders(tenantId),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json() as RecurringInvoice;
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recurring invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold text-gray-900">New Recurring Invoice</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <form id="new-recurring-form" onSubmit={(e) => void handleSubmit(e)} className="flex-1 overflow-y-auto divide-y divide-gray-50">
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Client Name *</label>
              <input
                name="clientName"
                value={form.clientName}
                onChange={set}
                required
                placeholder="Acme Corp"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Client Email</label>
              <input
                name="clientEmail"
                type="email"
                value={form.clientEmail}
                onChange={set}
                placeholder="billing@acme.com"
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
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                <select
                  name="frequency"
                  value={form.frequency}
                  onChange={set}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={set}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
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
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-recurring-form"
            disabled={saving}
            className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------
export function RecurringClient({
  records: initialRecords,
  tenantId,
}: {
  records: RecurringInvoice[];
  tenantId: string;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [showNew, setShowNew] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = async (rec: RecurringInvoice) => {
    const current = getStatus(rec);
    const next = current === 'paused' ? 'active' : 'paused';
    setTogglingId(rec.id);
    try {
      const res = await fetch(`/api/veska/finance/recurring/${rec.id}`, {
        method: 'PATCH',
        headers: authHeaders(tenantId),
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== rec.id) return r;
          if (r.data) return { ...r, data: { ...r.data, status: next } };
          return { ...r, status: next };
        }),
      );
      showToastMsg(`Recurring invoice ${next}`);
    } catch {
      showToastMsg('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="px-8 py-8 max-w-5xl">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-gray-900 text-white">
          {toast}
        </div>
      )}

      {showNew && (
        <NewRecurringSlideover
          tenantId={tenantId}
          onClose={() => setShowNew(false)}
          onCreated={(r) => {
            setRecords((prev) => [r, ...prev]);
            setShowNew(false);
            showToastMsg('Recurring invoice created');
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <RefreshCw size={22} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Recurring Invoices</h1>
            <p className="text-sm text-gray-500 mt-0.5">Automatically generate invoices on a schedule.</p>
          </div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New Recurring Invoice
        </button>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-20 text-center">
          <RefreshCw size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 font-medium mb-1">No recurring invoices yet</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mb-5">
            Set up templates to automatically generate invoices for recurring customers.
          </p>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} />
            Create your first template
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Frequency</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Next Due</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => {
                const status = getStatus(rec);
                const currency = getCurrency(rec);
                const isPaused = status === 'paused';
                return (
                  <tr key={rec.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{getClientName(rec)}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">
                      {FREQUENCY_LABELS[getFrequency(rec)] ?? getFrequency(rec)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {fmt(getAmount(rec), currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{getNextDue(rec)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void handleToggle(rec)}
                        disabled={togglingId === rec.id}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                        title={isPaused ? 'Resume' : 'Pause'}
                      >
                        {isPaused ? <Play size={11} /> : <Pause size={11} />}
                        {togglingId === rec.id ? '…' : isPaused ? 'Resume' : 'Pause'}
                      </button>
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
