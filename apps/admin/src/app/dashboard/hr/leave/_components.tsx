'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Check, XCircle } from 'lucide-react';
import { BulkActionBar } from '@/components/bulk-action-bar.js';
import { useTranslations } from 'next-intl';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
const IDENTITY_ID = process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin';

function fmtHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': IDENTITY_ID,
  };
}

export interface LeaveRecord {
  id: string;
  data: {
    employeeId?: string;
    employeeName?: string;
    employee_name?: string;
    type?: string;
    leave_type?: string;
    startDate?: string;
    start_date?: string;
    endDate?: string;
    end_date?: string;
    days?: number;
    status?: string;
    reason?: string;
  };
  createdAt: string;
}

function getField(d: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = d[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
}

function StatusBadge({ status }: { status?: string }) {
  const t = useTranslations('hr');
  if (status === 'approved')
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">
        {t('leaveStatus.approved')}
      </span>
    );
  if (status === 'rejected')
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-700">
        {t('leaveStatus.rejected')}
      </span>
    );
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-50 text-yellow-700">
      {t('leaveStatus.pending')}
    </span>
  );
}

function LeaveTypeBadge({ type }: { type?: string }) {
  const colors: Record<string, string> = {
    annual: 'bg-blue-50 text-blue-700',
    sick: 'bg-orange-50 text-orange-700',
    personal: 'bg-purple-50 text-purple-700',
    maternity: 'bg-pink-50 text-pink-700',
    paternity: 'bg-teal-50 text-teal-700',
  };
  const t = type ?? 'annual';
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[t] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {t}
    </span>
  );
}

function RequestLeaveSlideOver({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const startDate = fd.get('startDate') as string;
    const endDate = fd.get('endDate') as string;
    let days = 1;
    if (startDate && endDate) {
      const diff =
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
      days = Math.max(1, Math.round(diff) + 1);
    }
    const body = {
      employeeName: fd.get('employeeName') as string,
      type: fd.get('type') as string,
      startDate,
      endDate,
      days,
      reason: (fd.get('reason') as string) || undefined,
      status: 'pending',
    };
    try {
      const res = await fetch(`/api/veska/hr/leave`, {
        method: 'POST',
        headers: fmtHeaders(),
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
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Request Leave</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Employee Name *</label>
            <input
              name="employeeName"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Leave Type *</label>
            <select
              name="type"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="annual">Annual</option>
              <option value="sick">Sick</option>
              <option value="personal">Personal</option>
              <option value="maternity">Maternity</option>
              <option value="paternity">Paternity</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                name="startDate"
                type="date"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date *</label>
              <input
                name="endDate"
                type="date"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              name="reason"
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
              {saving ? 'Submitting…' : 'Submit Request'}
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

function LeaveActionButtons({
  leaveId,
  status,
  onRefresh,
}: {
  leaveId: string;
  status: string;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function doAction(action: 'approve' | 'reject') {
    setLoading(action);
    try {
      await fetch(`/api/veska/hr/leave/${leaveId}/${action}`, {
        method: 'PATCH',
        headers: fmtHeaders(),
        body: JSON.stringify({}),
      });
      onRefresh();
    } finally {
      setLoading(null);
    }
  }

  if (status !== 'pending') return null;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => void doAction('approve')}
        disabled={loading !== null}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 transition-colors"
      >
        <Check size={11} /> Approve
      </button>
      <button
        onClick={() => void doAction('reject')}
        disabled={loading !== null}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        <XCircle size={11} /> Reject
      </button>
    </div>
  );
}

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

export function LeaveClient({ records: initial }: { records: LeaveRecord[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const t = useTranslations('hr');

  const pending = initial.filter((r) => (r.data.status ?? 'pending') === 'pending');
  const approved = initial.filter((r) => r.data.status === 'approved');
  const totalDays = approved.reduce((sum, r) => sum + (r.data.days ?? 0), 0);

  const thisMonth = approved.filter((r) => {
    const d = r.createdAt;
    if (!d) return false;
    const dt = new Date(d);
    const now = new Date();
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
  }).length;

  const filtered = initial.filter((r) => {
    if (filter === 'all') return true;
    return (r.data.status ?? 'pending') === filter;
  });

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch(`/api/veska/hr/leave/bulk`, {
        method: 'POST',
        headers: fmtHeaders(),
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = (await res.json()) as {
        processed: number;
        failed: { id: string; error: string }[];
      };
      const failCount = result.failed.length;
      setToast({
        message:
          failCount > 0
            ? `${result.processed} processed, ${failCount} failed`
            : `${result.processed} request${result.processed !== 1 ? 's' : ''} ${action}d`,
        type: failCount > 0 ? 'error' : 'success',
      });
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Bulk action failed',
        type: 'error',
      });
    } finally {
      setBulkLoading(false);
    }
  };

  // Auto-clear toast
  if (toast) {
    setTimeout(() => setToast(null), 3500);
  }

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="px-8 py-8 max-w-6xl">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: t('leaveStatus.pending'), value: pending.length },
          { label: t('leaveStatus.approved'), value: thisMonth },
          { label: 'Total Days Taken', value: totalDays },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">{t('leaveRequests')}</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} /> {t('newLeaveRequest')}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === t.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No leave requests found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Start Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">End Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Days</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => {
                const d = record.data as Record<string, unknown>;
                const empName = getField(d, 'employeeName', 'employee_name', 'employeeId') || '—';
                const type = getField(d, 'type', 'leave_type') || 'annual';
                const startDate = getField(d, 'startDate', 'start_date');
                const endDate = getField(d, 'endDate', 'end_date');
                const days = record.data.days ?? '—';
                const status = getField(d, 'status') || 'pending';
                const isChecked = selected.has(record.id);
                return (
                  <tr
                    key={record.id}
                    className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 ${isChecked ? 'bg-blue-50/30' : ''}`}
                  >
                    <td
                      className="px-4 py-3 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOne(record.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(record.id)}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{empName}</td>
                    <td className="px-4 py-3">
                      <LeaveTypeBadge type={type} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {startDate ? startDate.slice(0, 10) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {endDate ? endDate.slice(0, 10) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{days}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <LeaveActionButtons
                        leaveId={record.id}
                        status={status}
                        onRefresh={() => startTransition(() => router.refresh())}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <RequestLeaveSlideOver
          onClose={() => setShowAdd(false)}
          onSaved={() => startTransition(() => router.refresh())}
        />
      )}

      <BulkActionBar
        selectedCount={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          {
            label: bulkLoading ? 'Processing…' : t('approveAll'),
            onClick: () => void handleBulkAction('approve'),
          },
          {
            label: t('rejectAll'),
            onClick: () => void handleBulkAction('reject'),
            variant: 'danger',
          },
        ]}
      />
    </div>
  );
}
