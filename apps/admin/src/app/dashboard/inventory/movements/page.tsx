import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

interface MovementRecord {
  id: string;
  entityType: string;
  data: {
    type?: 'in' | 'out' | 'adjustment';
    product_id?: string;
    warehouse_id?: string;
    quantity?: number;
    reference?: string;
    notes?: string;
  };
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  in: 'bg-green-100 text-green-700',
  out: 'bg-red-100 text-red-700',
  adjustment: 'bg-blue-100 text-blue-700',
};

export default async function MovementsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: MovementRecord[] = [];
  try {
    const res = await apiFetch<MovementRecord[]>('/api/v1/inventory/movements', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stock movements</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} movements</p>
        </div>
        <Link
          href="/dashboard/inventory/movements/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Record movement
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No movements yet.</p>
          <Link
            href="/dashboard/inventory/movements/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Record first movement
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Warehouse</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Quantity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                const type = d.type ?? 'in';
                const createdAt =
                  typeof record.createdAt === 'string' ? record.createdAt.slice(0, 10) : '';
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.product_id ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.warehouse_id ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{d.quantity ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500">{d.reference ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{createdAt}</td>
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
