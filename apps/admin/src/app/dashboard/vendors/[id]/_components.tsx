'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export interface VendorDetail {
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

export interface Contract {
  id: string;
  data: {
    title?: string;
    type?: string;
    status?: string;
    value?: number;
    endDate?: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  blocked: 'bg-red-100 text-red-600',
};

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  review: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-600',
  terminated: 'bg-red-100 text-red-700',
};

function StarRating({ rating }: { rating: number | undefined }) {
  const r = rating ?? 0;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < r ? 'text-yellow-400' : 'text-gray-200'}>★</span>
      ))}
    </span>
  );
}

function fmtMoney(n?: number) {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function reqHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

function EditVendorSlideOver({ vendor, onClose, onSaved }: { vendor: VendorDetail; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const d = vendor.data;

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
      notes: (fd.get('notes') as string) || undefined,
    };
    try {
      const res = await fetch(`/api/veska/vendors/${vendor.id}`, {
        method: 'PATCH',
        headers: reqHeaders(),
        body: JSON.stringify({ data: body }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Edit Vendor</h2>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input name="email" type="email" defaultValue={d.email}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input name="phone" defaultValue={d.phone}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
            <input name="website" type="url" defaultValue={d.website}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
            <textarea name="address" rows={2} defaultValue={d.address}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <input name="category" defaultValue={d.category}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Terms</label>
              <input name="paymentTerms" defaultValue={d.paymentTerms}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rating (1–5)</label>
            <select name="rating" defaultValue={d.rating ?? ''}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">No rating</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} star{n !== 1 ? 's' : ''}</option>)}
            </select>
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

export function VendorDetailPageClient({
  vendor,
  contracts,
}: {
  vendor: VendorDetail;
  contracts: Contract[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showEdit, setShowEdit] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const d = vendor.data;
  const status = d.status ?? 'active';

  async function aiEnrich() {
    setEnriching(true);
    try {
      await fetch(`/api/veska/vendors/${vendor.id}/enrich`, {
        method: 'POST',
        headers: reqHeaders(),
      });
      startTransition(() => router.refresh());
    } finally {
      setEnriching(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      <Link href="/dashboard/vendors" className="text-sm text-gray-500 hover:text-gray-900 mb-6 inline-block">
        ← Vendors
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{d.name ?? 'Unnamed Vendor'}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
              {status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <StarRating rating={d.rating} />
            {d.category && <span className="text-sm text-gray-500 capitalize">{d.category}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void aiEnrich()}
            disabled={enriching}
            className="border border-violet-200 text-violet-600 text-sm px-4 py-2 rounded-lg hover:bg-violet-50 disabled:opacity-50 transition-colors"
          >
            {enriching ? 'Enriching…' : 'AI Enrich'}
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: detail fields */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Vendor Details</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                { label: 'Email', value: d.email ?? '—' },
                { label: 'Phone', value: d.phone ?? '—' },
                { label: 'Website', value: d.website ?? '—' },
                { label: 'Payment Terms', value: d.paymentTerms ?? '—' },
                { label: 'Category', value: d.category ?? '—' },
                { label: 'Total Orders', value: String(d.totalOrders ?? 0) },
                { label: 'Total Spend', value: fmtMoney(d.totalSpend) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-gray-800">{value}</p>
                </div>
              ))}
              {d.address && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Address</p>
                  <p className="text-gray-800 whitespace-pre-line">{d.address}</p>
                </div>
              )}
              {d.notes && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-gray-600">{d.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Contracts + AI Insights */}
        <div className="space-y-4">
          {/* Linked contracts */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contracts</p>
              <Link href="/dashboard/contracts" className="text-xs text-gray-400 hover:text-gray-900">View all →</Link>
            </div>
            {contracts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No linked contracts.</p>
            ) : (
              <div className="space-y-2">
                {contracts.map((c) => {
                  const cs = c.data.status ?? 'draft';
                  return (
                    <div key={c.id} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <Link href={`/dashboard/contracts/${c.id}`} className="text-xs font-medium text-gray-700 hover:text-gray-900">
                          {c.data.title ?? c.id.slice(0, 8).toUpperCase()}
                        </Link>
                        <p className="text-xs text-gray-400">{fmtDate(c.data.endDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-700">{fmtMoney(c.data.value)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${CONTRACT_STATUS_COLORS[cs] ?? 'bg-gray-100 text-gray-600'}`}>
                          {cs}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Insights */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">AI Insights</p>
            <p className="text-xs text-gray-400 text-center py-4">
              Click &ldquo;AI Enrich&rdquo; to get AI-powered insights about this vendor.
            </p>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditVendorSlideOver
          vendor={vendor}
          onClose={() => setShowEdit(false)}
          onSaved={() => startTransition(() => { router.refresh(); })}
        />
      )}
    </div>
  );
}

// Legacy export for backward compat
export function VendorDetailClient({ vendor }: { vendor: unknown }) {
  return null;
}
