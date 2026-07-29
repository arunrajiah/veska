'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface GRN {
  id: string;
  data: {
    grnNumber?: string;
    status?: string;
    receivedDate?: string;
    items?: Array<{ description: string; orderedQty: number; receivedQty: number }>;
  };
}

export interface PurchaseOrder {
  id: string;
  data: {
    poNumber?: string;
    vendorId?: string;
    vendorName?: string;
    status?: string;
    items?: LineItem[];
    subtotal?: number;
    tax?: number;
    total?: number;
    orderDate?: string;
    expectedDate?: string;
    notes?: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  acknowledged: 'bg-indigo-100 text-indigo-700',
  partial: 'bg-orange-100 text-orange-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

const GRN_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  partial: 'bg-orange-100 text-orange-700',
  complete: 'bg-green-100 text-green-700',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtMoney(n?: number) {
  if (n == null) return '$0.00';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function reqHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

export function OrderDetailClient({
  order,
  grns: initialGRNs,
}: {
  order: PurchaseOrder;
  grns: GRN[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [grns] = useState(initialGRNs);

  const d = order.data;
  const status = d.status ?? 'draft';
  const items = d.items ?? [];

  async function patchStatus(newStatus: string) {
    setActionLoading(newStatus);
    try {
      await fetch(`/api/veska/purchasing/orders/${order.id}`, {
        method: 'PATCH',
        headers: reqHeaders(),
        body: JSON.stringify({ data: { status: newStatus } }),
      });
      startTransition(() => router.refresh());
    } finally {
      setActionLoading(null);
    }
  }

  async function createGRN() {
    setActionLoading('grn');
    try {
      const res = await fetch(`/api/veska/grn`, {
        method: 'POST',
        headers: reqHeaders(),
        body: JSON.stringify({
          data: {
            poId: order.id,
            poNumber: d.poNumber ?? order.id.slice(0, 8).toUpperCase(),
            vendorName: d.vendorName ?? '',
            status: 'pending',
            receivedDate: new Date().toISOString().slice(0, 10),
            items: items.map((item) => ({
              description: item.description,
              orderedQty: item.quantity,
              receivedQty: 0,
            })),
          },
        }),
      });
      if (res.ok) {
        router.push('/dashboard/purchasing/grn');
      }
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      <Link
        href="/dashboard/purchasing/orders"
        className="text-sm text-gray-500 hover:text-gray-900 mb-6 inline-block"
      >
        ← Purchase Orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 font-mono">
              {d.poNumber ?? order.id.slice(0, 8).toUpperCase()}
            </h1>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {status}
            </span>
          </div>
          {d.vendorName && <p className="text-sm text-gray-500 mt-1">{d.vendorName}</p>}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2">
          {status === 'draft' && (
            <button
              onClick={() => void patchStatus('sent')}
              disabled={actionLoading !== null}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'sent' ? 'Sending…' : 'Send PO'}
            </button>
          )}
          {['sent', 'acknowledged', 'partial'].includes(status) && (
            <button
              onClick={() => void createGRN()}
              disabled={actionLoading !== null}
              className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'grn' ? 'Creating…' : 'Receive Goods'}
            </button>
          )}
          {!['received', 'cancelled'].includes(status) && (
            <button
              onClick={() => void patchStatus('cancelled')}
              disabled={actionLoading !== null}
              className="border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'cancelled' ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: PO body */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-6">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  Vendor
                </p>
                <p className="text-gray-800">{d.vendorName ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  Order Date
                </p>
                <p className="text-gray-800">{fmtDate(d.orderDate)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  Expected Date
                </p>
                <p className="text-gray-800">{fmtDate(d.expectedDate)}</p>
              </div>
              {d.notes && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                    Notes
                  </p>
                  <p className="text-gray-600">{d.notes}</p>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Line Items
                </p>
                <div className="overflow-hidden border border-gray-100 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                          Description
                        </th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">
                          Qty
                        </th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">
                          Unit Price
                        </th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-2.5 text-gray-700">{item.description}</td>
                          <td className="px-4 py-2.5 text-gray-600 text-right">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-gray-600 text-right">
                            {fmtMoney(item.unitPrice)}
                          </td>
                          <td className="px-4 py-2.5 text-gray-800 text-right font-medium">
                            {fmtMoney(item.total ?? item.quantity * item.unitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {d.subtotal != null && (
                        <tr className="border-t border-gray-100">
                          <td colSpan={3} className="px-4 py-2 text-xs text-gray-500 text-right">
                            Subtotal
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 text-right">
                            {fmtMoney(d.subtotal)}
                          </td>
                        </tr>
                      )}
                      {d.tax != null && d.tax > 0 && (
                        <tr className="border-t border-gray-100">
                          <td colSpan={3} className="px-4 py-2 text-xs text-gray-500 text-right">
                            Tax
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 text-right">
                            {fmtMoney(d.tax)}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <td
                          colSpan={3}
                          className="px-4 py-2.5 text-sm font-semibold text-gray-700 text-right"
                        >
                          Grand Total
                        </td>
                        <td className="px-4 py-2.5 text-sm font-bold text-gray-900 text-right">
                          {fmtMoney(d.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar: GRNs + timeline */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Goods Received ({grns.length})
            </p>
            {grns.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No GRNs yet.</p>
            ) : (
              <div className="space-y-2">
                {grns.map((grn) => {
                  const gs = grn.data.status ?? 'pending';
                  return (
                    <div
                      key={grn.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="text-xs font-mono text-gray-700">
                          {grn.data.grnNumber ?? grn.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-400">{fmtDate(grn.data.receivedDate)}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${GRN_STATUS_COLORS[gs] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {gs}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <Link
              href="/dashboard/purchasing/grn"
              className="mt-3 block text-xs text-gray-500 hover:text-gray-900 text-center"
            >
              View all GRNs →
            </Link>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Timeline
            </p>
            <ol className="relative border-l border-gray-200 space-y-4 ml-2">
              {[
                { label: 'Order created', date: d.orderDate, active: true },
                {
                  label: 'PO sent',
                  date: undefined,
                  active: ['sent', 'acknowledged', 'partial', 'received'].includes(status),
                },
                {
                  label: 'Acknowledged',
                  date: undefined,
                  active: ['acknowledged', 'partial', 'received'].includes(status),
                },
                {
                  label: 'Goods received',
                  date: undefined,
                  active: ['partial', 'received'].includes(status),
                },
              ].map((ev, i) => (
                <li key={i} className="ml-4">
                  <div
                    className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 ${ev.active ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}
                  />
                  <p
                    className={`text-xs font-medium ${ev.active ? 'text-gray-900' : 'text-gray-400'}`}
                  >
                    {ev.label}
                  </p>
                  {ev.date && ev.active && (
                    <p className="text-xs text-gray-400">{fmtDate(ev.date)}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

// Legacy export for backward compat
export default function StatusButtons({
  orderId,
  currentStatus,
  tenantId,
  poNumber,
}: {
  orderId: string;
  currentStatus: string;
  tenantId: string;
  poNumber: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(status: string) {
    setLoading(status);
    try {
      await fetch(`/api/veska/purchasing/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Veska-Tenant-Id': tenantId },
        body: JSON.stringify({ data: { status } }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {currentStatus === 'draft' && (
        <button
          onClick={() => void updateStatus('sent')}
          disabled={loading !== null}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'sent' ? 'Updating…' : 'Mark as Sent'}
        </button>
      )}
      {!['received', 'cancelled'].includes(currentStatus) && (
        <button
          onClick={() => void updateStatus('cancelled')}
          disabled={loading !== null}
          className="border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {loading === 'cancelled' ? 'Updating…' : 'Cancel'}
        </button>
      )}
    </div>
  );
}
