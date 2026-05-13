import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-blue-100 text-blue-700',
  picking: 'bg-yellow-100 text-yellow-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

interface OrderRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export default async function SalesOrdersPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: OrderRecord[] = [];
  try {
    const res = await apiFetch<OrderRecord[]>('/api/v1/sales/orders', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} orders</p>
        </div>
        <Link
          href="/dashboard/sales/orders/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New order
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No sales orders yet.</p>
          <Link
            href="/dashboard/sales/orders/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Create first order
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">SO Number</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Order date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Delivery date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                const status = (d['status'] as string) ?? 'draft';
                const soNumber = (d['number'] as string) ?? record.id.slice(0, 8).toUpperCase();
                const total = typeof d['total'] === 'number' ? d['total'] : 0;
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/sales/orders/${record.id}`}
                        className="font-mono text-xs text-gray-600 hover:text-gray-900"
                      >
                        {soNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{String(d['customer_name'] ?? '—')}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{String(d['order_date'] ?? '—')}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{String(d['delivery_date'] ?? '—')}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/sales/orders/${record.id}`}
                        className="text-xs text-gray-500 hover:text-gray-900"
                      >
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
    </div>
  );
}
