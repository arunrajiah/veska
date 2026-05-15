'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, CheckCircle, Download, Sparkles } from 'lucide-react';
import type { InvoiceRecord } from './page.js';

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
      const res = await fetch(`${API_BASE}/api/v1/ai/enrich/${invoiceId}`, {
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
      const res = await fetch(`${API_BASE}/api/v1/finance/invoices/${record.id}/send`, {
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
      const res = await fetch(`${API_BASE}/api/v1/finance/invoices/${record.id}`, {
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
          <button
            onClick={() => alert('PDF download not yet implemented')}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            Download PDF
          </button>
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
                <p className="text-sm font-medium text-gray-900">Veska Inc.</p>
                <p className="text-xs text-gray-500">billing@veska.io</p>
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
      await fetch(`${API_BASE}/api/v1/finance/invoices/${invoiceId}/send`, {
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
      await fetch(`${API_BASE}/api/v1/finance/invoices/${invoiceId}`, {
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
