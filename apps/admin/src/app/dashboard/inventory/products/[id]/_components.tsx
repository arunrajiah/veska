'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
const IDENTITY_ID = process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin';

function fmtHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': IDENTITY_ID,
  };
}

export function EnrichButton({ productId }: { productId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  async function handleEnrich() {
    setState('loading');
    try {
      await fetch(`/api/veska/entities/Product/${productId}/enrich`, {
        method: 'POST',
        headers: fmtHeaders(),
        body: JSON.stringify({}),
      });
      setState('done');
    } catch {
      setState('idle');
    }
  }
  return (
    <button onClick={() => void handleEnrich()} disabled={state !== 'idle'}
      className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
      {state === 'loading' ? 'Enriching…' : state === 'done' ? 'Enriched!' : 'Enrich with AI'}
    </button>
  );
}

interface ProductData {
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
}

export function EditProductToggle({ productId, data }: { productId: string; data: ProductData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const price = data.price ?? data.unit_price ?? '';
  const cost = data.cost ?? data.cost_price ?? '';

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
      status: fd.get('status') as string,
    };
    try {
      const res = await fetch(`/api/veska/inventory/products/${productId}`, {
        method: 'PATCH',
        headers: fmtHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
        Edit
      </button>
    );
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900';

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Edit Product</h2>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
          <input name="name" defaultValue={data.name ?? ''} required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
          <input name="sku" defaultValue={data.sku ?? ''} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
          <input name="category" defaultValue={data.category ?? ''} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
            <input name="price" type="number" min="0" step="0.01" defaultValue={price} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cost</label>
            <input name="cost" type="number" min="0" step="0.01" defaultValue={cost} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Stock Qty</label>
            <input name="stockQuantity" type="number" min="0" defaultValue={data.stockQuantity ?? 0} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reorder Level</label>
            <input name="reorderLevel" type="number" min="0" defaultValue={data.reorderLevel ?? ''} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select name="status" defaultValue={data.status ?? 'active'} className={inputClass}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => setEditing(false)}
            className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
