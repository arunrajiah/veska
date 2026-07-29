import { apiFetch } from '@/lib/api.js';

interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
  totalQuantity: number;
  costPrice: number;
  totalValue: number;
}

interface InventoryReport {
  totalProducts: number;
  totalSkus: number;
  valuationByCost: number;
  items: InventoryItem[];
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default async function InventoryReportPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let report: InventoryReport = {
    totalProducts: 0,
    totalSkus: 0,
    valuationByCost: 0,
    items: [],
  };

  try {
    report = await apiFetch<InventoryReport>('/api/v1/reports/inventory', tenantId);
  } catch {
    // fall through to empty state
  }

  const stats = [
    { label: 'Total products', value: report.totalProducts.toString() },
    { label: 'Unique SKUs', value: report.totalSkus.toString() },
    { label: 'Total stock value', value: fmt(report.valuationByCost) },
  ];

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Valuation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Stock levels and total inventory value at cost price.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-2">{s.label}</p>
            <p className="text-xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Items table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Products by value</h2>
        </div>
        {report.items.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No products yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Product</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">SKU</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">
                  Qty on hand
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">
                  Cost price
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">
                  Total value
                </th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((item) => (
                <tr
                  key={item.productId}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                >
                  <td className="px-5 py-3 font-medium text-gray-900">{item.productName}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{item.sku}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{item.totalQuantity}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{fmt(item.costPrice)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    {fmt(item.totalValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
