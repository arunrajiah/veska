import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

interface WarehouseRecord {
  id: string;
  entityType: string;
  data: {
    name?: string;
    location?: string;
    manager?: string;
  };
  createdAt: string;
}

export default async function WarehousesPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: WarehouseRecord[] = [];
  try {
    const res = await apiFetch<WarehouseRecord[]>('/api/v1/inventory/warehouses', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Warehouses</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} warehouses</p>
        </div>
        <Link
          href="/dashboard/inventory/warehouses/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New warehouse
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No warehouses yet.</p>
          <Link
            href="/dashboard/inventory/warehouses/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Add your first warehouse
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Location</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Manager</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const d = record.data;
                return (
                  <tr
                    key={record.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{d.name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.location ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{d.manager ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-400 font-mono">{record.id.slice(0, 8)}</span>
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
