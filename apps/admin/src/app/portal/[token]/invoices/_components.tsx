'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface PortalInvoice {
  id: string;
  invoiceNumber?: string;
  number?: string;
  issuedAt?: string;
  dueDate?: string;
  total?: number;
  currency?: string;
  status?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function formatAmount(amount?: number, currency = 'USD'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const STATUS_BADGE: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
  sent: 'bg-blue-100 text-blue-700',
  draft: 'bg-gray-100 text-gray-600',
};

function PayNowButton({
  token,
  invoiceId,
  invoiceNumber,
  amount,
}: {
  token: string;
  invoiceId: string;
  invoiceNumber?: string;
  amount?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('portal');

  const handlePay = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/portal/${encodeURIComponent(token)}/invoices/${encodeURIComponent(invoiceId)}/pay`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      );
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to initiate payment');
      }
      const { checkoutUrl } = (await res.json()) as { checkoutUrl: string | null };
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setLoading(false);
    }
  }, [token, invoiceId]);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => {
          void handlePay();
        }}
        disabled={loading}
        aria-disabled={loading}
        aria-label={`Pay invoice ${invoiceNumber ?? invoiceId}${amount ? ` for ${amount}` : ''}`}
        className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
      >
        {loading ? 'Redirecting…' : t('payNow')}
      </button>
      {error && (
        <span role="alert" aria-live="assertive" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}

export function PortalInvoiceList({
  invoices,
  token,
  payment,
}: {
  invoices: PortalInvoice[];
  token: string;
  payment?: string;
}) {
  const router = useRouter();
  const t = useTranslations('portal');

  return (
    <div>
      {/* Payment banners */}
      {payment === 'success' && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800"
        >
          <span className="text-green-500">&#10003;</span>
          {t('paymentSuccess')}
        </div>
      )}
      {payment === 'cancelled' && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
        >
          <span>&#9888;</span>
          {t('paymentCancelled')}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('invoices')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => router.push(`/portal/${token}`)}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">{t('noInvoices')}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th scope="col" className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Invoice #
                </th>
                <th scope="col" className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Date
                </th>
                <th scope="col" className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Amount
                </th>
                <th scope="col" className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Status
                </th>
                <th scope="col" className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Due Date
                </th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => {
                const status = inv.status ?? 'pending';
                const invoiceNum = inv.invoiceNumber ?? inv.number ?? `INV-${inv.id.slice(0, 6)}`;
                const canPay =
                  status === 'draft' ||
                  status === 'sent' ||
                  status === 'pending' ||
                  status === 'overdue';
                return (
                  <tr key={inv.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{invoiceNum}</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(inv.issuedAt)}</td>
                    <td className="px-5 py-3 text-gray-900 font-medium">
                      {formatAmount(inv.total, inv.currency ?? 'USD')}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        aria-label={`Status: ${status}`}
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(inv.dueDate)}</td>
                    <td className="px-5 py-3 text-right">
                      {canPay ? (
                        <PayNowButton
                          token={token}
                          invoiceId={inv.id}
                          invoiceNumber={invoiceNum}
                          amount={formatAmount(inv.total, inv.currency ?? 'USD')}
                        />
                      ) : null}
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
