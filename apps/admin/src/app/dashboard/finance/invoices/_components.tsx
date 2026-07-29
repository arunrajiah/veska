'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, Send, X, Download, RefreshCw } from 'lucide-react';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents.js';
import { BulkActionBar } from '@/components/bulk-action-bar.js';
import { formatCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency.js';
import type { Invoice } from './page.js';
import { useTranslations } from 'next-intl';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

function fmt(value: unknown, currency = 'USD'): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  if (isNaN(num)) return formatCurrency(0, currency);
  return formatCurrency(num, currency);
}

function getStatus(inv: Invoice): string {
  return inv.data.status ?? 'draft';
}

function getTotal(inv: Invoice): number {
  const t = inv.data.total ?? inv.data.subtotal ?? inv.data.amount ?? 0;
  return typeof t === 'number' ? t : parseFloat(String(t)) || 0;
}

function getClientName(inv: Invoice): string {
  return (
    inv.data.clientName ??
    inv.data.customer ??
    inv.data.customer_name ??
    inv.data.customerName ??
    '—'
  );
}

function getInvoiceNumber(inv: Invoice): string {
  return inv.data.invoiceNumber ?? inv.data.number ?? inv.id.slice(0, 8).toUpperCase();
}

function getDueDate(inv: Invoice): string {
  const d = inv.data.dueDate ?? inv.data.due_date ?? '';
  return d ? d.slice(0, 10) : '—';
}

function getIssuedAt(inv: Invoice): string {
  const d = inv.data.issuedAt ?? inv.data.issue_date ?? inv.data.issueDate ?? inv.createdAt ?? '';
  return d ? d.slice(0, 10) : '—';
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
  viewed: 'bg-indigo-100 text-indigo-700',
  void: 'bg-gray-100 text-gray-400',
};

type FilterTab = 'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'recurring';

// ── Recurring schedule types (for the list tab) ────────────────

interface RecurringScheduleRow {
  id: string;
  templateInvoiceId: string;
  frequency: string;
  nextRunAt: string;
  lastRunAt?: string | null;
  enabled: boolean;
}

const FREQ_LABELS_LIST: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

// ── Recurring tab panel ────────────────────────────────────────

function RecurringTab({ tenantId }: { tenantId: string }) {
  const [schedules, setSchedules] = useState<RecurringScheduleRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/veska/recurring-invoices`, {
      headers: {
        'X-Veska-Tenant-Id': tenantId,
        'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
      },
    })
      .then((r) => r.json())
      .then((data) => setSchedules(Array.isArray(data) ? (data as RecurringScheduleRow[]) : []))
      .catch(() => setSchedules([]))
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-8 py-12 text-center">
        <p className="text-sm text-gray-400">Loading recurring schedules…</p>
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
        <RefreshCw size={32} className="mx-auto mb-3 text-gray-300" />
        <p className="text-gray-400 text-sm">No recurring invoice schedules.</p>
        <p className="text-gray-400 text-xs mt-1">
          Open an invoice and set up a recurring schedule from the invoice detail page.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Invoice</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Frequency</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Next Run</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Last Run</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                  {s.templateInvoiceId.slice(0, 8).toUpperCase()}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {FREQ_LABELS_LIST[s.frequency] ?? s.frequency}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                  {s.nextRunAt ? s.nextRunAt.slice(0, 10) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {s.lastRunAt ? s.lastRunAt.slice(0, 10) : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {s.enabled ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/finance/invoices/${s.templateInvoiceId}`}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    View Invoice →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Invoice Slide-over
// ---------------------------------------------------------------------------
interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface NewInvoiceSlideoverProps {
  onClose: () => void;
  onCreated: (inv: Invoice) => void;
  tenantId: string;
}

function NewInvoiceSlideover({ onClose, onCreated, tenantId }: NewInvoiceSlideoverProps) {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDays = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [convertedTotal, setConvertedTotal] = useState<number | null>(null);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    dueDate: thirtyDays,
    issuedAt: today,
    notes: '',
    taxPct: '0',
    currency: 'USD',
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);

  const set = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const addLine = () =>
    setLineItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);

  const removeLine = (i: number) => setLineItems((prev) => prev.filter((_, idx) => idx !== i));

  const updateLine = (i: number, field: keyof LineItem, value: string | number) =>
    setLineItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, [field]: value } : li)));

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const taxPct = parseFloat(form.taxPct) || 0;
  const taxAmount = (subtotal * taxPct) / 100;
  const total = subtotal + taxAmount;

  // Fetch conversion hint when currency != USD and total > 0
  useEffect(() => {
    if (form.currency === 'USD' || total <= 0) {
      setConvertedTotal(null);
      return;
    }
    const controller = new AbortController();
    setConversionLoading(true);
    fetch(`/api/veska/currencies/convert?from=${form.currency}&to=USD&amount=${total}`, {
      headers: {
        'X-Veska-Tenant-Id': tenantId,
        'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
      },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { converted?: number }) => {
        if (typeof data.converted === 'number') setConvertedTotal(data.converted);
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => setConversionLoading(false));
    return () => controller.abort();
  }, [form.currency, total, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim()) {
      setError('Client name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        clientName: form.clientName,
        clientEmail: form.clientEmail || undefined,
        dueDate: form.dueDate,
        issuedAt: form.issuedAt,
        notes: form.notes || undefined,
        currency: form.currency,
        subtotal,
        tax: taxAmount,
        total,
        lineItems: lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          total: li.quantity * li.unitPrice,
        })),
        status: 'draft',
      };
      const res = await fetch(`/api/veska/finance/invoices`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = (await res.json()) as Invoice;
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold text-gray-900">New Invoice</h2>
          <button
            onClick={onClose}
            aria-label="Close new invoice panel"
            className="text-gray-400 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <form
          id="new-invoice-form"
          onSubmit={(e) => void handleSubmit(e)}
          className="flex-1 overflow-y-auto divide-y divide-gray-50"
        >
          {/* Client info */}
          <div className="px-5 py-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</h3>
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
          </div>

          {/* Dates + currency */}
          <div className="px-5 py-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Issue Date</label>
                <input
                  name="issuedAt"
                  type="date"
                  value={form.issuedAt}
                  onChange={set}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Due Date</label>
                <input
                  name="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={set}
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
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Line Items
            </h3>
            <div className="space-y-2">
              {lineItems.map((li, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={li.description}
                    onChange={(e) => updateLine(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="1"
                    value={li.quantity}
                    onChange={(e) => updateLine(i, 'quantity', Number(e.target.value))}
                    className="w-14 px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-center"
                    placeholder="Qty"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={li.unitPrice}
                    onChange={(e) => updateLine(i, 'unitPrice', Number(e.target.value))}
                    className="w-20 px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-right"
                    placeholder="Price"
                  />
                  <span className="w-18 text-right text-xs text-gray-600 font-medium shrink-0 min-w-[4.5rem]">
                    {fmt(li.quantity * li.unitPrice, form.currency)}
                  </span>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="text-gray-300 hover:text-red-400 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLine}
              className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Plus size={13} /> Add line
            </button>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>{fmt(subtotal, form.currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">Tax %</span>
                <input
                  name="taxPct"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.taxPct}
                  onChange={set}
                  className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-right"
                />
              </div>
              {taxPct > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Tax ({taxPct}%)</span>
                  <span>{fmt(taxAmount, form.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1 border-t border-gray-100">
                <span>Total</span>
                <span>{fmt(total, form.currency)}</span>
              </div>
              {form.currency !== 'USD' && total > 0 && (
                <div className="text-xs text-gray-400 text-right mt-1">
                  {conversionLoading
                    ? 'Converting…'
                    : convertedTotal !== null
                      ? `≈ ${formatCurrency(convertedTotal, 'USD')} USD at current rates`
                      : null}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="px-5 py-4">
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={set}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
            />
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
            form="new-invoice-form"
            disabled={saving}
            className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------
export function InvoicesClient({
  invoices: initialInvoices,
  tenantId,
  openNew,
}: {
  invoices: Invoice[];
  tenantId: string;
  openNew: boolean;
}) {
  const router = useRouter();
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const [invoices, setInvoices] = useState(initialInvoices);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showNew, setShowNew] = useState(openNew);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Realtime: refresh invoice list when invoice events arrive via SSE
  const handleRealtimeUpdate = useCallback(() => {
    setIsUpdating(true);
    startTransition(() => {
      router.refresh();
    });
    setTimeout(() => setIsUpdating(false), 1_500);
  }, [router]);

  useRealtimeEvents(['invoice.created', 'invoice.sent', 'invoice.paid'], handleRealtimeUpdate);

  const filtered =
    activeTab === 'all' ? invoices : invoices.filter((inv) => getStatus(inv) === activeTab);

  const allVisibleSelected = filtered.length > 0 && filtered.every((inv) => selected.has(inv.id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((inv) => next.delete(inv.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((inv) => next.add(inv.id));
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

  const handleBulkAction = async (action: 'send' | 'void' | 'delete') => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch(`/api/veska/finance/invoices/bulk`, {
        method: 'POST',
        headers: authHeaders(),
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
            : `${result.processed} invoice${result.processed !== 1 ? 's' : ''} ${action === 'delete' ? 'deleted' : action === 'void' ? 'voided' : 'sent'}`,
        type: failCount > 0 ? 'error' : 'success',
      });
      setSelected(new Set());
      startTransition(() => router.refresh());
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
  const totalInvoiced = invoices.reduce((s, inv) => s + getTotal(inv), 0);
  const outstanding = invoices
    .filter((inv) => ['sent', 'overdue', 'partial'].includes(getStatus(inv)))
    .reduce((s, inv) => s + getTotal(inv), 0);
  const overdue = invoices
    .filter((inv) => getStatus(inv) === 'overdue')
    .reduce((s, inv) => s + getTotal(inv), 0);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidThisMonth = invoices
    .filter((inv) => {
      if (getStatus(inv) !== 'paid') return false;
      const d = new Date(inv.updatedAt ?? inv.createdAt);
      return d >= startOfMonth;
    })
    .reduce((s, inv) => s + getTotal(inv), 0);

  const handleSend = async (inv: Invoice) => {
    setSendingId(inv.id);
    try {
      const res = await fetch(`/api/veska/finance/invoices/${inv.id}/send`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      setInvoices((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, data: { ...i.data, status: 'sent' } } : i)),
      );
      setToast({ message: 'Invoice sent successfully', type: 'success' });
    } catch {
      setToast({ message: 'Failed to send invoice', type: 'error' });
    } finally {
      setSendingId(null);
    }
  };

  const tabs: FilterTab[] = ['all', 'draft', 'sent', 'paid', 'overdue', 'recurring'];

  return (
    <div className="px-4 sm:px-8 py-8 max-w-6xl">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {showNew && (
        <NewInvoiceSlideover
          tenantId={tenantId}
          onClose={() => {
            setShowNew(false);
            router.replace('/dashboard/finance/invoices');
          }}
          onCreated={(inv) => {
            setInvoices((prev) => [inv, ...prev]);
            setShowNew(false);
            router.replace('/dashboard/finance/invoices');
            setToast({ message: 'Invoice created', type: 'success' });
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{t('title')}</h1>
          {isUpdating && <span className="text-xs text-gray-400 animate-pulse">Updating…</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`/api/veska/finance/invoices/export?format=csv`, '_blank')}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={15} />
            {tCommon('export')}
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={15} />
            {t('newInvoice')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Invoiced', value: fmt(totalInvoiced) },
          { label: 'Outstanding', value: fmt(outstanding), color: 'text-blue-700' },
          { label: 'Overdue', value: fmt(overdue), color: 'text-red-600' },
          { label: 'Paid This Month', value: fmt(paidThisMonth), color: 'text-green-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-semibold ${color ?? 'text-gray-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
              activeTab === tab
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Recurring tab */}
      {activeTab === 'recurring' && <RecurringTab tenantId={tenantId} />}

      {/* Invoice table (hidden when recurring tab is active) */}
      {activeTab !== 'recurring' &&
        (filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
            <p className="text-gray-400 text-sm">No invoices found.</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <Plus size={14} /> Create first invoice
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th scope="col" className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleAll}
                          aria-label="Select all invoices"
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                      </th>
                      <th
                        scope="col"
                        className="text-left px-4 py-3 text-xs font-medium text-gray-500"
                      >
                        {t('invoiceNumber')}
                      </th>
                      <th
                        scope="col"
                        className="text-left px-4 py-3 text-xs font-medium text-gray-500"
                      >
                        {t('customer')}
                      </th>
                      <th
                        scope="col"
                        className="text-left px-4 py-3 text-xs font-medium text-gray-500"
                      >
                        {tCommon('status')}
                      </th>
                      <th
                        scope="col"
                        className="text-right px-4 py-3 text-xs font-medium text-gray-500"
                      >
                        {tCommon('amount')}
                      </th>
                      <th
                        scope="col"
                        className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden sm:table-cell"
                      >
                        {t('dueDate')}
                      </th>
                      <th
                        scope="col"
                        className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden sm:table-cell"
                      >
                        {t('issuedDate')}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-xs font-medium text-gray-500 text-right"
                      >
                        {tCommon('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => {
                      const status = getStatus(inv);
                      const currency = inv.data.currency ?? 'USD';
                      const isChecked = selected.has(inv.id);
                      return (
                        <tr
                          key={inv.id}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              router.push(`/dashboard/finance/invoices/${inv.id}`);
                            }
                          }}
                          onClick={() => router.push(`/dashboard/finance/invoices/${inv.id}`)}
                          className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset ${isChecked ? 'bg-blue-50/30' : ''}`}
                        >
                          <td
                            className="px-4 py-3 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleOne(inv.id);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleOne(inv.id)}
                              aria-label={`Select invoice ${getInvoiceNumber(inv)}`}
                              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">
                            {getInvoiceNumber(inv)}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {getClientName(inv)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              aria-label={`Status: ${status}`}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {fmt(getTotal(inv), currency)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                            {getDueDate(inv)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                            {getIssuedAt(inv)}
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              {status === 'draft' && (
                                <button
                                  onClick={() => void handleSend(inv)}
                                  disabled={sendingId === inv.id}
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-100 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Send size={11} />
                                  {sendingId === inv.id ? 'Sending…' : 'Send'}
                                </button>
                              )}
                              <Link
                                href={`/dashboard/finance/invoices/${inv.id}`}
                                className="text-xs text-gray-500 hover:text-gray-900"
                              >
                                View →
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <BulkActionBar
              selectedCount={selected.size}
              onClear={() => setSelected(new Set())}
              actions={[
                {
                  label: bulkLoading ? 'Processing…' : 'Send All',
                  onClick: () => void handleBulkAction('send'),
                },
                {
                  label: 'Void All',
                  onClick: () => void handleBulkAction('void'),
                  variant: 'danger',
                },
                {
                  label: 'Delete All',
                  onClick: () => void handleBulkAction('delete'),
                  variant: 'danger',
                },
              ]}
            />
          </>
        ))}
    </div>
  );
}
