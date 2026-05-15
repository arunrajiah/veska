'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = 'demo-tenant';

export interface PurchaseOrder {
  id: string;
  data: {
    poNumber?: string;
    vendorId?: string;
    vendorName?: string;
    status?: 'draft' | 'sent' | 'acknowledged' | 'partial' | 'received' | 'cancelled';
    items?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
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

const TABS = ['all', 'draft', 'sent', 'acknowledged', 'partial', 'received', 'cancelled'] as const;

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(n?: number) {
  if (n == null) return '$0.00';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

function NewPOSlideOver({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);

  function addItem() {
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? { ...item, [field]: field === 'description' ? value : parseFloat(value) || 0 }
          : item
      )
    );
  }

  const subtotal = items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const lineItems = items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));
    const body = {
      vendorName: fd.get('vendorName') as string,
      expectedDate: (fd.get('expectedDate') as string) || undefined,
      notes: (fd.get('notes') as string) || undefined,
      items: lineItems,
      subtotal,
      tax: 0,
      total: subtotal,
      status: 'draft',
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/purchasing/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': TENANT_ID,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify({ data: body }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PO');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Purchase Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vendor Name *</label>
            <input name="vendorName" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Expected Delivery Date</label>
            <input name="expectedDate" type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea name="notes" rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700">Line Items</label>
              <button type="button" onClick={addItem} className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <Plus size={12} /> Add line
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    {i === 0 && <p className="text-xs text-gray-400 mb-1">Description</p>}
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(i, 'description', e.target.value)}
                      placeholder="Item description"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <p className="text-xs text-gray-400 mb-1">Qty</p>}
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <p className="text-xs text-gray-400 mb-1">Unit Price</p>}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div className="col-span-1 flex items-end justify-center pb-1.5">
                    {i === 0 && <p className="text-xs text-gray-400 mb-1 invisible">×</p>}
                    <p className="text-xs text-gray-500 font-mono">${(item.quantity * item.unitPrice).toFixed(2)}</p>
                  </div>
                  <div className="col-span-1 flex items-end pb-1.5">
                    {i === 0 && <div className="invisible text-xs mb-1">×</div>}
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <p className="text-sm font-semibold text-gray-900">Total: {fmtMoney(subtotal)}</p>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create PO'}
            </button>
            <button type="button" onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function OrdersClient({ orders: initialOrders }: { orders: PurchaseOrder[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<typeof TABS[number]>('all');
  const [showNew, setShowNew] = useState(searchParams.get('new') === 'true');
  const [orders, setOrders] = useState(initialOrders);

  const filtered = tab === 'all' ? orders : orders.filter((o) => o.data.status === tab);

  const stats = {
    total: orders.length,
    draft: orders.filter((o) => o.data.status === 'draft').length,
    sent: orders.filter((o) => o.data.status === 'sent').length,
    received: orders.filter((o) => o.data.status === 'received').length,
    totalValue: orders.reduce((s, o) => s + (o.data.total ?? 0), 0),
  };

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} orders</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New PO
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Draft', value: stats.draft },
          { label: 'Sent', value: stats.sent },
          { label: 'Received', value: stats.received },
          { label: 'Total Value', value: fmtMoney(stats.totalValue) },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
              tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No purchase orders found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">PO #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Vendor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Items</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Order Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Expected</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const status = o.data.status ?? 'draft';
                return (
                  <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/purchasing/orders/${o.id}`} className="font-mono text-xs text-gray-700 hover:text-gray-900">
                        {o.data.poNumber ?? o.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{o.data.vendorName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.data.items?.length ?? 0} item(s)</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">{fmtMoney(o.data.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(o.data.orderDate)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(o.data.expectedDate)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/purchasing/orders/${o.id}`} className="text-xs text-gray-500 hover:text-gray-900">
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

      {showNew && (
        <NewPOSlideOver
          onClose={() => setShowNew(false)}
          onSaved={() => startTransition(() => { router.refresh(); })}
        />
      )}
    </div>
  );
}
