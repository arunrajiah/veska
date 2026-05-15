'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSignature,
  Plus,
  X,
  AlertTriangle,
  Clock,
  CheckCircle,
  Search,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export interface Contract {
  id: string;
  title?: string;
  type?: string;
  partyA?: string;
  partyB?: string;
  partyBEmail?: string;
  value?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  autoRenew?: boolean;
  renewalNoticeDays?: number;
  tags?: string[];
  content?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractSummary {
  byStatus?: Record<string, number>;
  totalValue?: number;
  activeCount?: number;
  expiringCount?: number;
}

function fmt(amount?: number, currency = 'USD') {
  if (amount == null) return '—';
  return amount.toLocaleString('en-US', { style: 'currency', currency });
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(d?: string): number | null {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  review: 'bg-yellow-50 text-yellow-700',
  sent: 'bg-blue-50 text-blue-700',
  signed: 'bg-indigo-50 text-indigo-700',
  active: 'bg-green-50 text-green-700',
  expired: 'bg-red-50 text-red-600',
  terminated: 'bg-red-100 text-red-700',
};

const TYPE_COLORS: Record<string, string> = {
  service: 'bg-sky-50 text-sky-700',
  employment: 'bg-violet-50 text-violet-700',
  vendor: 'bg-orange-50 text-orange-700',
  nda: 'bg-pink-50 text-pink-700',
  lease: 'bg-teal-50 text-teal-700',
  custom: 'bg-gray-100 text-gray-700',
};

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'draft';
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type?: string }) {
  const t = type ?? 'custom';
  const label = t.charAt(0).toUpperCase() + t.slice(1);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[t] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

// --- Slide-over create form ---
function ContractSlideOver({
  open,
  onClose,
  contract,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  contract?: Contract;
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
      title: fd.get('title') as string,
      type: fd.get('type') as string,
      partyA: fd.get('partyA') as string,
      partyB: fd.get('partyB') as string,
      partyBEmail: (fd.get('partyBEmail') as string) || undefined,
      value: fd.get('value') ? Number(fd.get('value')) : undefined,
      currency: fd.get('currency') as string,
      startDate: (fd.get('startDate') as string) || undefined,
      endDate: (fd.get('endDate') as string) || undefined,
      autoRenew: fd.get('autoRenew') === 'on',
      renewalNoticeDays: fd.get('renewalNoticeDays') ? Number(fd.get('renewalNoticeDays')) : undefined,
      tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      content: (fd.get('content') as string) || undefined,
    };
    try {
      const url = contract ? `${API_BASE}/contracts/${contract.id}` : `${API_BASE}/contracts`;
      const method = contract ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contract');
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
            {contract ? 'Edit contract' : 'New contract'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input name="title" required defaultValue={contract?.title}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
            <select name="type" required defaultValue={contract?.type ?? 'service'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
              <option value="service">Service</option>
              <option value="employment">Employment</option>
              <option value="vendor">Vendor</option>
              <option value="nda">NDA</option>
              <option value="lease">Lease</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Party A (us)</label>
              <input name="partyA" defaultValue={contract?.partyA ?? 'My Company'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Party B *</label>
              <input name="partyB" required defaultValue={contract?.partyB}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Party B email</label>
            <input name="partyBEmail" type="email" defaultValue={contract?.partyBEmail}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
              <input name="value" type="number" step="0.01" defaultValue={contract?.value}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <select name="currency" defaultValue={contract?.currency ?? 'USD'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start date</label>
              <input name="startDate" type="date"
                defaultValue={contract?.startDate ? contract.startDate.slice(0, 10) : undefined}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End date</label>
              <input name="endDate" type="date"
                defaultValue={contract?.endDate ? contract.endDate.slice(0, 10) : undefined}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input name="autoRenew" id="autoRenew" type="checkbox" defaultChecked={contract?.autoRenew}
              className="rounded border-gray-300" />
            <label htmlFor="autoRenew" className="text-sm text-gray-700">Auto-renew</label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Renewal notice (days)</label>
            <input name="renewalNoticeDays" type="number" defaultValue={contract?.renewalNoticeDays ?? 30}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input name="tags" defaultValue={contract?.tags?.join(', ')}
              placeholder="e.g. priority, 2026"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
            <textarea name="content" rows={5} defaultValue={contract?.content}
              placeholder="Contract body text or HTML…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : contract ? 'Update' : 'Create'}
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

// --- Sign modal ---
function SignModal({
  contractId,
  onClose,
  onSigned,
}: {
  contractId: string;
  onClose: () => void;
  onSigned: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      signerName: fd.get('signerName') as string,
      party: fd.get('party') as string,
    };
    try {
      const res = await fetch(`${API_BASE}/contracts/${contractId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSigned();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign contract');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Sign contract</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Signer name *</label>
            <input name="signerName" required placeholder="Full legal name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Signing as</label>
            <select name="party" defaultValue="partyA"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
              <option value="partyA">Party A (us)</option>
              <option value="partyB">Party B (them)</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? 'Signing…' : 'Sign'}
            </button>
            <button type="button" onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- All contracts tab ---
function AllContractsTab({
  contracts,
  onRefresh,
}: {
  contracts: Contract[];
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editContract, setEditContract] = useState<Contract | undefined>(undefined);
  const [showEdit, setShowEdit] = useState(false);
  const [signContractId, setSignContractId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const filtered = contracts.filter((c) => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (
        !c.title?.toLowerCase().includes(q) &&
        !c.partyB?.toLowerCase().includes(q) &&
        !c.partyBEmail?.toLowerCase().includes(q)
      ) return false;
    }
    if (typeFilter && c.type !== typeFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  async function sendContract(id: string) {
    setActionLoading(`${id}-send`);
    try {
      await fetch(`${API_BASE}/contracts/${id}/send`, {
        method: 'POST',
        headers: { 'x-tenant-id': TENANT_ID },
      });
      startTransition(() => { router.refresh(); onRefresh(); });
    } finally {
      setActionLoading(null);
    }
  }

  async function terminate(id: string) {
    if (!confirm('Terminate this contract?')) return;
    setActionLoading(`${id}-terminate`);
    try {
      await fetch(`${API_BASE}/contracts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ status: 'terminated' }),
      });
      startTransition(() => { router.refresh(); onRefresh(); });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contracts…"
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">All types</option>
          {['service', 'employment', 'vendor', 'nda', 'lease', 'custom'].map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">All statuses</option>
          {['draft', 'review', 'sent', 'signed', 'active', 'expired', 'terminated'].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <FileSignature size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No contracts found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Party B</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Value</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Start</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">End</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Expiry</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const days = daysUntil(c.endDate);
                return (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.title ?? '—'}</td>
                    <td className="px-4 py-3"><TypeBadge type={c.type} /></td>
                    <td className="px-4 py-3 text-gray-600">{c.partyB ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{fmt(c.value, c.currency)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.startDate)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.endDate)}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      {c.status === 'active' && days != null ? (
                        <span className={`text-xs font-medium ${days < 7 ? 'text-red-600' : days < 30 ? 'text-amber-600' : 'text-gray-500'}`}>
                          {days > 0 ? `${days}d` : 'Expired'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a href={`/dashboard/contracts/${c.id}`}
                          className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">
                          View
                        </a>
                        <button
                          onClick={() => { setEditContract(c); setShowEdit(true); }}
                          className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">
                          Edit
                        </button>
                        {(c.status === 'draft' || c.status === 'review') && (
                          <button
                            onClick={() => void sendContract(c.id)}
                            disabled={actionLoading !== null}
                            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 disabled:opacity-50">
                            Send
                          </button>
                        )}
                        {(c.status === 'sent' || c.status === 'signed') && (
                          <button
                            onClick={() => setSignContractId(c.id)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50">
                            Sign
                          </button>
                        )}
                        {c.status === 'active' && (
                          <button
                            onClick={() => void terminate(c.id)}
                            disabled={actionLoading !== null}
                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50">
                            Terminate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showEdit && (
        <ContractSlideOver
          open={showEdit}
          onClose={() => setShowEdit(false)}
          contract={editContract}
          onSaved={() => { startTransition(() => { router.refresh(); onRefresh(); }); }}
        />
      )}
      {signContractId && (
        <SignModal
          contractId={signContractId}
          onClose={() => setSignContractId(null)}
          onSigned={() => { startTransition(() => { router.refresh(); onRefresh(); }); }}
        />
      )}
    </>
  );
}

// --- Expiring soon tab ---
function ExpiringSoonTab({ tenantId }: { tenantId?: string }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/contracts/expiring-soon`, {
      headers: { 'x-tenant-id': TENANT_ID },
    })
      .then((r) => r.json())
      .then((data) => { setContracts(Array.isArray(data) ? data : []); })
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">Loading…</div>;
  }

  if (contracts.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
        <CheckCircle size={32} className="mx-auto mb-3 text-green-400" />
        <p className="text-gray-500 text-sm">No contracts expiring soon.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {contracts.map((c) => {
        const days = daysUntil(c.endDate);
        const urgency = days != null && days < 7 ? 'red' : days != null && days < 30 ? 'amber' : 'gray';
        return (
          <div key={c.id}
            className={`bg-white border rounded-xl p-5 flex items-start justify-between ${
              urgency === 'red' ? 'border-red-200 bg-red-50/30' :
              urgency === 'amber' ? 'border-amber-200 bg-amber-50/30' :
              'border-gray-200'
            }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                urgency === 'red' ? 'bg-red-100' :
                urgency === 'amber' ? 'bg-amber-100' :
                'bg-gray-100'
              }`}>
                {urgency === 'red' ? <AlertTriangle size={16} className="text-red-600" /> :
                 urgency === 'amber' ? <Clock size={16} className="text-amber-600" /> :
                 <Clock size={16} className="text-gray-500" />}
              </div>
              <div>
                <p className="font-medium text-gray-900">{c.title ?? '—'}</p>
                <p className="text-sm text-gray-500 mt-0.5">{c.partyB ?? '—'}</p>
                {c.endDate && (
                  <p className="text-xs text-gray-400 mt-1">Expires {fmtDate(c.endDate)}</p>
                )}
                {c.autoRenew && (
                  <p className="text-xs text-green-600 mt-0.5">Auto-renews ({c.renewalNoticeDays ?? 30} days notice)</p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className={`text-2xl font-bold ${urgency === 'red' ? 'text-red-600' : urgency === 'amber' ? 'text-amber-600' : 'text-gray-700'}`}>
                {days != null ? (days > 0 ? `${days}d` : 'Expired') : '—'}
              </p>
              <p className="text-xs text-gray-500">remaining</p>
              {c.value != null && (
                <p className="text-sm font-medium text-gray-700 mt-1">{fmt(c.value, c.currency)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Main client component ---
export function ContractsClient({
  contracts: initialContracts,
  summary,
}: {
  contracts: Contract[];
  summary: ContractSummary;
}) {
  const [tab, setTab] = useState<'all' | 'expiring'>('all');
  const [showForm, setShowForm] = useState(false);
  const [contracts, setContracts] = useState(initialContracts);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const byStatus = summary.byStatus ?? {};
  const statusCounts = ['draft', 'review', 'sent', 'signed', 'active', 'expired'];

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contracts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{contracts.length} contract{contracts.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
          <Plus size={15} />
          New contract
        </button>
      </div>

      {/* Status summary bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statusCounts.map((s) => {
          const count = byStatus[s] ?? contracts.filter((c) => c.status === s).length;
          return (
            <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-600'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="font-bold">{count}</span>
            </span>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {([['all', 'All Contracts'], ['expiring', 'Expiring Soon']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <AllContractsTab
          contracts={contracts}
          onRefresh={() => setContracts(initialContracts)}
        />
      )}
      {tab === 'expiring' && <ExpiringSoonTab />}

      <ContractSlideOver
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => { startTransition(() => { router.refresh(); setContracts(initialContracts); }); }}
      />
    </div>
  );
}
