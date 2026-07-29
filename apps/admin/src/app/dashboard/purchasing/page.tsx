import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';

interface PurchaseOrder {
  id: string;
  data: {
    poNumber?: string;
    vendorName?: string;
    status?: string;
    total?: number;
    orderDate?: string;
    expectedDate?: string;
  };
}

interface GRN {
  id: string;
  data: {
    status?: string;
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

export default async function PurchasingDashboardPage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let orders: PurchaseOrder[] = [];
  let grns: GRN[] = [];

  try {
    const res = await apiFetch<{ data: PurchaseOrder[] }>(
      '/api/v1/purchasing/orders?limit=50',
      tenantId,
    );
    orders = Array.isArray(res) ? res : (res.data ?? []);
  } catch {
    orders = [];
  }

  try {
    const res = await apiFetch<{ data: GRN[] }>('/api/v1/grn?limit=50', tenantId);
    grns = Array.isArray(res) ? res : (res.data ?? []);
  } catch {
    grns = [];
  }

  const openOrders = orders.filter(
    (o) => !['received', 'cancelled'].includes(o.data.status ?? 'draft'),
  );
  const pendingGRNs = grns.filter((g) => g.data.status === 'pending');

  // Total spend this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthSpend = orders
    .filter(
      (o) => o.data.orderDate && o.data.orderDate >= monthStart && o.data.status !== 'cancelled',
    )
    .reduce((s, o) => s + (o.data.total ?? 0), 0);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Purchasing</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Overview of purchase orders, GRNs, and vendors
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total POs', value: orders.length },
          { label: 'Open POs', value: openOrders.length },
          { label: 'Pending GRNs', value: pendingGRNs.length },
          { label: 'Spend This Month', value: fmtMoney(monthSpend), mono: false },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {(
          [
            {
              href: '/dashboard/purchasing/orders',
              label: 'Purchase Orders',
              desc: 'Create and manage POs',
            },
            {
              href: '/dashboard/purchasing/grn',
              label: 'Goods Received Notes',
              desc: 'Track received inventory',
            },
            {
              href: '/dashboard/purchasing/vendors',
              label: 'Vendors',
              desc: 'Manage purchasing vendors',
            },
          ] as const
        ).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 hover:border-gray-300 hover:shadow transition-all group"
          >
            <p className="font-medium text-gray-900 group-hover:text-gray-700">{link.label} →</p>
            <p className="text-xs text-gray-500 mt-1">{link.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent POs */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Purchase Orders</h2>
          <Link
            href="/dashboard/purchasing/orders"
            className="text-xs text-gray-500 hover:text-gray-900"
          >
            View all →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No purchase orders yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">PO #</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Vendor</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                  Order Date
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Total</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => {
                const status = o.data.status ?? 'draft';
                return (
                  <tr
                    key={o.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/purchasing/orders/${o.id}`}
                        className="font-mono text-xs text-gray-700 hover:text-gray-900"
                      >
                        {o.data.poNumber ?? o.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{o.data.vendorName ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(o.data.orderDate)}</td>
                    <td className="px-5 py-3 text-right text-gray-800 font-medium">
                      {fmtMoney(o.data.total)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {status}
                      </span>
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
