'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';

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

function EditAssetSlideOver({ asset, onClose, onSaved }: { asset: Asset; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const d = asset.data;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name') as string,
      assetTag: (fd.get('assetTag') as string) || undefined,
      category: fd.get('category') as string,
      status: fd.get('status') as string,
      assignedTo: (fd.get('assignedTo') as string) || undefined,
      location: (fd.get('location') as string) || undefined,
      purchaseDate: (fd.get('purchaseDate') as string) || undefined,
      purchasePrice: fd.get('purchasePrice') ? Number(fd.get('purchasePrice')) : undefined,
      currentValue: fd.get('currentValue') ? Number(fd.get('currentValue')) : undefined,
      serialNumber: (fd.get('serialNumber') as string) || undefined,
      warranty: (fd.get('warranty') as string) || undefined,
      notes: (fd.get('notes') as string) || undefined,
    };
    try {
      const res = await fetch(`/api/veska/assets/${asset.id}`, {
        method: 'PATCH',
        headers: reqHeaders(),
        body: JSON.stringify({ data: body }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update asset');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Edit Asset</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input name="name" required defaultValue={d.name}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Asset Tag</label>
              <input name="assetTag" defaultValue={d.assetTag}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select name="category" defaultValue={d.category ?? 'hardware'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                {['hardware', 'software', 'vehicle', 'furniture', 'equipment', 'other'].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select name="status" defaultValue={d.status ?? 'active'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                {['active', 'maintenance', 'retired', 'lost'].map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
              <input name="assignedTo" defaultValue={d.assignedTo}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
            <input name="location" defaultValue={d.location}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Date</label>
              <input name="purchaseDate" type="date" defaultValue={d.purchaseDate?.slice(0, 10)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Price</label>
              <input name="purchasePrice" type="number" step="0.01" min="0" defaultValue={d.purchasePrice}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Current Value</label>
              <input name="currentValue" type="number" step="0.01" min="0" defaultValue={d.currentValue}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Serial Number</label>
              <input name="serialNumber" defaultValue={d.serialNumber}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Warranty Expiry</label>
            <input name="warranty" type="date" defaultValue={d.warranty?.slice(0, 10)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea name="notes" rows={3} defaultValue={d.notes}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Update'}
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

export function AssetDetailClient({ asset }: { asset: Asset }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const d = asset.data;
  const status = d.status ?? 'active';
  const cat = d.category ?? 'other';

  // Depreciation calc
  const purchasePrice = d.purchasePrice ?? 0;
  const currentValue = d.currentValue ?? 0;
  const depreciated = purchasePrice > 0 ? purchasePrice - currentValue : 0;
  const depreciationPct = purchasePrice > 0 ? Math.round((depreciated / purchasePrice) * 100) : 0;

  async function patchStatus(newStatus: string) {
    if (!confirm(`Mark asset as ${newStatus}?`)) return;
    setActionLoading(newStatus);
    try {
      await fetch(`/api/veska/assets/${asset.id}`, {
        method: 'PATCH',
        headers: reqHeaders(),
        body: JSON.stringify({ data: { status: newStatus } }),
      });
      startTransition(() => router.refresh());
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      <Link href="/dashboard/assets" className="text-sm text-gray-500 hover:text-gray-900 mb-6 inline-block">
        ← Assets
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{d.name ?? 'Unnamed Asset'}</h1>
            {d.assetTag && (
              <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{d.assetTag}</span>
            )}
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
              {status}
            </span>
          </div>
          {d.category && (
            <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600'}`}>
              {cat}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
          {status !== 'retired' && status !== 'lost' && (
            <button
              onClick={() => void patchStatus('retired')}
              disabled={actionLoading !== null}
              className="border border-amber-200 text-amber-600 text-sm px-4 py-2 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'retired' ? 'Retiring…' : 'Retire'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: all fields */}
        <div className="col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Asset Details</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                { label: 'Asset Tag', value: d.assetTag ?? '—' },
                { label: 'Serial Number', value: d.serialNumber ?? '—' },
                { label: 'Category', value: d.category ? (d.category.charAt(0).toUpperCase() + d.category.slice(1)) : '—' },
                { label: 'Status', value: d.status ? (d.status.charAt(0).toUpperCase() + d.status.slice(1)) : '—' },
                { label: 'Assigned To', value: d.assignedTo ?? '—' },
                { label: 'Location', value: d.location ?? '—' },
                { label: 'Purchase Date', value: fmtDate(d.purchaseDate) },
                { label: 'Purchase Price', value: fmtMoney(d.purchasePrice) },
                { label: 'Current Value', value: fmtMoney(d.currentValue) },
                { label: 'Warranty Expiry', value: fmtDate(d.warranty) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-gray-800">{value}</p>
                </div>
              ))}
              {d.notes && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-gray-600">{d.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Depreciation + AI Insights */}
        <div className="space-y-4">
          {/* Depreciation card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Depreciation</p>
            {purchasePrice > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">Purchase Price</p>
                  <p className="text-sm font-medium text-gray-900">{fmtMoney(purchasePrice)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">Current Value</p>
                  <p className="text-sm font-medium text-gray-900">{fmtMoney(currentValue)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">Depreciated</p>
                  <p className="text-sm font-medium text-red-600">{fmtMoney(depreciated)}</p>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between mb-1">
                    <p className="text-xs text-gray-400">Value retained</p>
                    <p className="text-xs font-medium text-gray-700">{100 - depreciationPct}%</p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${100 - depreciationPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{depreciationPct}% depreciated</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-2">No purchase price set.</p>
            )}
          </div>

          {/* AI Insights placeholder */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">AI Insights</p>
            <p className="text-xs text-gray-400 text-center py-4">
              AI analysis not configured for this asset.
            </p>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditAssetSlideOver
          asset={asset}
          onClose={() => setShowEdit(false)}
          onSaved={() => startTransition(() => { router.refresh(); })}
        />
      )}
    </div>
  );
}
