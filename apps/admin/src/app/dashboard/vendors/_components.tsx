'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  Star,
  Plus,
  X,
  Search,
  Filter,
  Tag,
} from 'lucide-react';
import type { Vendor, VendorSummary } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

const CATEGORY_COLORS: Record<string, string> = {
  supplier: 'bg-blue-50 text-blue-700',
  contractor: 'bg-violet-50 text-violet-700',
  'service-provider': 'bg-teal-50 text-teal-700',
  utility: 'bg-amber-50 text-amber-700',
  general: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  suspended: 'bg-red-50 text-red-600',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StarRating({ rating, interactive = false, onRate }: { rating?: number; interactive?: boolean; onRate?: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const val = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          className={`transition-colors ${
            n <= (interactive ? hover || val : val)
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-300 fill-gray-200'
          } ${interactive ? 'cursor-pointer' : ''}`}
          onMouseEnter={interactive ? () => setHover(n) : undefined}
          onMouseLeave={interactive ? () => setHover(0) : undefined}
          onClick={interactive && onRate ? () => onRate(n) : undefined}
        />
      ))}
    </div>
  );
}

function CategoryBadge({ category }: { category?: string }) {
  const c = category ?? 'general';
  const label = c.replace(/-/g, ' ');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_COLORS[c] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'active';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-600'}`}>
      {s}
    </span>
  );
}

// --- Vendor Slide-Over ---
function VendorSlideOver({
  open,
  onClose,
  vendor,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  vendor?: Vendor;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const tagsRaw = (fd.get('tags') as string) || '';
    const body = {
      name: fd.get('name') as string,
      category: fd.get('category') as string,
      email: (fd.get('email') as string) || undefined,
      phone: (fd.get('phone') as string) || undefined,
      website: (fd.get('website') as string) || undefined,
      address: (fd.get('address') as string) || undefined,
      currency: (fd.get('currency') as string) || 'USD',
      paymentTerms: fd.get('paymentTerms') ? Number(fd.get('paymentTerms')) : undefined,
      taxId: (fd.get('taxId') as string) || undefined,
      notes: (fd.get('notes') as string) || undefined,
      tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    };
    try {
      const url = vendor ? `${API_BASE}/vendors/${vendor.id}` : `${API_BASE}/vendors`;
      const method = vendor ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {vendor ? 'Edit vendor' : 'Add vendor'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input name="name" required defaultValue={vendor?.name}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
            <select name="category" required defaultValue={vendor?.category ?? 'general'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
              <option value="supplier">Supplier</option>
              <option value="contractor">Contractor</option>
              <option value="service-provider">Service Provider</option>
              <option value="utility">Utility</option>
              <option value="general">General</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input name="email" type="email" defaultValue={vendor?.email}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input name="phone" defaultValue={vendor?.phone}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
            <input name="website" type="url" defaultValue={vendor?.website}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
            <textarea name="address" rows={2} defaultValue={vendor?.address}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <select name="currency" defaultValue={vendor?.currency ?? 'USD'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment terms (days)</label>
              <input name="paymentTerms" type="number" min="0" defaultValue={vendor?.paymentTerms ?? 30}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tax ID</label>
            <input name="taxId" defaultValue={vendor?.taxId}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea name="notes" rows={3} defaultValue={vendor?.notes}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input name="tags" defaultValue={vendor?.tags?.join(', ')} placeholder="e.g. preferred, 2026"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : vendor ? 'Update' : 'Add vendor'}
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

// --- Vendors Tab ---
function VendorsTab({
  vendors,
  onRefresh,
}: {
  vendors: Vendor[];
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editVendor, setEditVendor] = useState<Vendor | undefined>(undefined);
  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const filtered = vendors.filter((v) => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (
        !v.name?.toLowerCase().includes(q) &&
        !v.email?.toLowerCase().includes(q) &&
        !v.code?.toLowerCase().includes(q)
      ) return false;
    }
    if (categoryFilter && v.category !== categoryFilter) return false;
    if (statusFilter && v.status !== statusFilter) return false;
    return true;
  });

  async function deactivate(id: string) {
    if (!confirm('Deactivate this vendor?')) return;
    setActionLoading(`${id}-deactivate`);
    try {
      await fetch(`${API_BASE}/vendors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ status: 'inactive' }),
      });
      startTransition(() => { router.refresh(); onRefresh(); });
    } finally {
      setActionLoading(null);
    }
  }

  const totalVendors = vendors.length;
  const activeCount = vendors.filter((v) => v.status === 'active' || !v.status).length;
  const ratings = vendors.map((v) => v.rating ?? 0).filter((r) => r > 0);
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;
  const outstandingCount = vendors.filter((v) => v.status === 'active').length;

  return (
    <>
      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total vendors', value: totalVendors },
          { label: 'Active', value: activeCount },
          { label: 'Avg rating', value: avgRating.toFixed(1), star: true },
          { label: 'Outstanding invoices', value: outstandingCount },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              {s.star && <Star size={16} className="text-amber-400 fill-amber-400" />}
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Add button */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors…"
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">All categories</option>
          {['supplier', 'contractor', 'service-provider', 'utility', 'general'].map((c) => (
            <option key={c} value={c}>{c.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">All statuses</option>
          {['active', 'inactive', 'suspended'].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
          <Plus size={15} />
          Add vendor
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <Truck size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No vendors found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Payment terms</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    {v.code ? (
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{v.code}</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{v.name ?? '—'}</td>
                  <td className="px-4 py-3"><CategoryBadge category={v.category} /></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{v.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {v.paymentTerms != null ? `Net ${v.paymentTerms} days` : '—'}
                  </td>
                  <td className="px-4 py-3"><StarRating rating={v.rating} /></td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/dashboard/vendors/${v.id}`}
                        className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">
                        View
                      </a>
                      <button
                        onClick={() => { setEditVendor(v); setShowEdit(true); }}
                        className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">
                        Edit
                      </button>
                      {(v.status === 'active' || !v.status) && (
                        <button
                          onClick={() => void deactivate(v.id)}
                          disabled={actionLoading !== null}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50">
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <VendorSlideOver
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onSaved={() => { startTransition(() => { router.refresh(); onRefresh(); }); }}
        />
      )}
      {showEdit && (
        <VendorSlideOver
          open={showEdit}
          onClose={() => setShowEdit(false)}
          vendor={editVendor}
          onSaved={() => { startTransition(() => { router.refresh(); onRefresh(); }); }}
        />
      )}
    </>
  );
}

// --- Summary Tab ---
function SummaryTab({ vendors, summary }: { vendors: Vendor[]; summary: VendorSummary }) {
  const byCategory = summary.byCategory ?? {};
  const categories = Object.keys(byCategory).length
    ? Object.entries(byCategory)
    : (['supplier', 'contractor', 'service-provider', 'utility', 'general'] as const).map((c) => [
        c,
        vendors.filter((v) => v.category === c).length,
      ] as [string, number]);

  const total = categories.reduce((sum, [, count]) => sum + (count as number), 0) || 1;

  const topRated = [...vendors]
    .filter((v) => (v.rating ?? 0) > 0)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);

  const byStatus = summary.byStatus ?? {};
  const statusEntries = Object.keys(byStatus).length
    ? Object.entries(byStatus)
    : (['active', 'inactive', 'suspended'] as const).map((s) => [
        s,
        vendors.filter((v) => (v.status ?? 'active') === s).length,
      ] as [string, number]);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Category breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">By category</h3>
        <div className="space-y-3">
          {categories.map(([cat, count]) => {
            const pct = Math.round(((count as number) / total) * 100);
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 capitalize">{String(cat).replace(/-/g, ' ')}</span>
                  <span className="text-xs text-gray-500">{count as number} ({pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-800 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top-rated vendors */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Top-rated vendors</h3>
        {topRated.length === 0 ? (
          <p className="text-sm text-gray-400">No ratings yet.</p>
        ) : (
          <div className="space-y-3">
            {topRated.map((v, i) => (
              <div key={v.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{v.name ?? '—'}</p>
                  <CategoryBadge category={v.category} />
                </div>
                <StarRating rating={v.rating} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status distribution */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Status distribution</h3>
        <div className="space-y-3">
          {statusEntries.map(([status, count]) => {
            const pct = Math.round(((count as number) / (vendors.length || 1)) * 100);
            return (
              <div key={status}>
                <div className="flex items-center justify-between mb-1">
                  <StatusBadge status={status} />
                  <span className="text-xs text-gray-500">{count as number} ({pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${status === 'active' ? 'bg-green-500' : status === 'suspended' ? 'bg-red-400' : 'bg-gray-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Main Client Component ---
export function VendorsClient({
  vendors: initialVendors,
  summary,
}: {
  vendors: Vendor[];
  summary: VendorSummary;
}) {
  const [tab, setTab] = useState<'vendors' | 'summary'>('vendors');
  const [vendors, setVendors] = useState(initialVendors);

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Truck size={22} className="text-gray-600" />
            Vendors
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([['vendors', 'Vendors'], ['summary', 'Summary']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'vendors' && (
        <VendorsTab vendors={vendors} onRefresh={() => setVendors(initialVendors)} />
      )}
      {tab === 'summary' && (
        <SummaryTab vendors={vendors} summary={summary} />
      )}
    </div>
  );
}
