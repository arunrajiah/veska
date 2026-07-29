'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Trash2 } from 'lucide-react';
import Link from 'next/link';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
const IDENTITY_ID = process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin';

function fmtHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': IDENTITY_ID,
  };
}

function formatCurrency(val: unknown) {
  const n = typeof val === 'number' ? val : parseFloat(String(val ?? '0'));
  if (isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export interface OrderRecord {
  id: string;
  data: {
    orderNumber?: string;
    customerId?: string;
    customerName?: string;
    status?: string;
    items?: Array<{
      productId?: string;
      productName?: string;
      quantity?: number;
      unitPrice?: number;
      total?: number;
    }>;
    subtotal?: number;
    tax?: number;
    total?: number;
    shippingAddress?: string;
    orderDate?: string;
    deliveryDate?: string;
  };
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
};

function OrderStatusBadge({ status }: { status?: string | undefined }) {
  const s = status ?? 'pending';
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-600'}`}>{s}</span>;
}

interface OrderItem {
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

function NewOrderSlideOver({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ productName: '', quantity: 1, unitPrice: 0 }]);

  function addItem() {
    setItems((prev) => [...prev, { productName: '', quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof OrderItem, value: string | number) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function calcItemTotal(item: OrderItem) {
    return (item.quantity ?? 0) * (item.unitPrice ?? 0);
  }

  const subtotal = items.reduce((sum, item) => sum + calcItemTotal(item), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const orderItems = items.map((item) => ({
      productName: item.productName ?? '',
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice ?? 0,
      total: calcItemTotal(item),
    }));
    const body = {
      customerName: fd.get('customerName') as string,
      shippingAddress: (fd.get('shippingAddress') as string) || undefined,
      deliveryDate: (fd.get('deliveryDate') as string) || undefined,
      items: orderItems,
      subtotal,
      tax,
      total,
      status: 'pending',
      orderDate: new Date().toISOString().slice(0, 10),
    };
    try {
      const res = await fetch(`/api/veska/sales/orders`, {
        method: 'POST',
        headers: fmtHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name *</label>
            <input name="customerName" required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Shipping Address</label>
            <textarea name="shippingAddress" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Date</label>
            <input name="deliveryDate" type="date" className={inputClass} />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Order Items</label>
              <button type="button" onClick={addItem}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                <Plus size={12} /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input
                      placeholder="Product name"
                      value={item.productName ?? ''}
                      onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min="1"
                      placeholder="Qty"
                      value={item.quantity ?? 1}
                      onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number" min="0" step="0.01"
                      placeholder="Unit price"
                      value={item.unitPrice ?? 0}
                      onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div className="col-span-1 text-xs text-gray-500 text-right">
                    {formatCurrency(calcItemTotal(item))}
                  </div>
                  <div className="col-span-1">
                    <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
                      className="text-gray-300 hover:text-red-500 disabled:opacity-20">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right space-y-0.5">
              <p className="text-xs text-gray-500">Subtotal: {formatCurrency(subtotal)}</p>
              <p className="text-xs text-gray-500">Tax (10%): {formatCurrency(tax)}</p>
              <p className="text-sm font-semibold text-gray-900">Total: {formatCurrency(total)}</p>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create Order'}
            </button>
            <button type="button" onClick={onClose} className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type FilterTab = 'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export function OrdersClient({ orders: initial }: { orders: OrderRecord[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showAdd, setShowAdd] = useState(false);

  const totalOrders = initial.length;
  const pending = initial.filter((o) => (o.data.status ?? 'pending') === 'pending').length;
  const shipped = initial.filter((o) => o.data.status === 'shipped').length;

  const now = new Date();
  const thisMonthRevenue = initial
    .filter((o) => {
      if (o.data.status === 'cancelled') return false;
      const d = o.data.orderDate ?? o.createdAt ?? '';
      if (!d) return false;
      const dt = new Date(d);
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    })
    .reduce((sum, o) => sum + (o.data.total ?? 0), 0);

  const filtered = initial.filter((o) => {
    if (filter === 'all') return true;
    return (o.data.status ?? 'pending') === filter;
  });

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="px-8 py-8 max-w-7xl">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Orders', value: totalOrders },
          { label: 'Pending', value: pending },
          { label: 'Shipped', value: shipped },
          { label: 'Revenue This Month', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(thisMonthRevenue) },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Sales Orders</h1>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
          <Plus size={15} /> New Order
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === t.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No orders found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Order #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Customer</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Items</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Order Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Delivery Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const d = order.data;
                const orderNum = d.orderNumber ?? order.id.slice(0, 8).toUpperCase();
                const itemCount = d.items?.length ?? 0;
                return (
                  <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/sales/orders/${order.id}`}
                        className="font-mono text-xs text-gray-600 hover:text-gray-900 hover:underline">
                        {orderNum}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{d.customerName || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{itemCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(d.total ?? 0)}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{d.orderDate ? d.orderDate.slice(0, 10) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{d.deliveryDate ? d.deliveryDate.slice(0, 10) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/sales/orders/${order.id}`}
                        className="text-xs text-gray-500 hover:text-gray-900">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <NewOrderSlideOver
          onClose={() => setShowAdd(false)}
          onSaved={() => startTransition(() => router.refresh())}
        />
      )}
    </div>
  );
}
