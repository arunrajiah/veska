import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { EnrichButton, EditProductToggle } from './_components.js';

interface ProductRecord {
  id: string;
  data: {
    name?: string;
    sku?: string;
    category?: string;
    description?: string;
    price?: number; unit_price?: number;
    cost?: number; cost_price?: number;
    stockQuantity?: number;
    reorderLevel?: number;
    warehouseId?: string;
    status?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

interface MovementRecord {
  id: string;
  data: {
    type?: string;
    quantity?: number;
    fromWarehouse?: string;
    toWarehouse?: string;
    reference?: string;
    date?: string;
    notes?: string;
  };
  createdAt: string;
}

function formatCurrency(val: unknown) {
  const n = typeof val === 'number' ? val : parseFloat(String(val ?? ''));
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function StatusBadge({ status }: { status?: string | undefined }) {
  if (status === 'active') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">Active</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Inactive</span>;
}

function MovementTypeBadge({ type }: { type?: string | undefined }) {
  const colors: Record<string, string> = {
    in: 'bg-green-50 text-green-700',
    out: 'bg-red-50 text-red-700',
    transfer: 'bg-blue-50 text-blue-700',
  };
  const t = type ?? 'in';
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[t] ?? 'bg-gray-100 text-gray-600'}`}>{t}</span>;
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  let record: ProductRecord | null = null;
  let movements: MovementRecord[] = [];

  try {
    record = await apiFetch<ProductRecord>(`/api/v1/inventory/products/${id}`, 'demo-tenant');
  } catch {
    record = null;
  }

  if (record) {
    try {
      const res = await apiFetch<{ data: MovementRecord[] } | MovementRecord[]>(
        `/api/v1/inventory/movements?productId=${id}&limit=10`,
        'demo-tenant',
      );
      movements = Array.isArray(res) ? res : (res as { data: MovementRecord[] }).data ?? [];
    } catch {
      movements = [];
    }
  }

  if (!record) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500 text-sm">Product not found.</p>
        <Link href="/dashboard/inventory/products" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">← Back to products</Link>
      </div>
    );
  }

  const d = record.data;
  const price = d.price ?? d.unit_price;
  const cost = d.cost ?? d.cost_price;

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-4">
        <Link href="/dashboard/inventory/products" className="text-xs text-gray-400 hover:text-gray-700">← Products</Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{d.name || 'Product'}</h1>
            <StatusBadge status={d.status} />
          </div>
          {d.sku && <p className="text-sm text-gray-500 font-mono mt-0.5">{d.sku}</p>}
        </div>
        <div className="flex items-center gap-2">
          <EnrichButton productId={id} />
          <EditProductToggle productId={id} data={d} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Details */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
            </div>
            <dl className="divide-y divide-gray-50">
              {[
                { label: 'SKU', value: d.sku },
                { label: 'Category', value: d.category },
                { label: 'Price', value: price != null ? formatCurrency(price) : undefined },
                { label: 'Cost', value: cost != null ? formatCurrency(cost) : undefined },
                { label: 'Stock Qty', value: d.stockQuantity?.toString() },
                { label: 'Reorder Level', value: d.reorderLevel?.toString() },
                { label: 'Warehouse ID', value: d.warehouseId },
              ].map(({ label, value }) => (
                <div key={label} className="px-5 py-3 flex items-center gap-4">
                  <dt className="text-xs text-gray-500 w-28 shrink-0">{label}</dt>
                  <dd className="text-sm text-gray-900">{value || <span className="text-gray-300">—</span>}</dd>
                </div>
              ))}
            </dl>
          </div>
          {d.description && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</h2>
              </div>
              <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">{d.description}</p>
            </div>
          )}
        </div>

        {/* Right: Movements + AI Insights */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Movements</h2>
            </div>
            {movements.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">No movements recorded.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Type</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Qty</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 10).map((mv) => {
                    const md = mv.data as Record<string, unknown>;
                    const date = (md.date as string) ?? mv.createdAt ?? '';
                    return (
                      <tr key={mv.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-2.5"><MovementTypeBadge type={md.type as string} /></td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{(md.quantity as number) ?? 0}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{date ? date.slice(0, 10) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">AI Insights</h2>
            <p className="text-sm text-gray-400">Click "Enrich with AI" to generate insights for this product.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
