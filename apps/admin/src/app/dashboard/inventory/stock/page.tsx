import { apiFetch } from '@/lib/api.js';

interface StockLevel {
  productId: string;
  warehouseId: string;
  quantity: number;
}

export default async function StockPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let levels: StockLevel[] = [];
  try {
    const res = await apiFetch<StockLevel[]>('/api/v1/inventory/stock', tenantId);
    levels = Array.isArray(res) ? res : [];
  } catch {
    levels = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stock levels</h1>
          <p className="text-sm text-gray-500 mt-0.5">{levels.length} entries</p>
        </div>
      </div>

      {levels.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No stock data yet. Record some movements to see stock levels.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Warehouse</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((level) => (
                <tr
                  key={`${level.productId}::${level.warehouseId}`}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{level.productId}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{level.warehouseId}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${level.quantity < 10 ? 'text-amber-600' : 'text-gray-900'}`}>
                      {level.quantity}
                    </span>
                    {level.quantity < 10 && (
                      <span className="ml-1.5 text-xs text-amber-500 font-normal">low stock</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
