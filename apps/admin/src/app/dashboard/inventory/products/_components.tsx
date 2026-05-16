'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Upload } from 'lucide-react';
import Link from 'next/link';
import { ImportModal } from '@/components/import-modal.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = 'demo-tenant';
const IDENTITY_ID = process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin';

function fmtHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': IDENTITY_ID,
  };
}

export interface ProductRecord {
  id: string;
  data: {
    name?: string;
    sku?: string;
    category?: string;
    description?: string;
    price?: number; unit_price?: number;
    cost?: number; cost_price?: number;
    stockQuantity?: number; unit_of_measure?: string;
    reorderLevel?: number;
    warehouseId?: string;
    status?: string;
  };
  createdAt: string;
}

function formatCurrency(val: unknown) {
  const n = typeof val === 'number' ? val : parseFloat(String(val ?? ''));
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function ProductStatusBadge({ status }: { status?: string | undefined }) {
  if (status === 'active') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">Active</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Inactive</span>;
}

function AddProductSlideOver({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name') as string,
      sku: (fd.get('sku') as string) || undefined,
      category: (fd.get('category') as string) || undefined,
      price: fd.get('price') ? Number(fd.get('price')) : undefined,
      cost: fd.get('cost') ? Number(fd.get('cost')) : undefined,
      stockQuantity: fd.get('stockQuantity') ? Number(fd.get('stockQuantity')) : 0,
      reorderLevel: fd.get('reorderLevel') ? Number(fd.get('reorderLevel')) : undefined,
      status: 'active',
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/inventory/products`, {
        method: 'POST',
        headers: fmtHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Add Product</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Product Name *</label>
            <input name="name" required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
            <input name="sku" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <input name="category" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Price (USD)</label>
              <input name="price" type="number" min="0" step="0.01" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cost (USD)</label>
              <input name="cost" type="number" min="0" step="0.01" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Stock Quantity</label>
              <input name="stockQuantity" type="number" min="0" defaultValue="0" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reorder Level</label>
              <input name="reorderLevel" type="number" min="0" className={inputClass} />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Add Product'}
            </button>
            <button type="button" onClick={onClose} className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProductsClient({ products: initial }: { products: ProductRecord[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const total = initial.length;
  const active = initial.filter((p) => p.data.status === 'active').length;
  const lowStock = initial.filter((p) => {
    const qty = p.data.stockQuantity ?? 0;
    const reorder = p.data.reorderLevel ?? 0;
    return qty <= reorder;
  }).length;
  const totalValue = initial.reduce((sum, p) => {
    const price = p.data.price ?? p.data.unit_price ?? 0;
    const qty = p.data.stockQuantity ?? 0;
    return sum + price * qty;
  }, 0);

  return (
    <div className="px-8 py-8 max-w-7xl">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Products', value: total },
          { label: 'Active', value: active },
          { label: 'Low Stock', value: lowStock },
          { label: 'Total Value', value: formatCurrency(totalValue) },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Products</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload size={15} /> Import CSV
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>
      {showImport && (
        <ImportModal
          entityType="products"
          onComplete={({ imported, skipped }) => {
            setShowImport(false);
            startTransition(() => router.refresh());
            void imported; void skipped;
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Table */}
      {initial.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No products yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Price</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Cost</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Stock Qty</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Reorder Lvl</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {initial.map((prod) => {
                const d = prod.data;
                const qty = d.stockQuantity ?? 0;
                const reorder = d.reorderLevel ?? 0;
                const isLow = qty <= reorder;
                const price = d.price ?? d.unit_price;
                const cost = d.cost ?? d.cost_price;
                return (
                  <tr key={prod.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 ${isLow ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.sku || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/dashboard/inventory/products/${prod.id}`} className="hover:underline">{d.name || '—'}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.category || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{price != null ? formatCurrency(price) : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{cost != null ? formatCurrency(cost) : '—'}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{qty}</td>
                    <td className="px-4 py-3"><ProductStatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-right text-gray-400">{d.reorderLevel ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/inventory/products/${prod.id}`}
                        className="text-xs text-gray-500 hover:text-gray-900">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddProductSlideOver
          onClose={() => setShowAdd(false)}
          onSaved={() => startTransition(() => router.refresh())}
        />
      )}
    </div>
  );
}
