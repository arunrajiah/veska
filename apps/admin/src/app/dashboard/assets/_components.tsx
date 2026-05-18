'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export interface Asset {
  id: string;
  data: {
    name?: string;
    assetTag?: string;
    category?: string;
    status?: string;
    assignedTo?: string;
    location?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    currentValue?: number;
    warranty?: string;
    serialNumber?: string;
    notes?: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  maintenance: 'bg-amber-100 text-amber-700',
  retired: 'bg-gray-100 text-gray-500',
  lost: 'bg-red-100 text-red-600',
};

const CATEGORY_COLORS: Record<string, string> = {
  hardware: 'bg-blue-100 text-blue-700',
  software: 'bg-violet-100 text-violet-700',
  vehicle: 'bg-sky-100 text-sky-700',
  furniture: 'bg-amber-100 text-amber-700',
  equipment: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-600',
};

const CATEGORY_TABS = ['all', 'hardware', 'software', 'vehicle', 'furniture', 'equipment', 'other'] as const;

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(n?: number) {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function reqHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

function AddAssetSlideOver({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name') as string,
      assetTag: (fd.get('assetTag') as string) || undefined,
      category: fd.get('category') as string,
      assignedTo: (fd.get('assignedTo') as string) || undefined,
      location: (fd.get('location') as string) || undefined,
      purchaseDate: (fd.get('purchaseDate') as string) || undefined,
      purchasePrice: fd.get('purchasePrice') ? Number(fd.get('purchasePrice')) : undefined,
      currentValue: fd.get('currentValue') ? Number(fd.get('currentValue')) : undefined,
      serialNumber: (fd.get('serialNumber') as string) || undefined,
      warranty: (fd.get('warranty') as string) || undefined,
      notes: (fd.get('notes') as string) || undefined,
      status: 'active',
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/assets`, {
        method: 'POST',
        headers: reqHeaders(),
        body: JSON.stringify({ data: body }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add asset');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Add Asset</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input name="name" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Asset Tag</label>
              <input name="assetTag"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
              <select name="category" required defaultValue="hardware"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                {['hardware', 'software', 'vehicle', 'furniture', 'equipment', 'other'].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
              <input name="assignedTo"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
              <input name="location"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Date</label>
              <input name="purchaseDate" type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Price</label>
              <input name="purchasePrice" type="number" step="0.01" min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Current Value</label>
              <input name="currentValue" type="number" step="0.01" min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Serial Number</label>
              <input name="serialNumber"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Warranty Expiry</label>
            <input name="warranty" type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea name="notes" rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Add Asset'}
            </button>
            <button type="button" onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AssetsPageClient({ assets: initialAssets }: { assets: Asset[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<typeof CATEGORY_TABS[number]>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [assets] = useState(initialAssets);

  const filtered = tab === 'all' ? assets : assets.filter((a) => a.data.category === tab);

  const totalValue = assets.reduce((s, a) => s + (a.data.purchasePrice ?? 0), 0);
  const currentValue = assets.reduce((s, a) => s + (a.data.currentValue ?? 0), 0);
  const active = assets.filter((a) => (a.data.status ?? 'active') === 'active').length;
  const maintenance = assets.filter((a) => a.data.status === 'maintenance').length;

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Assets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{assets.length} assets</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Add Asset
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Assets', value: assets.length },
          { label: 'Active', value: active },
          { label: 'In Maintenance', value: maintenance },
          { label: 'Total Value', value: fmtMoney(totalValue) },
          { label: 'Depreciated Value', value: fmtMoney(currentValue) },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {CATEGORY_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
              tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No assets found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Asset Tag</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Location</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Purchase Price</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Current Value</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Warranty Expiry</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const d = a.data;
                  const status = d.status ?? 'active';
                  const cat = d.category ?? 'other';
                  return (
                    <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.assetTag ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{d.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600'}`}>
                          {cat}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{d.assignedTo ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{d.location ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-700 text-xs font-medium">{fmtMoney(d.purchasePrice)}</td>
                      <td className="px-4 py-3 text-right text-gray-700 text-xs font-medium">{fmtMoney(d.currentValue)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(d.warranty)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/assets/${a.id}`} className="text-xs text-gray-500 hover:text-gray-900">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <AddAssetSlideOver
          onClose={() => setShowAdd(false)}
          onSaved={() => startTransition(() => { router.refresh(); })}
        />
      )}
    </div>
  );
}

// Legacy export for backward compat
export function AssetsClient({ assets, summary }: { assets: unknown[]; summary: unknown }) {
  return <AssetsPageClient assets={[]} />;
}
