'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

interface TimeEntry {
  id: string;
  data: {
    employeeId?: string;
    employeeName?: string;
    projectId?: string;
    projectName?: string;
    taskId?: string;
    date?: string;
    hours?: number;
    description?: string;
    billable?: boolean;
    status?: 'pending' | 'approved';
  };
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function LogTimeSlideOver({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [billable, setBillable] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      projectName: fd.get('projectName') || undefined,
      date: fd.get('date'),
      hours: Number(fd.get('hours')),
      description: fd.get('description') || undefined,
      billable,
    };
    try {
      const res = await fetch(`/api/veska/time-tracking`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log time');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Log Time</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Project</label>
            <input name="projectName" placeholder="Project name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
            <input name="date" type="date" required defaultValue={todayStr}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hours *</label>
            <input name="hours" type="number" required min="0.25" max="24" step="0.25" placeholder="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={3} placeholder="What did you work on?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="billable-e"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="billable-e" className="text-sm text-gray-700">Billable</label>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Log Time'}
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

const PAGE_SIZE = 20;

export function TimeEntriesClient({ entries }: { entries: TimeEntry[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showLog, setShowLog] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const d = e.data;
      if (projectFilter && !d?.projectName?.toLowerCase().includes(projectFilter.toLowerCase())) return false;
      if (dateStart && (d?.date ?? '') < dateStart) return false;
      if (dateEnd && (d?.date ?? '') > dateEnd) return false;
      return true;
    });
  }, [entries, projectFilter, dateStart, dateEnd]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function exportCSV() {
    const rows = [
      ['Date', 'Employee', 'Project', 'Description', 'Hours', 'Billable', 'Status'],
      ...filtered.map((e) => {
        const d = e.data;
        return [
          d?.date?.slice(0, 10) ?? '',
          d?.employeeName ?? '',
          d?.projectName ?? '',
          d?.description ?? '',
          String(d?.hours ?? ''),
          d?.billable ? 'Yes' : 'No',
          d?.status ?? '',
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'time-entries.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Time Entries</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowLog(true)}
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            + Log Time
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Filter by project…"
          value={projectFilter}
          onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 w-52"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">From</label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => { setDateStart(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">To</label>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => { setDateEnd(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        {(projectFilter || dateStart || dateEnd) && (
          <button
            onClick={() => { setProjectFilter(''); setDateStart(''); setDateEnd(''); setPage(1); }}
            className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-2 py-1.5 rounded-lg"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {paginated.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No time entries found.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Employee</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Project</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Hours</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Description</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Billable</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((entry) => {
                  const d = entry.data;
                  return (
                    <tr key={entry.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(d?.date)}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{d?.employeeName ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{d?.projectName ?? '—'}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{d?.hours != null ? `${d.hours}h` : '—'}</td>
                      <td className="px-5 py-3 text-gray-500 max-w-48 truncate">{d?.description ?? '—'}</td>
                      <td className="px-5 py-3">
                        {d?.billable ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">Billable</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Non-billable</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {d?.status === 'approved' ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">Approved</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-50 text-yellow-700">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <LogTimeSlideOver
        open={showLog}
        onClose={() => setShowLog(false)}
        onCreated={() => startTransition(() => router.refresh())}
      />
    </div>
  );
}
