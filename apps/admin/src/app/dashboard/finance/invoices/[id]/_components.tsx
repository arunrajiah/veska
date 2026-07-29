'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, CheckCircle, Download, Printer, Sparkles, RefreshCw, X } from 'lucide-react';
import type { InvoiceRecord } from './page.js';

// ── Types ──────────────────────────────────────────────────────

type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface RecurringSchedule {
  id: string;
  templateInvoiceId: string;
  frequency: Frequency;
  nextRunAt: string;
  lastRunAt?: string | null;
  dayOfMonth?: number | null;
  enabled: boolean;
}

// ── Helpers ────────────────────────────────────────────────────

function calculateNextRun(frequency: Frequency, from: Date): Date {
  const d = new Date(from);
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

const FREQ_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

// ── Recurring Schedule Section ─────────────────────────────────

function RecurringSection({
  invoiceId,
  tenantId,
}: {
  invoiceId: string;
  tenantId: string;
}) {
  const [schedule, setSchedule] = useState<RecurringSchedule | null | undefined>(undefined); // undefined = not loaded
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form state
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [startDate, setStartDate] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Lazy-load on first render
  const loadSchedule = async () => {
    if (schedule !== undefined) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/veska/finance/invoices/${invoiceId}/recurring`, {
        headers: authHeaders(tenantId),
      });
      if (res.ok) {
        const data = await res.json() as RecurringSchedule | null;
        setSchedule(data);
      } else {
        setSchedule(null);
      }
    } catch {
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  };

  // Load on section mount
  if (schedule === undefined && !loading) {
    void loadSchedule();
  }

  const openModal = () => {
    if (schedule) {
      setFrequency(schedule.frequency);
      setDayOfMonth(schedule.dayOfMonth?.toString() ?? '');
      setStartDate('');
    } else {
      setFrequency('monthly');
      setDayOfMonth('');
      setStartDate('');
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        frequency,
        enabled: true,
      };
      if (dayOfMonth) body['dayOfMonth'] = parseInt(dayOfMonth, 10);
      if (startDate) body['startDate'] = startDate;

      const res = await fetch(`/api/veska/finance/invoices/${invoiceId}/recurring`, {
        method: 'POST',
        headers: authHeaders(tenantId),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json() as RecurringSchedule;
      setSchedule(updated);
      setModalOpen(false);
      showToast('Recurring schedule saved');
    } catch {
      showToast('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!schedule) return;
    const newEnabled = !schedule.enabled;
    try {
      if (!newEnabled) {
        // Disable via DELETE (sets enabled=false)
        await fetch(`/api/veska/finance/invoices/${invoiceId}/recurring`, {
          method: 'DELETE',
          headers: authHeaders(tenantId),
        });
        setSchedule({ ...schedule, enabled: false });
      } else {
        // Re-enable via POST
        const res = await fetch(`/api/veska/finance/invoices/${invoiceId}/recurring`, {
          method: 'POST',
          headers: authHeaders(tenantId),
          body: JSON.stringify({
            frequency: schedule.frequency,
            dayOfMonth: schedule.dayOfMonth ?? undefined,
            enabled: true,
          }),
        });
        const updated = await res.json() as RecurringSchedule;
        setSchedule(updated);
      }
      showToast(newEnabled ? 'Schedule enabled' : 'Schedule disabled');
    } catch {
      showToast('Failed to update schedule');
    }
  };

  // Preview next run date for modal
  const previewDate = calculateNextRun(frequency, startDate ? new Date(startDate) : new Date());

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-gray-900 text-white">
          {toast}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <RefreshCw size={13} className="text-blue-500" />
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recurring</h2>
        </div>
        <div className="px-5 py-4">
          {loading && (
            <p className="text-xs text-gray-400">Loading…</p>
          )}

          {!loading && schedule === null && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">This invoice does not recur.</p>
              <button
                onClick={openModal}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <RefreshCw size={13} />
                Set up recurring
              </button>
            </div>
          )}

          {!loading && schedule && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${schedule.enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {FREQ_LABELS[schedule.frequency]}
                </span>
                {!schedule.enabled && (
                  <span className="text-xs text-gray-400">(paused)</span>
                )}
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Next run: <span className="font-medium text-gray-700">{schedule.nextRunAt.slice(0, 10)}</span></p>
                {schedule.lastRunAt && (
                  <p>Last run: <span className="font-medium text-gray-700">{schedule.lastRunAt.slice(0, 10)}</span></p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => void handleToggle()}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${schedule.enabled ? 'border-gray-200 text-gray-600 hover:bg-gray-50' : 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100'}`}
                >
                  {schedule.enabled ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={openModal}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Set up recurring invoice</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Frequency */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {/* Day of month (monthly/quarterly/yearly) */}
              {frequency !== 'weekly' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Day of month <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    placeholder="e.g. 1 for 1st of month"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Start date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start date <span className="text-gray-400">(optional, defaults to today)</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Preview */}
              <div className="rounded-lg bg-blue-50 px-4 py-3">
                <p className="text-xs text-blue-700">
                  Next invoice will be created on{' '}
                  <span className="font-semibold">{previewDate.toISOString().slice(0, 10)}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setModalOpen(false)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


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

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
  viewed: 'bg-indigo-100 text-indigo-700',
  void: 'bg-gray-100 text-gray-400',
};

function getInvoiceNumber(record: InvoiceRecord): string {
  return record.data.invoiceNumber ?? record.data.number ?? record.id.slice(0, 8).toUpperCase();
}

function getClientName(record: InvoiceRecord): string {
  return record.data.clientName ?? record.data.customer ?? record.data.customer_name ?? '—';
}

function getLineItems(record: InvoiceRecord) {
  if (record.data.lineItems && record.data.lineItems.length > 0) {
    return record.data.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      total: li.total,
    }));
  }
  if (record.data.line_items && record.data.line_items.length > 0) {
    return record.data.line_items.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unit_price,
      total: li.amount,
    }));
  }
  return [];
}

// ---------------------------------------------------------------------------
// AI Insights Panel
// ---------------------------------------------------------------------------
function AIInsights({ invoiceId, tenantId }: { invoiceId: string; tenantId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/veska/ai/enrich/${invoiceId}`, {
        method: 'POST',
        headers: authHeaders(tenantId),
        body: JSON.stringify({ entityType: 'invoice' }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { insights?: string; summary?: string; result?: string };
      setResult(data.insights ?? data.summary ?? data.result ?? JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <Sparkles size={13} className="text-purple-500" />
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Insights</h2>
      </div>
      <div className="px-5 py-4">
        {result ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{result}</p>
        ) : error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : (
          <button
            onClick={() => void analyze()}
            disabled={loading}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50"
          >
            <Sparkles size={14} />
            {loading ? 'Analyzing…' : 'Analyze this invoice'}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invoice Detail Client
// ---------------------------------------------------------------------------
export function InvoiceDetailClient({
  record: initialRecord,
  tenantId,
}: {
  record: InvoiceRecord;
  tenantId: string;
}) {
  const router = useRouter();
  const [record, setRecord] = useState(initialRecord);
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const d = record.data;
  const status = d.status ?? 'draft';
  const currency = d.currency ?? 'USD';
  const lineItems = getLineItems(record);

  const handleSend = async () => {
    setLoading('send');
    try {
      const res = await fetch(`/api/veska/finance/invoices/${record.id}/send`, {
        method: 'POST',
        headers: authHeaders(tenantId),
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      setRecord((prev) => ({ ...prev, data: { ...prev.data, status: 'sent' } }));
      showToast('Invoice sent successfully');
    } catch {
      showToast('Failed to send invoice');
    } finally {
      setLoading(null);
    }
  };

  const handleMarkPaid = async () => {
    setLoading('paid');
    try {
      const res = await fetch(`/api/veska/finance/invoices/${record.id}`, {
        method: 'PATCH',
        headers: authHeaders(tenantId),
        body: JSON.stringify({ status: 'paid' }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRecord((prev) => ({ ...prev, data: { ...prev.data, status: 'paid' } }));
      showToast('Invoice marked as paid');
      router.refresh();
    } catch {
      showToast('Failed to update invoice');
    } finally {
      setLoading(null);
    }
  };

  const canSend = ['draft', 'viewed'].includes(status);
  const canMarkPaid = ['sent', 'overdue', 'viewed', 'partial'].includes(status);

  // Timeline events
  const timeline: Array<{ label: string; date: string | undefined }> = [
    { label: 'Created', date: record.createdAt },
    { label: 'Issued', date: d.issuedAt ?? d.issue_date },
    ...(status === 'sent' || status === 'paid' ? [{ label: 'Sent', date: record.updatedAt }] : []),
    ...(status === 'paid' ? [{ label: 'Paid', date: record.updatedAt }] : []),
  ];

  return (
    <div className="px-8 py-8 max-w-5xl">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-gray-900 text-white">
          {toast}
        </div>
      )}

      <div className="mb-5">
        <Link href="/dashboard/finance/invoices" className="text-xs text-gray-400 hover:text-gray-700">
          ← Invoices
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-gray-900">
              Invoice #{getInvoiceNumber(record)}
            </h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {status}
            </span>
          </div>
          <p className="text-sm text-gray-500">{getClientName(record)}</p>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2">
          {canSend && (
            <button
              onClick={() => void handleSend()}
              disabled={loading !== null}
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Send size={14} />
              {loading === 'send' ? 'Sending…' : 'Send'}
            </button>
          )}
          {canMarkPaid && (
            <button
              onClick={() => void handleMarkPaid()}
              disabled={loading !== null}
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle size={14} />
              {loading === 'paid' ? 'Saving…' : 'Mark as Paid'}
            </button>
          )}
          <Link
            href={`/dashboard/finance/invoices/${record.id}/print`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Printer size={14} />
            Print Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Invoice body — 2 columns */}
        <div className="col-span-2 space-y-4">
          {/* Invoice header card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex justify-between mb-6">
              <div>
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-white text-xs font-bold">V</span>
                </div>
                <p className="text-xs text-gray-400">From</p>
                <p className="text-sm font-medium text-gray-900">Your Company</p>
                <p className="text-xs text-gray-500">billing@example.com</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">To</p>
                <p className="text-sm font-medium text-gray-900">{getClientName(record)}</p>
                {d.clientEmail && (
                  <p className="text-xs text-gray-500">{d.clientEmail}</p>
                )}
              </div>
            </div>

            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Invoice #{getInvoiceNumber(record)}</span>
              <span>
                Due: <span className="font-medium text-gray-700">
                  {(d.dueDate ?? d.due_date ?? '').slice(0, 10) || '—'}
                </span>
              </span>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Items</h2>
            </div>
            {lineItems.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Description</th>
                    <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">Qty</th>
                    <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">Unit Price</th>
                    <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3 text-gray-900">{item.description}</td>
                      <td className="px-5 py-3 text-right text-gray-600">{item.quantity}</td>
                      <td className="px-5 py-3 text-right text-gray-600">{fmt(item.unitPrice, currency)}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">{fmt(item.total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-5 py-4 text-sm text-gray-400">No line items</p>
            )}
            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>{fmt(d.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tax</span>
                <span>{fmt(d.tax, currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{fmt(d.total, currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {d.notes && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h2>
              </div>
              <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">{d.notes}</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Timeline */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timeline</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {timeline.map(({ label, date }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{date ? date.slice(0, 10) : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recurring */}
          <RecurringSection invoiceId={record.id} tenantId={tenantId} />

          {/* AI Insights */}
          <AIInsights invoiceId={record.id} tenantId={tenantId} />
        </div>
      </div>
    </div>
  );
}

// Keep existing exports for backward-compat
export function SendInvoiceButton({ invoiceId, tenantId }: { invoiceId: string; tenantId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const handleSend = async () => {
    setLoading(true);
    try {
      await fetch(`/api/veska/finance/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: authHeaders(tenantId),
        body: JSON.stringify({}),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={() => void handleSend()}
      disabled={loading}
      className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
    >
      {loading ? 'Sending…' : 'Send invoice'}
    </button>
  );
}

export function MarkAsPaidForm({ invoiceId, tenantId }: { invoiceId: string; tenantId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const handle = async () => {
    setLoading(true);
    try {
      await fetch(`/api/veska/finance/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: authHeaders(tenantId),
        body: JSON.stringify({ status: 'paid' }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={() => void handle()}
      disabled={loading}
      className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {loading ? 'Saving…' : 'Mark as paid'}
    </button>
  );
}
