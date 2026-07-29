'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, X, Star } from 'lucide-react';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export interface Vendor {
  id: string;
  data: {
    name?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    category?: string;
    paymentTerms?: string;
    rating?: number;
    status?: string;
    notes?: string;
    totalOrders?: number;
    totalSpend?: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  blocked: 'bg-red-100 text-red-600',
};

function StarRating({ rating }: { rating: number | undefined }) {
  const r = rating ?? 0;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < r ? 'text-yellow-400' : 'text-gray-200'}>
          ★
        </span>
      ))}
    </span>
  );
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

function AddVendorSlideOver({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name') as string,
      email: (fd.get('email') as string) || undefined,
      phone: (fd.get('phone') as string) || undefined,
      website: (fd.get('website') as string) || undefined,
      address: (fd.get('address') as string) || undefined,
      category: (fd.get('category') as string) || undefined,
      paymentTerms: (fd.get('paymentTerms') as string) || undefined,
      rating: fd.get('rating') ? Number(fd.get('rating')) : undefined,
      status: 'active',
      notes: (fd.get('notes') as string) || undefined,
    };
    try {
      const res = await fetch(`/api/veska/vendors`, {
        method: 'POST',
        headers: reqHeaders(),
        body: JSON.stringify({ data: body }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add vendor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Add Vendor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input
              name="name"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                name="email"
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input
                name="phone"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
            <input
              name="website"
              type="url"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
            <textarea
              name="address"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <input
                name="category"
                placeholder="e.g. supplier"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Terms</label>
              <input
                name="paymentTerms"
                placeholder="e.g. Net 30"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rating (1–5)</label>
            <select
              name="rating"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">No rating</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} star{n !== 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Add Vendor'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function VendorsPageClient({ vendors: initialVendors }: { vendors: Vendor[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [vendors] = useState(initialVendors);
  const [showAdd, setShowAdd] = useState(false);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  async function aiEnrich(id: string) {
    setEnrichingId(id);
    try {
      await fetch(`/api/veska/vendors/${id}/enrich`, {
        method: 'POST',
        headers: reqHeaders(),
      });
      startTransition(() => router.refresh());
    } finally {
      setEnrichingId(null);
    }
  }

  const active = vendors.filter((v) => (v.data.status ?? 'active') === 'active').length;
  const avgRating = (() => {
    const rated = vendors.filter((v) => (v.data.rating ?? 0) > 0);
    if (!rated.length) return 0;
    return rated.reduce((s, v) => s + (v.data.rating ?? 0), 0) / rated.length;
  })();

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-0.5">{vendors.length} vendors</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Add Vendor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Vendors', value: vendors.length },
          { label: 'Active', value: active },
          { label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(1) : '—', star: true },
          { label: 'Blocked', value: vendors.filter((v) => v.data.status === 'blocked').length },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              {s.star && <Star size={16} className="text-yellow-400 fill-yellow-400" />}
            </div>
          </div>
        ))}
      </div>

      {vendors.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No vendors yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Vendor Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Payment Terms
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Orders</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Spend</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => {
                const d = v.data;
                const status = d.status ?? 'active';
                return (
                  <tr
                    key={v.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs capitalize">
                      {d.category ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{d.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StarRating rating={d.rating} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{d.paymentTerms ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 text-xs">
                      {d.totalOrders ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 text-xs font-medium">
                      {fmtMoney(d.totalSpend)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => void aiEnrich(v.id)}
                          disabled={enrichingId === v.id}
                          title="AI Enrich"
                          className="text-xs text-violet-600 hover:text-violet-800 px-2 py-1 rounded hover:bg-violet-50 disabled:opacity-50 transition-colors"
                        >
                          {enrichingId === v.id ? 'Enriching…' : 'AI Enrich'}
                        </button>
                        <Link
                          href={`/dashboard/vendors/${v.id}`}
                          className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                        >
                          View →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddVendorSlideOver
          onClose={() => setShowAdd(false)}
          onSaved={() =>
            startTransition(() => {
              router.refresh();
            })
          }
        />
      )}
    </div>
  );
}

// Legacy export
export function VendorsClient({ vendors, summary }: { vendors: unknown[]; summary: unknown }) {
  return <VendorsPageClient vendors={[]} />;
}
