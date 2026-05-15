import { apiFetch } from '@/lib/api.js';

interface StockLevel {
  productId?: string;
  productName?: string;
  warehouseId?: string;
  warehouseName?: string;
  quantity?: number;
  reorderLevel?: number;
  lastUpdated?: string;
  // wrapped in entity record style
  id?: string;
  data?: {
    productId?: string;
    productName?: string;
    warehouseId?: string;
    warehouseName?: string;
    quantity?: number;
    reorderLevel?: number;
    lastUpdated?: string;
  };
}

function StockStatusBadge({ qty, reorder }: { qty: number; reorder: number }) {
  if (qty === 0) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Critical</span>;
  if (qty <= reorder) return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-50 text-yellow-700">Low</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">OK</span>;
}

function getStock(level: StockLevel) {
  const d = level.data ?? level;
  return {
    productId: d.productId ?? '',
    productName: d.productName ?? '',
    warehouseId: d.warehouseId ?? '',
    warehouseName: d.warehouseName ?? '',
    quantity: d.quantity ?? 0,
    reorderLevel: d.reorderLevel ?? 0,
    lastUpdated: d.lastUpdated ?? '',
  };
}

export default async function StockPage() {
  let levels: StockLevel[] = [];
  try {
    const res = await apiFetch<{ data: StockLevel[] } | StockLevel[]>(
      '/api/v1/inventory/stock?limit=50',
      'demo-tenant',
    );
    levels = Array.isArray(res) ? res : (res as { data: StockLevel[] }).data ?? [];
  } catch {
    levels = [];
  }

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stock Levels</h1>
          <p className="text-sm text-gray-500 mt-0.5">{levels.length} entries</p>
        </div>
      </div>

      {levels.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No stock data yet. Record movements to see stock levels.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Warehouse</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Quantity</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Reorder Level</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((level, i) => {
                const s = getStock(level);
                const key = level.id ?? `${s.productId}::${s.warehouseId}::${i}`;
                return (
                  <tr key={key} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.productName || s.productId || '—'}</p>
                      {s.productName && s.productId && (
                        <p className="text-xs text-gray-400 font-mono">{s.productId}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.warehouseName || s.warehouseId || '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${s.quantity <= s.reorderLevel ? 'text-red-600' : 'text-gray-900'}`}>
                      {s.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{s.reorderLevel}</td>
                    <td className="px-4 py-3"><StockStatusBadge qty={s.quantity} reorder={s.reorderLevel} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{s.lastUpdated ? s.lastUpdated.slice(0, 10) : '—'}</td>
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
