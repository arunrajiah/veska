import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { EnrichButton } from './_components.js';

interface ProductRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface StockLevel {
  productId: string;
  warehouseId: string;
  quantity: number;
}

function formatCurrency(value: unknown, currency = 'USD'): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = params;

  let record: ProductRecord | null = null;
  let stockLevels: StockLevel[] = [];

  try {
    record = await apiFetch<ProductRecord>(`/api/v1/inventory/products/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (record) {
    try {
      const res = await apiFetch<StockLevel[]>(`/api/v1/inventory/stock?productId=${id}`, tenantId);
      stockLevels = Array.isArray(res) ? res : [];
    } catch {
      stockLevels = [];
    }
  }

  if (!record) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Product not found.</p>
        <Link href="/dashboard/inventory/products" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to products
        </Link>
      </div>
    );
  }

  const d = record.data;

  const fields: Array<{ label: string; value: string }> = [
    { label: 'SKU', value: String(d['sku'] ?? '') },
    { label: 'Category', value: String(d['category'] ?? '') },
    { label: 'Unit price', value: d['unit_price'] != null ? formatCurrency(d['unit_price']) : '' },
    { label: 'Cost price', value: d['cost_price'] != null ? formatCurrency(d['cost_price']) : '' },
    { label: 'Unit of measure', value: String(d['unit_of_measure'] ?? '') },
  ];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/inventory/products" className="text-xs text-gray-400 hover:text-gray-700">
          ← Products
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{String(d['name'] ?? 'Product')}</h1>
          {d['sku'] && (
            <p className="text-sm text-gray-500 font-mono mt-0.5">{String(d['sku'])}</p>
          )}
        </div>
        <div className="flex gap-2">
          <EnrichButton productId={id} tenantId={tenantId} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
        </div>
        <dl className="divide-y divide-gray-50">
          {fields.map(({ label, value }) => (
            <div key={label} className="px-5 py-3 flex items-baseline gap-4">
              <dt className="text-xs text-gray-500 w-28 shrink-0">{label}</dt>
              <dd className={`text-sm text-gray-900 ${label === 'SKU' ? 'font-mono' : ''}`}>
                {value || <span className="text-gray-300">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {d['description'] && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</h2>
          </div>
          <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">{String(d['description'])}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock levels</h2>
          <Link
            href={`/dashboard/inventory/movements/new?productId=${id}`}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            Record movement →
          </Link>
        </div>
        {stockLevels.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No stock movements recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Warehouse</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {stockLevels.map((level) => (
                <tr key={level.warehouseId} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 text-gray-700 font-mono text-xs">{level.warehouseId}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${level.quantity < 10 ? 'text-amber-600' : 'text-gray-900'}`}>
                    {level.quantity}
                    {level.quantity < 10 && (
                      <span className="ml-1 text-xs font-normal text-amber-500">low</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {d['notes'] && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h2>
          </div>
          <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">{String(d['notes'])}</p>
        </div>
      )}
    </div>
  );
}
