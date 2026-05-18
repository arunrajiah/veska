import Link from 'next/link';
import type { Route } from 'next';
import { apiFetch } from '@/lib/api.js';

interface OrderRecord {
  id: string;
  data: {
    orderNumber?: string;
    customerName?: string;
    status?: string;
    total?: number;
    items?: unknown[];
    orderDate?: string;
    deliveryDate?: string;
  };
  createdAt: string;
}

function formatCurrency(val: unknown) {
  const n = typeof val === 'number' ? val : parseFloat(String(val ?? '0'));
  if (isNaN(n)) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
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

export default async function SalesDashboard() {
  let orders: OrderRecord[] = [];

  try {
    const res = await apiFetch<{ data: OrderRecord[] } | OrderRecord[]>('/api/v1/sales/orders?limit=50', process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant');
    orders = Array.isArray(res) ? res : (res as { data: OrderRecord[] }).data ?? [];
  } catch { orders = []; }

  const now = new Date();
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => (o.data.status ?? 'pending') === 'pending').length;
  const shippedOrders = orders.filter((o) => o.data.status === 'shipped').length;
  const revenueThisMonth = orders
    .filter((o) => {
      if (o.data.status === 'cancelled') return false;
      const d = o.data.orderDate ?? o.createdAt ?? '';
      if (!d) return false;
      const dt = new Date(d);
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    })
    .reduce((sum, o) => sum + (o.data.total ?? 0), 0);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Sales Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sales orders at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Orders', value: totalOrders, href: '/dashboard/sales/orders' as Route },
          { label: 'Pending', value: pendingOrders, href: '/dashboard/sales/orders' as Route },
          { label: 'Shipped', value: shippedOrders, href: '/dashboard/sales/orders' as Route },
          { label: 'Revenue This Month', value: formatCurrency(revenueThisMonth), href: '/dashboard/sales/orders' as Route },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Orders</h2>
          <Link href="/dashboard/sales/orders" className="text-xs text-indigo-600 hover:text-indigo-800">View all →</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Order #</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Customer</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Total</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => {
                const d = order.data;
                const orderNum = d.orderNumber ?? order.id.slice(0, 8).toUpperCase();
                const date = d.orderDate ?? order.createdAt ?? '';
                return (
                  <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/sales/orders/${order.id}`} className="font-mono text-xs text-gray-600 hover:text-gray-900 hover:underline">
                        {orderNum}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{d.customerName || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(d.total ?? 0)}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{date ? date.slice(0, 10) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/sales/orders/${order.id}`} className="text-xs text-gray-500 hover:text-gray-900">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
