'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  X,
  Users,
  MapPin,
  CheckCircle,
  Clock,
  Wrench,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function tenantHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FacilityRequest {
  id: string;
  number?: string;
  title: string;
  type?: string;
  description?: string;
  location?: string;
  room?: string;
  priority?: string;
  status?: string;
  requestedBy?: string;
  assignedTo?: string;
  createdAt?: string;
  completedAt?: string;
}

interface RequestSummary {
  open?: number;
  inProgress?: number;
  completedToday?: number;
  total?: number;
  byStatus?: Record<string, number>;
  byType?: Record<string, number>;
  avgCompletionHours?: number;
}

interface Room {
  id: string;
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REQUEST_TYPE_ICONS: Record<string, string> = {
  cleaning:    '🧹',
  repair:      '🔧',
  electrical:  '⚡',
  plumbing:    '🚿',
  hvac:        '❄️',
  security:    '🔒',
  other:       '📋',
};

const PRIORITY_BADGE: Record<string, string> = {
  low:      'bg-gray-100 text-gray-600',
  medium:   'bg-blue-100 text-blue-700',
  high:     'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_BADGE: Record<string, string> = {
  open:        'bg-blue-100 text-blue-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-gray-100 text-gray-500',
};

// ─── New Request Slide-over ───────────────────────────────────────────────────

interface NewRequestFormProps {
  onClose: () => void;
  onSaved: (r: FacilityRequest) => void;
}

function NewRequestForm({ onClose, onSaved }: NewRequestFormProps) {
  const [form, setForm] = useState({
    title: '', description: '', location: '', roomId: '',
    type: 'other', priority: 'medium', requestedBy: '',
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch(`${API_BASE}/rooms`, { headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' } })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.rooms ?? []);
        setRooms(list as Room[]);
      })
      .catch(() => {});
  }, []);

  function set(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        title: form.title,
        description: form.description || undefined,
        location: form.location || undefined,
        room: form.roomId || undefined,
        type: form.type,
        priority: form.priority,
        requestedBy: form.requestedBy || undefined,
      };
      const res = await fetch(`${API_BASE}/facility-requests`, {
        method: 'POST', headers: tenantHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? 'Failed to create request');
        return;
      }
      const saved = await res.json() as FacilityRequest;
      onSaved(saved);
    } catch {
      setError('Failed to create request');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[480px] bg-white h-full overflow-y-auto flex flex-col shadow-2xl">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">New Facility Request</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Title *</label>
            <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="e.g. Fix broken AC in Room B" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              rows={3} placeholder="Describe the issue…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Location</label>
              <input type="text" value={form.location} onChange={(e) => set('location', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Building, floor, etc." />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Room</label>
              <select value={form.roomId} onChange={(e) => set('roomId', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="">Select room…</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="cleaning">Cleaning</option>
                <option value="repair">Repair</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="hvac">HVAC</option>
                <option value="security">Security</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => set('priority', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Requested by</label>
            <input type="text" value={form.requestedBy} onChange={(e) => set('requestedBy', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Employee name" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50">
              {saving ? 'Creating…' : 'Create request'}
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

// ─── Requests Tab ─────────────────────────────────────────────────────────────

interface RequestsTabProps {
  requests: FacilityRequest[];
  onNewRequest: () => void;
  onUpdate: (id: string, patch: Partial<FacilityRequest>) => void;
}

function RequestsTab({ requests, onNewRequest, onUpdate }: RequestsTabProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const open = requests.filter((r) => r.status === 'open').length;
  const inProgress = requests.filter((r) => r.status === 'in-progress').length;
  const today = new Date().toISOString().slice(0, 10);
  const completedToday = requests.filter((r) =>
    r.status === 'completed' && r.completedAt?.slice(0, 10) === today
  ).length;

  const filtered = requests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
    return true;
  });

  async function markComplete(id: string) {
    try {
      const res = await fetch(`${API_BASE}/facility-requests/${id}/complete`, {
        method: 'POST', headers: tenantHeaders(),
      });
      if (res.ok) {
        onUpdate(id, { status: 'completed', completedAt: new Date().toISOString() });
      }
    } catch {
      // noop
    }
  }

  async function assignRequest(id: string) {
    const assignee = prompt('Assign to (name):');
    if (!assignee) return;
    try {
      const res = await fetch(`${API_BASE}/facility-requests/${id}`, {
        method: 'PATCH', headers: tenantHeaders(),
        body: JSON.stringify({ assignedTo: assignee, status: 'in-progress' }),
      });
      if (res.ok) {
        onUpdate(id, { assignedTo: assignee, status: 'in-progress' });
      }
    } catch {
      // noop
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Open', value: open, color: 'text-blue-600' },
          { label: 'In Progress', value: inProgress, color: 'text-amber-600' },
          { label: 'Completed Today', value: completedToday, color: 'text-green-600' },
          { label: 'Total', value: requests.length, color: 'text-gray-900' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="all">All types</option>
            <option value="cleaning">Cleaning</option>
            <option value="repair">Repair</option>
            <option value="electrical">Electrical</option>
            <option value="plumbing">Plumbing</option>
            <option value="hvac">HVAC</option>
            <option value="security">Security</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Priority</label>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="ml-auto flex items-end">
          <button
            onClick={onNewRequest}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} /> New request
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-white border border-gray-200 rounded-xl text-center">
          <Wrench size={40} className="text-gray-300 mb-4" />
          <p className="text-sm font-medium text-gray-500">No requests found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or create a new request.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Requester</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Assigned to</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <tr key={req.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-mono">
                        {req.number ?? req.id.slice(0, 6)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px]">
                      <p className="truncate">{req.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-base" title={req.type}>{REQUEST_TYPE_ICONS[req.type ?? 'other']}</span>
                      <span className="ml-1 text-xs text-gray-500 capitalize">{req.type ?? 'other'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {req.location && <span className="flex items-center gap-1"><MapPin size={11} /> {req.location}</span>}
                      {req.room && <span className="text-gray-400">{req.room}</span>}
                      {!req.location && !req.room && '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_BADGE[req.priority ?? 'medium'] ?? PRIORITY_BADGE.medium}`}>
                        {req.priority ?? 'medium'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[req.status ?? 'open'] ?? STATUS_BADGE.open}`}>
                        {req.status ?? 'open'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{req.requestedBy ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{req.assignedTo ?? <span className="text-gray-300">Unassigned</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => void assignRequest(req.id)}
                          className="px-2 py-1 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => void markComplete(req.id)}
                          disabled={req.status === 'completed'}
                          className="px-2 py-1 rounded-lg text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-40"
                        >
                          Complete
                        </button>
                        <button className="px-2 py-1 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Summary Tab ──────────────────────────────────────────────────────────────

function SummaryTab({ summary }: { summary: RequestSummary }) {
  const byStatus = summary.byStatus ?? {};
  const byType = summary.byType ?? {};
  const maxTypeCount = Math.max(...Object.values(byType), 1);

  const STATUS_PILL: Record<string, string> = {
    open:         'bg-blue-100 text-blue-700',
    'in-progress': 'bg-amber-100 text-amber-700',
    completed:    'bg-green-100 text-green-700',
    cancelled:    'bg-gray-100 text-gray-600',
  };

  const TYPE_COLORS = ['bg-indigo-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500'];

  return (
    <div className="space-y-6">
      {/* Avg completion */}
      {summary.avgCompletionHours != null && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-xs text-gray-500 mb-1">Average completion time</p>
          <p className="text-3xl font-semibold text-gray-900">{summary.avgCompletionHours.toFixed(1)} hrs</p>
        </div>
      )}

      {/* By status */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Requests by status</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${STATUS_PILL[status] ?? 'bg-gray-50 text-gray-600'}`}>
              <span className="text-sm font-medium capitalize">{status.replace('-', ' ')}</span>
              <span className="text-sm font-semibold">{count}</span>
            </div>
          ))}
          {Object.keys(byStatus).length === 0 && <p className="text-sm text-gray-400">No data yet.</p>}
        </div>
      </div>

      {/* By type */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Requests by type</h2>
        {Object.keys(byType).length === 0 ? (
          <p className="text-sm text-gray-400">No data yet.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count], i) => {
              const pct = Math.round((count / maxTypeCount) * 100);
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-sm w-6 text-center">{REQUEST_TYPE_ICONS[type] ?? '📋'}</span>
                  <div className="w-24 text-xs text-gray-600 capitalize truncate">{type}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-full rounded-full ${TYPE_COLORS[i % TYPE_COLORS.length]}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-8 text-right text-xs text-gray-500">{count}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FacilitiesClient ─────────────────────────────────────────────────────────

export function FacilitiesClient() {
  const [tab, setTab] = useState<'requests' | 'summary'>('requests');
  const [requests, setRequests] = useState<FacilityRequest[]>([]);
  const [summary, setSummary] = useState<RequestSummary>({});
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/facility-requests`, { headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' } }),
        fetch(`${API_BASE}/facility-requests/summary`, { headers: { 'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant' } }),
      ]);
      if (reqRes.ok) {
        const d = await reqRes.json() as FacilityRequest[] | { requests?: FacilityRequest[] };
        setRequests(Array.isArray(d) ? d : (d.requests ?? []));
      }
      if (sumRes.ok) {
        setSummary(await sumRes.json() as RequestSummary);
      }
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  function handleUpdate(id: string, patch: Partial<FacilityRequest>) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  }

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Facilities Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage facility maintenance requests.</p>
        </div>
        <button
          onClick={() => setShowNewRequest(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} /> New request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([['requests', 'Requests'], ['summary', 'Summary']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'requests' && (
            <RequestsTab
              requests={requests}
              onNewRequest={() => setShowNewRequest(true)}
              onUpdate={handleUpdate}
            />
          )}
          {tab === 'summary' && <SummaryTab summary={summary} />}
        </>
      )}

      {showNewRequest && (
        <NewRequestForm
          onClose={() => setShowNewRequest(false)}
          onSaved={(r) => {
            setRequests((prev) => [r, ...prev]);
            setShowNewRequest(false);
          }}
        />
      )}
    </div>
  );
}
