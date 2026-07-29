import Link from 'next/link';
import type { Route } from 'next';
import { apiFetch } from '@/lib/api.js';

interface ProductRecord {
  id: string;
  data: {
    name?: string;
    sku?: string;
    category?: string;
    price?: number;
    unit_price?: number;
    stockQuantity?: number;
    reorderLevel?: number;
    status?: string;
  };
}

interface WarehouseRecord {
  id: string;
  data: { name?: string; location?: string };
}

interface MovementRecord {
  id: string;
  data: {
    productName?: string;
    productId?: string;
    type?: string;
    quantity?: number;
    date?: string;
  };
  createdAt: string;
}

function formatCurrency(val: unknown) {
  const n = typeof val === 'number' ? val : parseFloat(String(val ?? ''));
  if (isNaN(n)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function MovementTypeBadge({ type }: { type?: string | undefined }) {
  const colors: Record<string, string> = {
    in: 'bg-green-50 text-green-700',
    out: 'bg-red-50 text-red-700',
    transfer: 'bg-blue-50 text-blue-700',
  };
  const t = type ?? 'in';
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[t] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {t}
    </span>
  );
}

export default async function InventoryDashboard() {
  let products: ProductRecord[] = [];
  let warehouses: WarehouseRecord[] = [];
  let movements: MovementRecord[] = [];

  try {
    const res = await apiFetch<{ data: ProductRecord[] } | ProductRecord[]>(
      '/api/v1/inventory/products?limit=50',
      process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
    );
    products = Array.isArray(res) ? res : ((res as { data: ProductRecord[] }).data ?? []);
  } catch {
    products = [];
  }

  try {
    const res = await apiFetch<{ data: WarehouseRecord[] } | WarehouseRecord[]>(
      '/api/v1/inventory/warehouses?limit=20',
      process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
    );
    warehouses = Array.isArray(res) ? res : ((res as { data: WarehouseRecord[] }).data ?? []);
  } catch {
    warehouses = [];
  }

  try {
    const res = await apiFetch<{ data: MovementRecord[] } | MovementRecord[]>(
      '/api/v1/inventory/movements?limit=50',
      process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
    );
    movements = Array.isArray(res) ? res : ((res as { data: MovementRecord[] }).data ?? []);
  } catch {
    movements = [];
  }

  const totalProducts = products.length;
  const lowStockItems = products.filter(
    (p) => (p.data.stockQuantity ?? 0) <= (p.data.reorderLevel ?? 0),
  );
  const totalValue = products.reduce((sum, p) => {
    const price = p.data.price ?? p.data.unit_price ?? 0;
    const qty = p.data.stockQuantity ?? 0;
    return sum + price * qty;
  }, 0);
  const activeWarehouses = warehouses.length;
  const recentMovements = [...movements]
    .sort((a, b) => {
      const da = a.data.date ?? a.createdAt ?? '';
      const db = b.data.date ?? b.createdAt ?? '';
      return new Date(db).getTime() - new Date(da).getTime();
    })
    .slice(0, 5);

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Inventory management at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total Products',
            value: totalProducts,
            href: '/dashboard/inventory/products' as Route,
          },
          {
            label: 'Low Stock Items',
            value: lowStockItems.length,
            href: '/dashboard/inventory/stock' as Route,
          },
          {
            label: 'Inventory Value',
            value: formatCurrency(totalValue),
            href: '/dashboard/inventory/products' as Route,
          },
          {
            label: 'Active Warehouses',
            value: activeWarehouses,
            href: '/dashboard/inventory/warehouses' as Route,
          },
        ].map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Low Stock Alerts
            </h2>
            <Link
              href="/dashboard/inventory/stock"
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              View all →
            </Link>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">All stock levels are healthy.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {lowStockItems.slice(0, 8).map((prod) => {
                  const qty = prod.data.stockQuantity ?? 0;
                  const reorder = prod.data.reorderLevel ?? 0;
                  return (
                    <tr
                      key={prod.id}
                      className="border-b border-gray-50 last:border-0 bg-red-50/50 hover:bg-red-50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/inventory/products/${prod.id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {prod.data.name || '—'}
                        </Link>
                        {prod.data.sku && (
                          <p className="text-xs text-gray-400 font-mono">{prod.data.sku}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-red-600">{qty}</span>
                        <span className="text-xs text-gray-400 ml-1">/ {reorder} reorder</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Movements */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Recent Movements
            </h2>
            <Link
              href="/dashboard/inventory/movements"
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              View all →
            </Link>
          </div>
          {recentMovements.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No movements recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {recentMovements.map((mv) => {
                  const d = mv.data;
                  const date = d.date ?? mv.createdAt ?? '';
                  return (
                    <tr
                      key={mv.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {d.productName || d.productId || '—'}
                        </p>
                        <p className="text-xs text-gray-400">{date ? date.slice(0, 10) : '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <MovementTypeBadge type={d.type} />
                          <span className="font-semibold text-gray-900">{d.quantity ?? 0}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
