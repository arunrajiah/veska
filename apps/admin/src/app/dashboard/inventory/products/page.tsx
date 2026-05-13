import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

interface ProductRecord {
  id: string;
  entityType: string;
  data: {
    name?: string;
    sku?: string;
    category?: string;
    unit_price?: number;
    cost_price?: number;
    unit_of_measure?: string;
  };
  createdAt: string;
}

function formatCurrency(value: unknown, currency = 'USD'): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

export default async function ProductsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let records: ProductRecord[] = [];
  try {
    const res = await apiFetch<ProductRecord[]>('/api/v1/inventory/products', tenantId);
    records = Array.isArray(res) ? res : [];
  } catch {
    records = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} products</p>
        </div>
        <Link
          href="/dashboard/inventory/products/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New product
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No products yet.</p>
          <Link
            href="/dashboard/inventory/products/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Add your first product
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Unit price</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cost price</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">UoM</th>
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
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-600">{d.sku ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.category ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-900">{d.unit_price != null ? formatCurrency(d.unit_price) : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{d.cost_price != null ? formatCurrency(d.cost_price) : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{d.unit_of_measure ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/inventory/products/${record.id}`}
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
