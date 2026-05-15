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

export interface TimeEntry {
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

// Weekly bar chart — pure SVG, Mon-Sun, max height 80px
function WeeklyBarChart({ entries }: { entries: TimeEntry[] }) {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Figure out current week (Mon = 0)
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const dayHours = DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return entries
      .filter((e) => e.data?.date?.slice(0, 10) === iso)
      .reduce((s, e) => s + (e.data?.hours ?? 0), 0);
  });

  const maxH = Math.max(...dayHours, 1);
  const chartH = 80;
  const barW = 28;
  const gap = 12;
  const totalW = DAYS.length * (barW + gap) - gap;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">This Week</h2>
      <svg width={totalW} height={chartH + 24} className="overflow-visible">
        {DAYS.map((label, i) => {
          const h = dayHours[i] ?? 0;
          const barH = Math.max(2, Math.round((h / maxH) * chartH));
          const x = i * (barW + gap);
          const y = chartH - barH;
          return (
            <g key={label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                fill={h > 0 ? '#6366f1' : '#e5e7eb'}
              />
              <text
                x={x + barW / 2}
                y={chartH + 14}
                textAnchor="middle"
                fontSize={10}
                fill="#9ca3af"
              >
                {label}
              </text>
              {h > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#6366f1"
                >
                  {h}h
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
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
      const res = await fetch(`${API_BASE}/api/v1/time-tracking`, {
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
              id="billable"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="billable" className="text-sm text-gray-700">Billable</label>
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

export function TimeTrackingPageClient({ entries }: { entries: TimeEntry[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showLog, setShowLog] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Stats for this week
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const thisWeek = entries.filter((e) => {
    const d = e.data?.date;
    if (!d) return false;
    const dt = new Date(d);
    return dt >= monday && dt <= sunday;
  });

  const totalHoursWeek = thisWeek.reduce((s, e) => s + (e.data?.hours ?? 0), 0);
  const billableHours = thisWeek.filter((e) => e.data?.billable).reduce((s, e) => s + (e.data?.hours ?? 0), 0);
  const nonBillableHours = totalHoursWeek - billableHours;
  const pendingApproval = entries.filter((e) => e.data?.status === 'pending').length;

  async function handleApprove(id: string) {
    setApprovingId(id);
    try {
      // Optimistic: try PATCH, ignore error
      await fetch(`${API_BASE}/api/v1/time-tracking/${id}/approve`, {
        method: 'PATCH',
        headers: apiHeaders(),
      });
      startTransition(() => router.refresh());
    } catch {
      // Optimistic UI: still refresh
      startTransition(() => router.refresh());
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Time Tracking</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage time entries</p>
        </div>
        <button
          onClick={() => setShowLog(true)}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + Log Time
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Hours This Week</p>
          <p className="text-2xl font-semibold text-gray-900">{totalHoursWeek.toFixed(1)}h</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Billable Hours</p>
          <p className="text-2xl font-semibold text-green-700">{billableHours.toFixed(1)}h</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Non-Billable</p>
          <p className="text-2xl font-semibold text-gray-600">{nonBillableHours.toFixed(1)}h</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Pending Approval</p>
          <p className="text-2xl font-semibold text-yellow-600">{pendingApproval}</p>
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="mb-8">
        <WeeklyBarChart entries={thisWeek} />
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No time entries yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">All Entries</h2>
          </div>
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
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
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
                    <td className="px-5 py-3 text-right">
                      {d?.status === 'pending' && (
                        <button
                          onClick={() => void handleApprove(entry.id)}
                          disabled={approvingId === entry.id}
                          className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
                        >
                          {approvingId === entry.id ? '…' : 'Approve'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <LogTimeSlideOver
        open={showLog}
        onClose={() => setShowLog(false)}
        onCreated={() => startTransition(() => router.refresh())}
      />
    </div>
  );
}
