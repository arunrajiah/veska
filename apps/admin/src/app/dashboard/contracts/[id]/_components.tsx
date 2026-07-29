'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export interface ContractDetail {
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

function daysUntil(d?: string): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

function EditContractSlideOver({
  contract,
  onClose,
  onSaved,
}: {
  contract: ContractDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const d = contract.data;

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
    };
    try {
      const res = await fetch(`/api/veska/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: reqHeaders(),
        body: JSON.stringify({ data: body }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contract');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Edit Contract</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input
              name="title"
              required
              defaultValue={d.title}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Party Name</label>
              <input
                name="partyName"
                defaultValue={d.partyName}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Party Email</label>
              <input
                name="partyEmail"
                type="email"
                defaultValue={d.partyEmail}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                name="type"
                defaultValue={d.type ?? 'service'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              >
                {['vendor', 'customer', 'employee', 'nda', 'service'].map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
              <input
                name="value"
                type="number"
                step="0.01"
                min="0"
                defaultValue={d.value}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                name="startDate"
                type="date"
                defaultValue={d.startDate?.slice(0, 10)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                name="endDate"
                type="date"
                defaultValue={d.endDate?.slice(0, 10)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              name="autoRenew"
              id="autoRenewEdit"
              type="checkbox"
              defaultChecked={d.autoRenew}
              className="rounded border-gray-300"
            />
            <label htmlFor="autoRenewEdit" className="text-sm text-gray-700">
              Auto-renew
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={d.notes}
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
              {saving ? 'Saving…' : 'Update'}
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

export function ContractDetailPageClient({ contract }: { contract: ContractDetail }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const d = contract.data;
  const status = d.status ?? 'draft';
  const days = daysUntil(d.endDate);

  async function patchStatus(newStatus: string) {
    if (newStatus === 'terminated' && !confirm('Terminate this contract?')) return;
    setActionLoading(newStatus);
    try {
      await fetch(`/api/veska/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: reqHeaders(),
        body: JSON.stringify({ data: { status: newStatus } }),
      });
      startTransition(() => router.refresh());
    } finally {
      setActionLoading(null);
    }
  }

  // Expiry countdown color
  const expiryColor =
    days == null
      ? 'text-gray-500'
      : days < 0
        ? 'text-red-600'
        : days < 30
          ? 'text-red-500'
          : days < 90
            ? 'text-orange-500'
            : 'text-green-600';

  return (
    <div className="px-8 py-8 max-w-7xl">
      <Link
        href="/dashboard/contracts"
        className="text-sm text-gray-500 hover:text-gray-900 mb-6 inline-block"
      >
        ← Contracts
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              {d.title ?? 'Untitled Contract'}
            </h1>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {status}
            </span>
            {d.type && (
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${TYPE_COLORS[d.type] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {d.type}
              </span>
            )}
          </div>
          {d.partyName && <p className="text-sm text-gray-500 mt-1">{d.partyName}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
          {status !== 'terminated' && status !== 'expired' && (
            <button
              onClick={() => void patchStatus('terminated')}
              disabled={actionLoading !== null}
              className="border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'terminated' ? 'Terminating…' : 'Terminate'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Contract Details</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                { label: 'Party Name', value: d.partyName ?? '—' },
                { label: 'Party Email', value: d.partyEmail ?? '—' },
                {
                  label: 'Type',
                  value: d.type ? d.type.charAt(0).toUpperCase() + d.type.slice(1) : '—',
                },
                { label: 'Value', value: fmtMoney(d.value) },
                { label: 'Start Date', value: fmtDate(d.startDate) },
                { label: 'End Date', value: fmtDate(d.endDate) },
                { label: 'Auto-Renew', value: d.autoRenew ? 'Yes' : 'No' },
                { label: 'Signed Date', value: fmtDate(d.signedDate) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                    {label}
                  </p>
                  <p className="text-gray-800">{value}</p>
                </div>
              ))}
              {d.notes && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                    Notes
                  </p>
                  <p className="text-gray-600">{d.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Expiry countdown + AI Insights */}
        <div className="space-y-4">
          {/* Expiry countdown */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Expiry Countdown
            </p>
            {d.endDate ? (
              <div className="text-center">
                <p className={`text-4xl font-bold ${expiryColor}`}>
                  {days == null ? '—' : days < 0 ? 'Expired' : `${days}`}
                </p>
                {days != null && days >= 0 && (
                  <p className="text-xs text-gray-400 mt-1">days remaining</p>
                )}
                <p className="text-xs text-gray-400 mt-2">Expires {fmtDate(d.endDate)}</p>
                {d.autoRenew && (
                  <p className="text-xs text-green-600 mt-2 font-medium">Auto-renews</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-2">No end date set</p>
            )}
          </div>

          {/* AI Insights placeholder */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              AI Insights
            </p>
            <p className="text-xs text-gray-400 text-center py-4">
              AI analysis not configured for this contract.
            </p>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditContractSlideOver
          contract={contract}
          onClose={() => setShowEdit(false)}
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

// Legacy export for backward compat
export function ContractDetailClient({
  contract,
  events,
  tenantId,
}: {
  contract: unknown;
  events: unknown[];
  tenantId: string;
}) {
  return null;
}
