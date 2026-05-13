import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';

interface GRNRecord {
  id: string;
  data: {
    po_number: string;
    received_date: string;
    warehouse_name?: string;
    items: Array<{ product_name: string; received_qty: number }>;
    status: 'draft' | 'posted';
  };
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  posted: 'bg-green-100 text-green-700',
};

export default async function GRNListPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: GRNRecord[] = [];
  try {
    records = await apiFetch<GRNRecord[]>('/api/v1/grn', tenantId);
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Goods Received Notes</h1>
          <p className="text-sm text-gray-500 mt-1">Track goods received against purchase orders</p>
        </div>
        <Link
          href="/dashboard/purchasing/grn/new"
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          New GRN
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No goods received notes yet</p>
          <p className="text-sm mt-1">Create a GRN to record received inventory</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                return (
                  <tr key={record.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-700">
                      {d.received_date ?? new Date(record.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-gray-800">{d.po_number}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{d.warehouse_name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{d.items?.length ?? 0} line(s)</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {d.status}
                      </span>
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
