'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  Clock,
  Send,
  FileSignature,
  AlertTriangle,
  X,
  Edit2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ContractEvent {
  id: string;
  type?: string;
  actor?: string;
  notes?: string;
  createdAt?: string;
}

interface ContractDetail {
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
  events?: ContractEvent[];
}

function fmt(amount?: number, currency = 'USD') {
  if (amount == null) return '—';
  return amount.toLocaleString('en-US', { style: 'currency', currency });
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'draft';
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  created: <FileSignature size={14} className="text-gray-500" />,
  sent: <Send size={14} className="text-blue-500" />,
  viewed: <Clock size={14} className="text-gray-400" />,
  signed: <CheckCircle size={14} className="text-green-600" />,
  approved: <CheckCircle size={14} className="text-indigo-600" />,
  terminated: <AlertTriangle size={14} className="text-red-500" />,
  expired: <AlertTriangle size={14} className="text-red-400" />,
  updated: <Edit2 size={14} className="text-gray-400" />,
};

// Sign modal
function SignModal({
  contractId,
  tenantId,
  onClose,
  onSigned,
}: {
  contractId: string;
  tenantId: string;
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
    const body = { signerName: fd.get('signerName') as string, party: fd.get('party') as string };
    try {
      const res = await fetch(`${API_BASE}/contracts/${contractId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSigned();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign');
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

// Edit slide-over
function EditSlideOver({
  contract,
  tenantId,
  onClose,
  onSaved,
}: {
  contract: ContractDetail;
  tenantId: string;
  onClose: () => void;
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
      const res = await fetch(`${API_BASE}/contracts/${contract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Edit contract</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input name="title" required defaultValue={contract.title}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select name="type" defaultValue={contract.type ?? 'service'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
              {['service', 'employment', 'vendor', 'nda', 'lease', 'custom'].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Party A</label>
              <input name="partyA" defaultValue={contract.partyA ?? 'My Company'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Party B</label>
              <input name="partyB" defaultValue={contract.partyB}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Party B email</label>
            <input name="partyBEmail" type="email" defaultValue={contract.partyBEmail}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
              <input name="value" type="number" step="0.01" defaultValue={contract.value}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <select name="currency" defaultValue={contract.currency ?? 'USD'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                {['USD', 'EUR', 'GBP', 'CAD'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start date</label>
              <input name="startDate" type="date"
                defaultValue={contract.startDate ? contract.startDate.slice(0, 10) : undefined}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End date</label>
              <input name="endDate" type="date"
                defaultValue={contract.endDate ? contract.endDate.slice(0, 10) : undefined}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input name="autoRenew" id="autoRenew2" type="checkbox" defaultChecked={contract.autoRenew}
              className="rounded border-gray-300" />
            <label htmlFor="autoRenew2" className="text-sm text-gray-700">Auto-renew</label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Renewal notice (days)</label>
            <input name="renewalNoticeDays" type="number" defaultValue={contract.renewalNoticeDays ?? 30}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tags</label>
            <input name="tags" defaultValue={contract.tags?.join(', ')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
            <textarea name="content" rows={5} defaultValue={contract.content}
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

export function ContractDetailClient({
  contract,
  events,
  tenantId,
}: {
  contract: ContractDetail;
  events: ContractEvent[];
  tenantId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSign, setShowSign] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  async function sendContract() {
    setActionLoading('send');
    try {
      await fetch(`${API_BASE}/contracts/${contract.id}/send`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId },
      });
      startTransition(() => router.refresh());
    } finally {
      setActionLoading(null);
    }
  }

  async function changeStatus(status: string) {
    setActionLoading(status);
    try {
      await fetch(`${API_BASE}/contracts/${contract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ status }),
      });
      startTransition(() => router.refresh());
    } finally {
      setActionLoading(null);
    }
  }

  const isHtml = contract.content?.trim().startsWith('<');

  const metaFields = [
    { label: 'Type', value: contract.type ? (contract.type.charAt(0).toUpperCase() + contract.type.slice(1)) : '—' },
    { label: 'Party A', value: contract.partyA ?? '—' },
    { label: 'Party B', value: contract.partyB ?? '—' },
    { label: 'Party B email', value: contract.partyBEmail ?? '—' },
    { label: 'Value', value: fmt(contract.value, contract.currency) },
    { label: 'Currency', value: contract.currency ?? '—' },
    { label: 'Start date', value: fmtDate(contract.startDate) },
    { label: 'End date', value: fmtDate(contract.endDate) },
    { label: 'Auto-renew', value: contract.autoRenew ? 'Yes' : 'No' },
    { label: 'Renewal notice', value: contract.renewalNoticeDays ? `${contract.renewalNoticeDays} days` : '—' },
    { label: 'Tags', value: contract.tags?.length ? contract.tags.join(', ') : '—' },
    { label: 'Created', value: fmtDate(contract.createdAt) },
    { label: 'Last updated', value: fmtDate(contract.updatedAt) },
  ];

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="mb-4">
        <a href="/dashboard/contracts" className="text-xs text-gray-400 hover:text-gray-700">
          ← Contracts
        </a>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{contract.title ?? 'Contract'}</h1>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={contract.status} />
            {contract.partyB && <span className="text-sm text-gray-500">{contract.partyB}</span>}
          </div>
        </div>
        {/* Action panel */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
            Edit
          </button>
          {(contract.status === 'draft' || contract.status === 'review') && (
            <button
              onClick={() => void sendContract()}
              disabled={actionLoading !== null}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <Send size={14} />
              {actionLoading === 'send' ? 'Sending…' : 'Send'}
            </button>
          )}
          {(contract.status === 'sent' || contract.status === 'signed') && (
            <button
              onClick={() => setShowSign(true)}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
              <FileSignature size={14} />
              Sign
            </button>
          )}
          {contract.status !== 'terminated' && contract.status !== 'expired' && (
            <select
              onChange={(e) => { if (e.target.value) void changeStatus(e.target.value); e.target.value = ''; }}
              disabled={actionLoading !== null}
              defaultValue=""
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-700 outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50">
              <option value="" disabled>Change status…</option>
              {['draft', 'review', 'sent', 'signed', 'active', 'expired', 'terminated']
                .filter((s) => s !== contract.status)
                .map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: metadata + content */}
        <div className="col-span-2 space-y-6">
          {/* Info card */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
            </div>
            <dl className="grid grid-cols-2 divide-y divide-gray-50">
              {metaFields.map(({ label, value }) => (
                <div key={label} className="px-5 py-3 flex flex-col gap-0.5 odd:border-r border-gray-50">
                  <dt className="text-xs text-gray-400">{label}</dt>
                  <dd className="text-sm text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Content viewer */}
          {contract.content && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contract Content</h2>
              </div>
              <div className="p-5">
                {isHtml ? (
                  <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: contract.content }}
                  />
                ) : (
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{contract.content}</pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: timeline */}
        <div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Activity ({events.length})
              </h2>
            </div>
            {events.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">No events yet.</p>
            ) : (
              <div className="px-4 py-4">
                <ol className="relative border-l border-gray-200 space-y-4 ml-2">
                  {events.map((ev) => (
                    <li key={ev.id} className="ml-4">
                      <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                        <span className="sr-only">{ev.type}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5">
                          {EVENT_ICONS[ev.type ?? ''] ?? <Clock size={14} className="text-gray-400" />}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-gray-800 capitalize">
                            {ev.type ?? 'event'}
                          </p>
                          {ev.actor && <p className="text-xs text-gray-500">{ev.actor}</p>}
                          {ev.notes && <p className="text-xs text-gray-400 italic">{ev.notes}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(ev.createdAt)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSign && (
        <SignModal
          contractId={contract.id}
          tenantId={tenantId}
          onClose={() => setShowSign(false)}
          onSigned={() => startTransition(() => router.refresh())}
        />
      )}
      {showEdit && (
        <EditSlideOver
          contract={contract}
          tenantId={tenantId}
          onClose={() => setShowEdit(false)}
          onSaved={() => startTransition(() => router.refresh())}
        />
      )}
    </div>
  );
}
