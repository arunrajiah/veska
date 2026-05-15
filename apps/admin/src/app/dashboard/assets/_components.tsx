'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  TrendingDown,
  Edit2,
  Trash2,
  X,
  Package,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function tenantHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': 'demo-tenant',
  };
}

function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '—';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-50', text: 'text-green-700' },
  maintenance: { bg: 'bg-amber-50', text: 'text-amber-700' },
  retired: { bg: 'bg-gray-100', text: 'text-gray-500' },
  disposed: { bg: 'bg-red-50', text: 'text-red-600' },
};

const CATEGORY_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-teal-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-orange-500',
];

export interface Asset {
  id: string;
  name: string;
  category?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currency?: string;
  currentBookValue?: number;
  depreciationMethod?: string;
  usefulLifeYears?: number;
  salvageValue?: number;
  assignedTo?: string;
  location?: string;
  notes?: string;
  status?: string;
  createdAt?: string;
}

export interface AssetSummary {
  totalAssets?: number;
  totalPurchaseValue?: number;
  totalCurrentBookValue?: number;
  byCategory?: Record<string, number>;
  byStatus?: Record<string, number>;
}

interface DepreciationRow {
  year: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

interface DepreciationSchedule {
  method?: string;
  annualDepreciation?: number;
  currentBookValue?: number;
  schedule?: DepreciationRow[];
  currentYear?: number;
}

// ─────────────────────────────────────────
// Add / Edit Asset Slide-over
// ─────────────────────────────────────────
interface AssetFormProps {
  initial?: Asset | null;
  onClose: () => void;
  onSaved: (asset: Asset) => void;
}

const BLANK_FORM = {
  name: '',
  category: '',
  serialNumber: '',
  purchaseDate: '',
  purchasePrice: '',
  currency: 'USD',
  depreciationMethod: 'straight-line',
  usefulLifeYears: '',
  salvageValue: '',
  assignedTo: '',
  location: '',
  notes: '',
  status: 'active',
};

function AssetForm({ initial, onClose, onSaved }: AssetFormProps) {
  const [form, setForm] = useState(() => ({
    ...BLANK_FORM,
    ...(initial
      ? {
          name: initial.name ?? '',
          category: initial.category ?? '',
          serialNumber: initial.serialNumber ?? '',
          purchaseDate: initial.purchaseDate ? initial.purchaseDate.slice(0, 10) : '',
          purchasePrice: initial.purchasePrice != null ? String(initial.purchasePrice) : '',
          currency: initial.currency ?? 'USD',
          depreciationMethod: initial.depreciationMethod ?? 'straight-line',
          usefulLifeYears: initial.usefulLifeYears != null ? String(initial.usefulLifeYears) : '',
          salvageValue: initial.salvageValue != null ? String(initial.salvageValue) : '',
          assignedTo: initial.assignedTo ?? '',
          location: initial.location ?? '',
          notes: initial.notes ?? '',
          status: initial.status ?? 'active',
        }
      : {}),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name,
        category: form.category || undefined,
        serialNumber: form.serialNumber || undefined,
        purchaseDate: form.purchaseDate || undefined,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
        currency: form.currency,
        depreciationMethod: form.depreciationMethod,
        usefulLifeYears: form.usefulLifeYears ? parseInt(form.usefulLifeYears) : undefined,
        salvageValue: form.salvageValue ? parseFloat(form.salvageValue) : undefined,
        assignedTo: form.assignedTo || undefined,
        location: form.location || undefined,
        notes: form.notes || undefined,
        status: form.status,
      };
      const method = initial?.id ? 'PUT' : 'POST';
      const url = initial?.id ? `${API_BASE}/assets/${initial.id}` : `${API_BASE}/assets`;
      const res = await fetch(url, {
        method,
        headers: tenantHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? 'Failed to save');
        return;
      }
      const saved = await res.json() as Asset;
      onSaved(saved);
    } catch {
      setError('Failed to save asset');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="w-[480px] bg-white h-full overflow-y-auto flex flex-col shadow-2xl">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {initial?.id ? 'Edit Asset' : 'Add Asset'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name *</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="e.g. MacBook Pro 16&quot;" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <input type="text" value={form.category} onChange={(e) => set('category', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="e.g. Equipment" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Serial number</label>
              <input type="text" value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="SN-12345" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Purchase date</label>
              <input type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Purchase price</label>
              <input type="number" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Currency</label>
              <input type="text" value={form.currency} onChange={(e) => set('currency', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="USD" maxLength={3} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
                <option value="disposed">Disposed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Depreciation method</label>
            <select value={form.depreciationMethod} onChange={(e) => set('depreciationMethod', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="straight-line">Straight-line</option>
              <option value="declining-balance">Declining balance</option>
              <option value="none">None</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Useful life (years)</label>
              <input type="number" value={form.usefulLifeYears} onChange={(e) => set('usefulLifeYears', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="5" min="1" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Salvage value</label>
              <input type="number" value={form.salvageValue} onChange={(e) => set('salvageValue', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Assigned to</label>
            <input type="text" value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Employee name" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Location</label>
            <input type="text" value={form.location} onChange={(e) => set('location', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Office, warehouse, etc." />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              rows={3} placeholder="Any additional notes" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : (initial?.id ? 'Update asset' : 'Add asset')}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Depreciation Modal
// ─────────────────────────────────────────
function DepreciationModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const [schedule, setSchedule] = useState<DepreciationSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/assets/${asset.id}/depreciation`, {
          headers: { 'x-tenant-id': 'demo-tenant' },
        });
        if (!res.ok) { setError('Failed to load depreciation schedule'); return; }
        const d = await res.json() as DepreciationSchedule;
        setSchedule(d);
      } catch {
        setError('Failed to load depreciation schedule');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id]);

  const currentYear = schedule?.currentYear ?? new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Depreciation Schedule</h2>
            <p className="text-xs text-gray-400">{asset.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : schedule ? (
            <div className="space-y-4">
              {/* Header cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Method</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {schedule.method ?? asset.depreciationMethod ?? '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Annual depreciation</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(schedule.annualDepreciation)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Current book value</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(schedule.currentBookValue ?? asset.currentBookValue)}
                  </p>
                </div>
              </div>

              {/* Schedule table */}
              {schedule.schedule && schedule.schedule.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Year</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Annual Depr.</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Accumulated</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Book Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.schedule.map((row) => {
                        const isCurrentYear = row.year === currentYear;
                        return (
                          <tr
                            key={row.year}
                            className={`border-b border-gray-50 last:border-0 ${isCurrentYear ? 'bg-indigo-50/60' : 'hover:bg-gray-50/50'}`}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className={isCurrentYear ? 'font-semibold text-indigo-700' : 'text-gray-700'}>
                                  {row.year}
                                </span>
                                {isCurrentYear && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 font-medium">
                                    Current
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-700">
                              {formatCurrency(row.annualDepreciation)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-700">
                              {formatCurrency(row.accumulatedDepreciation)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                              {formatCurrency(row.bookValue)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-6">No schedule data available.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Main AssetsClient
// ─────────────────────────────────────────
interface AssetsClientProps {
  assets: Asset[];
  summary: AssetSummary;
}

export function AssetsClient({ assets: initialAssets, summary: initialSummary }: AssetsClientProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [activeTab, setActiveTab] = useState<'assets' | 'summary'>('assets');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [depreciationAsset, setDepreciationAsset] = useState<Asset | null>(null);
  const [disposingId, setDisposingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const categories = Array.from(new Set(assets.map((a) => a.category).filter(Boolean))) as string[];

  const filtered = assets.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    return true;
  });

  async function handleDispose(id: string) {
    if (!confirm('Mark this asset as disposed?')) return;
    setDisposingId(id);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/assets/${id}/dispose`, {
        method: 'POST',
        headers: tenantHeaders(),
      });
      if (res.ok) {
        setAssets((prev) => prev.map((a) => a.id === id ? { ...a, status: 'disposed' } : a));
      } else {
        setError('Failed to dispose asset');
      }
    } catch {
      setError('Failed to dispose asset');
    } finally {
      setDisposingId(null);
    }
  }

  function handleSaved(asset: Asset) {
    setAssets((prev) => {
      const idx = prev.findIndex((a) => a.id === asset.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = asset;
        return next;
      }
      return [asset, ...prev];
    });
    setShowForm(false);
    setEditingAsset(null);
  }

  // Summary tab data
  const totalByCategory = assets.reduce<Record<string, number>>((acc, a) => {
    const cat = a.category ?? 'Uncategorized';
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  const totalByStatus = assets.reduce<Record<string, number>>((acc, a) => {
    const s = a.status ?? 'unknown';
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const totalPurchaseValue = assets.reduce((sum, a) => sum + (a.purchasePrice ?? 0), 0);
  const totalBookValue = assets.reduce((sum, a) => sum + (a.currentBookValue ?? a.purchasePrice ?? 0), 0);
  const categoryEntries = Object.entries(totalByCategory).sort((a, b) => b[1] - a[1]);
  const maxCatCount = categoryEntries[0]?.[1] ?? 1;

  const STATUS_PILL: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    maintenance: 'bg-amber-100 text-amber-700',
    retired: 'bg-gray-100 text-gray-600',
    disposed: 'bg-red-100 text-red-600',
  };

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Asset Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track fixed assets, depreciation, and portfolio value.</p>
        </div>
        <button
          onClick={() => { setEditingAsset(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} /> Add asset
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['assets', 'summary'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total assets</p>
              <p className="text-2xl font-semibold text-gray-900">{initialSummary.totalAssets ?? assets.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total purchase value</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(initialSummary.totalPurchaseValue ?? totalPurchaseValue)}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total book value</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(initialSummary.totalCurrentBookValue ?? totalBookValue)}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
                <option value="disposed">Disposed</option>
              </select>
            </div>
            {categories.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="all">All categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Assets table */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center bg-white border border-gray-200 rounded-xl">
              <Building2 size={40} className="text-gray-300 mb-4" />
              <p className="text-sm font-medium text-gray-500">No assets found</p>
              <p className="text-xs text-gray-400 mt-1">
                {assets.length === 0 ? 'Add your first asset to get started.' : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Serial #</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Purchase date</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Purchase price</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Book value</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Assigned to</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((asset) => {
                      const statusStyle = STATUS_BADGE[asset.status ?? 'active'] ?? STATUS_BADGE.active;
                      return (
                        <tr key={asset.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{asset.name}</p>
                          </td>
                          <td className="px-4 py-3">
                            {asset.category ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                {asset.category}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">
                            {asset.serialNumber ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {asset.purchaseDate
                              ? new Date(asset.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            {formatCurrency(asset.purchasePrice)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {formatCurrency(asset.currentBookValue)}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{asset.assignedTo ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                              {asset.status ?? 'active'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setDepreciationAsset(asset)}
                                title="View depreciation"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              >
                                <TrendingDown size={14} />
                              </button>
                              <button
                                onClick={() => { setEditingAsset(asset); setShowForm(true); }}
                                title="Edit"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => void handleDispose(asset.id)}
                                disabled={disposingId === asset.id || asset.status === 'disposed'}
                                title="Dispose"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Portfolio value */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Portfolio overview</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Total assets</p>
                <p className="text-2xl font-semibold text-gray-900">{assets.length}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Total purchase value</p>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(totalPurchaseValue)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Current book value</p>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(totalBookValue)}</p>
              </div>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Status breakdown</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(totalByStatus).map(([status, count]) => (
                <div
                  key={status}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${STATUS_PILL[status] ?? 'bg-gray-50 text-gray-600'}`}
                >
                  <span className="text-sm font-medium capitalize">{status}</span>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(totalByStatus).length === 0 && (
                <p className="text-sm text-gray-400">No assets yet.</p>
              )}
            </div>
          </div>

          {/* By category */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Assets by category</h2>
            {categoryEntries.length === 0 ? (
              <p className="text-sm text-gray-400">No category data.</p>
            ) : (
              <div className="space-y-3">
                {categoryEntries.map(([cat, count], i) => {
                  const pct = Math.round((count / assets.length) * 100);
                  const barColor = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="w-28 text-xs text-gray-600 truncate shrink-0">{cat}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${(count / maxCatCount) * 100}%` }}
                        />
                      </div>
                      <div className="w-20 text-right text-xs text-gray-500 shrink-0">
                        {count} ({pct}%)
                      </div>
                      <Package size={13} className="text-gray-300 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-over form */}
      {showForm && (
        <AssetForm
          initial={editingAsset}
          onClose={() => { setShowForm(false); setEditingAsset(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Depreciation modal */}
      {depreciationAsset && (
        <DepreciationModal
          asset={depreciationAsset}
          onClose={() => setDepreciationAsset(null)}
        />
      )}
    </div>
  );
}
