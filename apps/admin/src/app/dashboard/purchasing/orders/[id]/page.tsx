import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import ApprovalButtons from './_approval.js';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  ordered: 'bg-blue-100 text-blue-700',
  partial_received: 'bg-orange-100 text-orange-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  sent: 'bg-blue-100 text-blue-700',
};

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface OrderRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let record: OrderRecord | null = null;
  try {
    record = await apiFetch<OrderRecord>(`/api/v1/purchasing/orders/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500">Purchase order not found.</p>
        <Link href="/dashboard/purchasing/orders" className="text-sm text-gray-600 hover:text-gray-900 mt-2 inline-block">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const d = record.data;
  const status = (d['status'] as string) ?? 'draft';
  const poNumber = (d['number'] as string) ?? record.id.slice(0, 8).toUpperCase();
  const items = (d['items'] as LineItem[]) ?? [];
  const total = typeof d['total'] === 'number' ? d['total'] : 0;

  return (
    <div className="px-8 py-8 max-w-4xl">
      <Link href="/dashboard/purchasing/orders" className="text-sm text-gray-500 hover:text-gray-900 mb-6 inline-block">
        ← Purchase Orders
      </Link>

      <div className="flex items-start gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 font-mono">{poNumber}</h1>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {status}
            </span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-6">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Vendor</p>
                <p className="text-gray-800">{String(d['vendor_id'] ?? '—')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Order date</p>
                <p className="text-gray-800">{String(d['order_date'] ?? '—')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Expected date</p>
                <p className="text-gray-800">{String(d['expected_date'] ?? '—')}</p>
              </div>
              {d['notes'] && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-gray-600">{String(d['notes'])}</p>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Line items</p>
                <div className="overflow-hidden border border-gray-100 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Description</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Qty</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Unit price</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const lineTotal = item.quantity * item.unit_price;
                        return (
                          <tr key={i} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-2.5 text-gray-700">{item.description}</td>
                            <td className="px-4 py-2.5 text-gray-600 text-right">{item.quantity}</td>
                            <td className="px-4 py-2.5 text-gray-600 text-right">
                              ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2.5 text-gray-800 text-right font-medium">
                              ${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <td colSpan={3} className="px-4 py-2.5 text-sm font-semibold text-gray-700 text-right">Grand total</td>
                        <td className="px-4 py-2.5 text-sm font-bold text-gray-900 text-right">
                          ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-48 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Actions</p>
            <ApprovalButtons
              orderId={record.id}
              tenantId={tenantId}
              currentStatus={status}
              poNumber={poNumber}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
