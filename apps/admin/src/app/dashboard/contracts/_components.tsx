'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, X, AlertTriangle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export interface Contract {
  id: string;
  data: {
    title?: string;
    partyName?: string;
    partyEmail?: string;
    type?: string;
    status?: string;
    value?: number;
    startDate?: string;
    endDate?: string;
    autoRenew?: boolean;
    notes?: string;
    signedDate?: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  review: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-600',
  terminated: 'bg-red-100 text-red-700',
};

const TYPE_COLORS: Record<string, string> = {
  vendor: 'bg-orange-100 text-orange-700',
  customer: 'bg-blue-100 text-blue-700',
  employee: 'bg-violet-100 text-violet-700',
  nda: 'bg-pink-100 text-pink-700',
  service: 'bg-sky-100 text-sky-700',
};

const TABS = ['all', 'draft', 'review', 'active', 'expiring', 'expired', 'terminated'] as const;

function daysUntil(d?: string): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(n?: number) {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function endDateColor(endDate?: string, status?: string): string {
  if (!endDate || status !== 'active') return '';
  const days = daysUntil(endDate);
  if (days == null) return '';
  if (days < 30) return 'text-red-600 font-semibold';
  if (days < 90) return 'text-orange-500 font-medium';
  return '';
}

function NewContractSlideOver({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get('title') as string,
      partyName: fd.get('partyName') as string,
      partyEmail: (fd.get('partyEmail') as string) || undefined,
      type: fd.get('type') as string,
      value: fd.get('value') ? Number(fd.get('value')) : undefined,
      startDate: (fd.get('startDate') as string) || undefined,
      endDate: (fd.get('endDate') as string) || undefined,
      autoRenew: fd.get('autoRenew') === 'on',
      notes: (fd.get('notes') as string) || undefined,
      status: 'draft',
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': TENANT_ID,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify({ data: body }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contract');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Contract</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input name="title" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Party Name *</label>
              <input name="partyName" required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Party Email</label>
              <input name="partyEmail" type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
              <select name="type" required defaultValue="service"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="vendor">Vendor</option>
                <option value="customer">Customer</option>
                <option value="employee">Employee</option>
                <option value="nda">NDA</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
              <input name="value" type="number" step="0.01" min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input name="startDate" type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input name="endDate" type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input name="autoRenew" id="autoRenew" type="checkbox" className="rounded border-gray-300" />
            <label htmlFor="autoRenew" className="text-sm text-gray-700">Auto-renew</label>
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
              {saving ? 'Creating…' : 'Create Contract'}
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

export function ContractsPageClient({ contracts: initialContracts }: { contracts: Contract[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<typeof TABS[number]>('all');
  const [showNew, setShowNew] = useState(false);
  const [contracts] = useState(initialContracts);

  // Stats
  const total = contracts.length;
  const active = contracts.filter((c) => c.data.status === 'active').length;
  const expiringSoon = contracts.filter((c) => {
    const days = daysUntil(c.data.endDate);
    return c.data.status === 'active' && days != null && days >= 0 && days <= 30;
  }).length;
  const expired = contracts.filter((c) => c.data.status === 'expired').length;

  // Filter by tab
  const filtered = contracts.filter((c) => {
    if (tab === 'all') return true;
    if (tab === 'expiring') {
      const days = daysUntil(c.data.endDate);
      return c.data.status === 'active' && days != null && days >= 0 && days <= 30;
    }
    return c.data.status === tab;
  });

  // Expiring soon banner contracts
  const expiringContracts = contracts.filter((c) => {
    const days = daysUntil(c.data.endDate);
    return c.data.status === 'active' && days != null && days >= 0 && days <= 30;
  });

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contracts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} contract{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New Contract
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: total },
          { label: 'Active', value: active },
          { label: 'Expiring Soon', value: expiringSoon },
          { label: 'Expired', value: expired },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Expiring soon banner */}
      {expiringContracts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {expiringContracts.length} contract{expiringContracts.length !== 1 ? 's' : ''} expiring within 30 days
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {expiringContracts.slice(0, 5).map((c) => {
                  const days = daysUntil(c.data.endDate);
                  return (
                    <Link
                      key={c.id}
                      href={`/dashboard/contracts/${c.id}`}
                      className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded hover:bg-amber-200 transition-colors"
                    >
                      {c.data.title ?? c.id.slice(0, 8)} ({days}d)
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map((t) => (
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
          <p className="text-gray-400 text-sm">No contracts found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Party</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Value</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Start</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">End</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Auto-Renew</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Days Left</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const d = c.data;
                const status = d.status ?? 'draft';
                const days = daysUntil(d.endDate);
                const endColor = endDateColor(d.endDate, status);
                return (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/dashboard/contracts/${c.id}`} className="hover:text-gray-700">
                        {d.title ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{d.partyName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[d.type ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                        {d.type ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 text-xs font-medium">{fmtMoney(d.value)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(d.startDate)}</td>
                    <td className={`px-4 py-3 text-xs ${endColor || 'text-gray-500'}`}>{fmtDate(d.endDate)}</td>
                    <td className="px-4 py-3">
                      {d.autoRenew ? (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Auto</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {status === 'active' && days != null ? (
                        <span className={`text-xs font-medium ${days < 30 ? 'text-red-600' : days < 90 ? 'text-orange-500' : 'text-gray-500'}`}>
                          {days > 0 ? `${days}d` : 'Expired'}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/contracts/${c.id}`} className="text-xs text-gray-500 hover:text-gray-900">
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewContractSlideOver
          onClose={() => setShowNew(false)}
          onSaved={() => startTransition(() => { router.refresh(); })}
        />
      )}
    </div>
  );
}

// Legacy export for backward compat with old page.tsx
export function ContractsClient({ contracts, summary }: { contracts: unknown[]; summary: unknown }) {
  return <ContractsPageClient contracts={[]} />;
}
