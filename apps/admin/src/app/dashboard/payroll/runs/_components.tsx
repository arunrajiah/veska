'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

export interface PayrollRun {
  id: string;
  data: {
    runNumber?: number;
    period?: string;
    status?: 'draft' | 'processing' | 'completed' | 'failed';
    totalGross?: number;
    totalNet?: number;
    totalTax?: number;
    employeeCount?: number;
    processedAt?: string;
    notes?: string;
  };
}

function usd(v?: number) {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    processing: 'bg-blue-50 text-blue-700',
    completed: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-600',
  };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status ?? 'draft'] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

function NewRunSlideOver({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      period: fd.get('period') as string,
      notes: (fd.get('notes') as string) || undefined,
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/payroll/runs`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payroll run');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Payroll Run</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Period *</label>
            <input
              name="period"
              required
              placeholder="e.g. May 2026"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
            <p className="text-xs text-gray-400 mt-1">e.g. "May 2026" or "2026-05"</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Optional notes…"
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
              {saving ? 'Creating…' : 'Create Run'}
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

export function PayrollRunsClient({ initialRuns }: { initialRuns: PayrollRun[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showNew, setShowNew] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const runs = initialRuns;

  const totalRuns = runs.length;
  const completed = runs.filter((r) => r.data?.status === 'completed').length;
  const processing = runs.filter((r) => r.data?.status === 'processing').length;
  const totalPaid = runs
    .filter((r) => r.data?.status === 'completed')
    .reduce((s, r) => s + (r.data?.totalNet ?? 0), 0);

  async function processRun(id: string) {
    setActionLoading(id);
    try {
      await fetch(`${API_BASE}/api/v1/payroll/runs/${id}/process`, {
        method: 'PATCH',
        headers: apiHeaders(),
      });
      startTransition(() => router.refresh());
    } finally {
      setActionLoading(null);
    }
  }

  function handleCreated() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payroll Runs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalRuns} run{totalRuns !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + New Payroll Run
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Total Runs</p>
          <p className="text-2xl font-semibold text-gray-900">{totalRuns}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Completed</p>
          <p className="text-2xl font-semibold text-green-700">{completed}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Processing</p>
          <p className="text-2xl font-semibold text-blue-700">{processing}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Total Paid</p>
          <p className="text-2xl font-semibold text-gray-900">{usd(totalPaid)}</p>
        </div>
      </div>

      {/* Table */}
      {runs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No payroll runs yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Run #</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Period</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Employees</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Gross</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Net</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Tax</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Processed</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/payroll/runs/${run.id}`)}
                >
                  <td className="px-5 py-3 font-medium text-gray-900">
                    #{run.data?.runNumber ?? run.id.slice(0, 6)}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{run.data?.period ?? '—'}</td>
                  <td className="px-5 py-3"><StatusBadge {...(run.data?.status ? { status: run.data.status } : {})} /></td>
                  <td className="px-5 py-3 text-gray-600">{run.data?.employeeCount ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{usd(run.data?.totalGross)}</td>
                  <td className="px-5 py-3 text-gray-600">{usd(run.data?.totalNet)}</td>
                  <td className="px-5 py-3 text-gray-600">{usd(run.data?.totalTax)}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{fmtDate(run.data?.processedAt)}</td>
                  <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {run.data?.status === 'draft' && (
                        <button
                          onClick={() => void processRun(run.id)}
                          disabled={actionLoading === run.id}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === run.id ? 'Processing…' : 'Process'}
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

      <NewRunSlideOver open={showNew} onClose={() => setShowNew(false)} onCreated={handleCreated} />
    </div>
  );
}
