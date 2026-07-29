'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, DollarSign } from 'lucide-react';
import type { ExpenseRecord } from './page.js';


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
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-50 text-yellow-700',
  submitted: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  paid: 'bg-blue-50 text-blue-700',
};

export function ExpenseDetailClient({
  record: initialRecord,
  tenantId,
}: {
  record: ExpenseRecord;
  tenantId: string;
}) {
  const router = useRouter();
  const [record, setRecord] = useState(initialRecord);
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const d = record.data;
  const status = d.status ?? 'draft';
  const currency = d.currency ?? 'USD';
  const isPending = status === 'pending' || status === 'submitted';
  const title = d.title ?? d.description ?? 'Expense';
  const submittedBy = d.submittedBy ?? d.employee_name ?? d.employee_id ?? '—';

  const handleApprove = async () => {
    setLoading('approve');
    try {
      const res = await fetch(`/api/veska/expenses/${record.id}/approve`, {
        method: 'PATCH',
        headers: authHeaders(tenantId),
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      setRecord((prev) => ({ ...prev, data: { ...prev.data, status: 'approved' } }));
      showToastMsg('Expense approved');
      router.refresh();
    } catch {
      showToastMsg('Failed to approve');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading('reject');
    try {
      const res = await fetch(`/api/veska/expenses/${record.id}/reject`, {
        method: 'PATCH',
        headers: authHeaders(tenantId),
        body: JSON.stringify({ notes: rejectNotes || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRecord((prev) => ({ ...prev, data: { ...prev.data, status: 'rejected' } }));
      setShowReject(false);
      showToastMsg('Expense rejected');
      router.refresh();
    } catch {
      showToastMsg('Failed to reject');
    } finally {
      setLoading(null);
    }
  };

  const handleMarkPaid = async () => {
    setLoading('paid');
    try {
      const res = await fetch(`/api/veska/expenses/${record.id}`, {
        method: 'PATCH',
        headers: authHeaders(tenantId),
        body: JSON.stringify({ status: 'paid' }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRecord((prev) => ({ ...prev, data: { ...prev.data, status: 'paid' } }));
      showToastMsg('Marked as paid');
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Submitted By', value: submittedBy },
    { label: 'Category', value: <span className="capitalize">{d.category ?? '—'}</span> },
    {
      label: 'Amount',
      value: <span className="font-semibold text-gray-900">{fmt(d.amount, currency)}</span>,
    },
    { label: 'Currency', value: currency },
    { label: 'Date', value: d.date ? d.date.slice(0, 10) : '—' },
    {
      label: 'Receipt',
      value: d.receiptUrl ? (
        <a
          href={d.receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all"
        >
          {d.receiptUrl}
        </a>
      ) : (
        '—'
      ),
    },
  ];

  return (
    <div className="px-8 py-8 max-w-3xl">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-gray-900 text-white">
          {toast}
        </div>
      )}

      <div className="mb-5">
        <Link href="/dashboard/expenses" className="text-xs text-gray-400 hover:text-gray-700">
          ← Expenses
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {status}
            </span>
            <span className="text-sm text-gray-500 font-medium">{fmt(d.amount, currency)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col items-end gap-2">
          {isPending && (
            <div className="flex gap-2">
              <button
                onClick={() => void handleApprove()}
                disabled={loading !== null}
                className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle size={14} />
                {loading === 'approve' ? 'Approving…' : 'Approve'}
              </button>
              <button
                onClick={() => setShowReject((v) => !v)}
                disabled={loading !== null}
                className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <XCircle size={14} />
                Reject
              </button>
            </div>
          )}
          {status === 'approved' && (
            <button
              onClick={() => void handleMarkPaid()}
              disabled={loading !== null}
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <DollarSign size={14} />
              {loading === 'paid' ? 'Updating…' : 'Mark as Paid'}
            </button>
          )}

          {showReject && (
            <div className="mt-2 w-72">
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
                placeholder="Reason for rejection (optional)"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  onClick={() => { setShowReject(false); setRejectNotes(''); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleReject()}
                  disabled={loading !== null}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading === 'reject' ? 'Rejecting…' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
        </div>
        <dl className="divide-y divide-gray-50">
          {fields.map(({ label, value }) => (
            <div key={label} className="px-5 py-3 flex items-start gap-4">
              <dt className="text-xs text-gray-500 w-28 shrink-0 mt-0.5">{label}</dt>
              <dd className="text-sm text-gray-900">{value || <span className="text-gray-300">—</span>}</dd>
            </div>
          ))}
        </dl>
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
  );
}

// Keep existing export for backward compat
export function ActionButtons({ expenseId, tenantId, currentStatus }: { expenseId: string; tenantId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/veska/expenses/${expenseId}`, {
      method: 'PATCH',
      headers: authHeaders(tenantId),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
  };

  if (currentStatus === 'submitted' || currentStatus === 'pending') {
    return (
      <div className="flex gap-2">
        <button
          onClick={async () => { setLoading('approve'); try { await patch({ status: 'approved' }); router.refresh(); } finally { setLoading(null); } }}
          disabled={loading !== null}
          className="text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading === 'approve' ? 'Approving…' : 'Approve'}
        </button>
        <button
          onClick={async () => { setLoading('reject'); try { await patch({ status: 'rejected' }); router.refresh(); } finally { setLoading(null); } }}
          disabled={loading !== null}
          className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {loading === 'reject' ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
    );
  }
  return null;
}
