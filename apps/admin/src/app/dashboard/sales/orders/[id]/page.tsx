import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { StatusDropdown } from './_components.js';

interface OrderItem {
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

interface OrderRecord {
  id: string;
  data: {
    orderNumber?: string;
    customerId?: string;
    customerName?: string;
    status?: string;
    items?: OrderItem[];
    subtotal?: number;
    tax?: number;
    total?: number;
    shippingAddress?: string;
    orderDate?: string;
    deliveryDate?: string;
  };
  createdAt: string;
}

function formatCurrency(val: unknown) {
  const n = typeof val === 'number' ? val : parseFloat(String(val ?? '0'));
  if (isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
};

export default async function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let record: OrderRecord | null = null;

  try {
    record = await apiFetch<OrderRecord>(
      `/api/v1/sales/orders/${id}`,
      process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
    );
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500 text-sm">Order not found.</p>
        <Link
          href="/dashboard/sales/orders"
          className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to orders
        </Link>
      </div>
    );
  }

  const d = record.data;
  const orderNum = d.orderNumber ?? record.id.slice(0, 8).toUpperCase();
  const status = d.status ?? 'pending';
  const items = d.items ?? [];
  const subtotal =
    d.subtotal ??
    items.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0), 0);
  const tax = d.tax ?? 0;
  const total = d.total ?? subtotal + tax;

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-4">
        <Link href="/dashboard/sales/orders" className="text-xs text-gray-400 hover:text-gray-700">
          ← Sales Orders
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 font-mono">{orderNum}</h1>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {status}
        </span>
        <span className="text-sm text-gray-500">{d.customerName || '—'}</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-5">
          {/* Order info */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-6">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  Customer
                </p>
                <p className="text-gray-800">{d.customerName || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  Order Date
                </p>
                <p className="text-gray-800">{d.orderDate ? d.orderDate.slice(0, 10) : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  Delivery Date
                </p>
                <p className="text-gray-800">
                  {d.deliveryDate ? d.deliveryDate.slice(0, 10) : '—'}
                </p>
              </div>
              {d.shippingAddress && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                    Shipping Address
                  </p>
                  <p className="text-gray-600 whitespace-pre-line">{d.shippingAddress}</p>
                </div>
              )}
            </div>

            {/* Items table */}
            {items.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Order Items
                </p>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                          Product
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
                      {items.map((item, i) => {
                        const lineTotal =
                          item.total ?? (item.quantity ?? 0) * (item.unitPrice ?? 0);
                        return (
                          <tr key={i} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-2.5 text-gray-700">
                              {item.productName || item.productId || `Item ${i + 1}`}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-600">
                              {item.quantity ?? 0}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-600">
                              {formatCurrency(item.unitPrice ?? 0)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-gray-800">
                              {formatCurrency(lineTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-100 bg-gray-50/50">
                        <td colSpan={3} className="px-4 py-2 text-xs text-gray-500 text-right">
                          Subtotal
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700">
                          {formatCurrency(subtotal)}
                        </td>
                      </tr>
                      <tr className="bg-gray-50/50">
                        <td colSpan={3} className="px-4 py-2 text-xs text-gray-500 text-right">
                          Tax
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700">
                          {formatCurrency(tax)}
                        </td>
                      </tr>
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <td
                          colSpan={3}
                          className="px-4 py-2.5 text-sm font-semibold text-gray-700 text-right"
                        >
                          Grand Total
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-900">
                          {formatCurrency(total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Actions */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <StatusDropdown orderId={record.id} currentStatus={status} />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              Order Summary
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Items</span>
                <span className="font-medium text-gray-900">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-700">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span className="text-gray-700">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-1.5">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
