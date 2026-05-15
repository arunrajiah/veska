'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  LifeBuoy,
  AlertCircle,
  Clock,
  CheckCircle2,
  MessageSquare,
  Plus,
  X,
  Search,
  Filter,
  User,
} from 'lucide-react';
import type { Ticket, ServiceDeskSummary } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-500',
};

const PRIORITY_DOTS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-400',
  low: 'bg-gray-400',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-indigo-50 text-indigo-700',
  waiting: 'bg-purple-50 text-purple-700',
  resolved: 'bg-green-50 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  it: <AlertCircle size={14} className="text-blue-500" />,
  hr: <User size={14} className="text-violet-500" />,
  facilities: <LifeBuoy size={14} className="text-teal-500" />,
  finance: <CheckCircle2 size={14} className="text-green-500" />,
  other: <MessageSquare size={14} className="text-gray-400" />,
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'open';
  const label = s.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: string }) {
  const p = priority ?? 'medium';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[p] ?? 'bg-gray-100 text-gray-600'}`}>
      {p}
    </span>
  );
}

function SlaIndicator({ ticket }: { ticket: Ticket }) {
  if (ticket.slaBreached) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertCircle size={10} />
        SLA Breached
      </span>
    );
  }
  if (ticket.slaDueAt) {
    const ms = new Date(ticket.slaDueAt).getTime() - Date.now();
    const hours = Math.ceil(ms / (1000 * 60 * 60));
    if (hours <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <AlertCircle size={10} />
          Overdue
        </span>
      );
    }
    if (hours <= 4) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <Clock size={10} />
          {hours}h left
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
        <CheckCircle2 size={10} />
        {hours}h left
      </span>
    );
  }
  return <span className="text-xs text-gray-400">—</span>;
}

// --- New Ticket Slide-Over ---
function NewTicketSlideOver({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
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
    const body = {
      title: fd.get('title') as string,
      description: (fd.get('description') as string) || undefined,
      category: fd.get('category') as string,
      priority: fd.get('priority') as string,
      requestedBy: (fd.get('requestedBy') as string) || undefined,
      assignedTo: (fd.get('assignedTo') as string) || undefined,
      slaHours: fd.get('slaHours') ? Number(fd.get('slaHours')) : undefined,
    };
    try {
      const res = await fetch(`${API_BASE}/service-desk/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
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
          <h2 className="text-base font-semibold text-gray-900">New ticket</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input name="title" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
              <select name="category" required defaultValue="it"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="it">IT</option>
                <option value="hr">HR</option>
                <option value="facilities">Facilities</option>
                <option value="finance">Finance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority *</label>
              <select name="priority" required defaultValue="medium"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Requested by</label>
              <input name="requestedBy"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assigned to</label>
              <input name="assignedTo"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">SLA hours</label>
            <input name="slaHours" type="number" min="1" defaultValue={24}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create ticket'}
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

// --- Ticket Detail Modal (Board view) ---
function TicketModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {ticket.number && (
                <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">#{ticket.number}</span>
              )}
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
            <h3 className="text-base font-semibold text-gray-900">{ticket.title ?? '—'}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4"><X size={18} /></button>
        </div>
        {ticket.description && (
          <p className="text-sm text-gray-600 mb-4">{ticket.description}</p>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Category</p>
            <p className="text-gray-700 capitalize">{ticket.category ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Requested by</p>
            <p className="text-gray-700">{ticket.requestedBy ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Assigned to</p>
            <p className="text-gray-700">{ticket.assignedTo ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">SLA</p>
            <SlaIndicator ticket={ticket} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Created</p>
            <p className="text-gray-700">{fmtDate(ticket.createdAt)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 text-right">
          <a href={`/dashboard/service-desk/${ticket.id}`}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            Open full detail →
          </a>
        </div>
      </div>
    </div>
  );
}

// --- List View ---
function ListView({
  tickets,
  onRefresh,
}: {
  tickets: Ticket[];
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const filtered = tickets.filter((t) => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (
        !t.title?.toLowerCase().includes(q) &&
        !t.number?.toLowerCase().includes(q) &&
        !t.requestedBy?.toLowerCase().includes(q)
      ) return false;
    }
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    return true;
  });

  async function closeTicket(id: string) {
    if (!confirm('Close this ticket?')) return;
    setActionLoading(`${id}-close`);
    try {
      await fetch(`${API_BASE}/service-desk/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ status: 'closed' }),
      });
      startTransition(() => { router.refresh(); onRefresh(); });
    } finally {
      setActionLoading(null);
    }
  }

  async function assignTicket(id: string, assignee: string) {
    setActionLoading(`${id}-assign`);
    try {
      await fetch(`${API_BASE}/service-desk/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
        body: JSON.stringify({ assignedTo: assignee, status: 'in_progress' }),
      });
      startTransition(() => { router.refresh(); onRefresh(); });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets…"
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">All statuses</option>
          {['open', 'in_progress', 'waiting', 'resolved', 'closed'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">All priorities</option>
          {['critical', 'high', 'medium', 'low'].map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">All categories</option>
          {['it', 'hr', 'facilities', 'finance', 'other'].map((c) => (
            <option key={c} value={c}>{c.toUpperCase()}</option>
          ))}
        </select>
        <button onClick={() => setShowNew(true)}
          className="ml-auto flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
          <Plus size={15} />
          New ticket
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <LifeBuoy size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No tickets found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Number</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Requested by</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Assigned to</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">SLA</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      #{t.number ?? t.id.slice(0, 6).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/dashboard/service-desk/${t.id}`}
                      className="font-medium text-gray-900 hover:underline">
                      {t.title ?? '—'}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {CATEGORY_ICONS[t.category ?? 'other'] ?? CATEGORY_ICONS.other}
                      <span className="text-xs text-gray-600 uppercase">{t.category ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-600">{t.requestedBy ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{t.assignedTo ?? '—'}</td>
                  <td className="px-4 py-3"><SlaIndicator ticket={t} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(t.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/dashboard/service-desk/${t.id}`}
                        className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">
                        View
                      </a>
                      {t.status !== 'closed' && t.status !== 'resolved' && (
                        <button
                          onClick={() => void closeTicket(t.id)}
                          disabled={actionLoading !== null}
                          className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50">
                          Close
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

      {showNew && (
        <NewTicketSlideOver
          open={showNew}
          onClose={() => setShowNew(false)}
          onSaved={() => { startTransition(() => { router.refresh(); onRefresh(); }); }}
        />
      )}
    </>
  );
}

// --- Board View (Kanban) ---
const BOARD_COLUMNS = [
  { key: 'open', label: 'Open', color: 'bg-blue-50 border-blue-200' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-indigo-50 border-indigo-200' },
  { key: 'waiting', label: 'Waiting', color: 'bg-purple-50 border-purple-200' },
  { key: 'resolved', label: 'Resolved', color: 'bg-green-50 border-green-200' },
] as const;

function BoardView({ tickets }: { tickets: Ticket[] }) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {BOARD_COLUMNS.map((col) => {
          const colTickets = tickets.filter((t) => (t.status ?? 'open') === col.key);
          return (
            <div key={col.key} className={`rounded-xl border ${col.color} p-3 min-h-80`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{col.label}</h3>
                <span className="text-xs font-bold text-gray-500 bg-white/70 px-2 py-0.5 rounded-full">{colTickets.length}</span>
              </div>
              <div className="space-y-2">
                {colTickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="w-full text-left bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOTS[t.priority ?? 'medium'] ?? 'bg-gray-400'}`} />
                      <span className="font-mono text-xs text-gray-400">#{t.number ?? t.id.slice(0, 6).toUpperCase()}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-900 leading-snug line-clamp-2 mb-2">{t.title ?? '—'}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 uppercase">{t.category ?? '—'}</span>
                      {t.slaBreached && (
                        <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          <AlertCircle size={9} />
                          SLA
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTicket && (
        <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </>
  );
}

// --- Main Client Component ---
export function ServiceDeskClient({
  tickets: initialTickets,
  summary,
}: {
  tickets: Ticket[];
  summary: ServiceDeskSummary;
}) {
  const [view, setView] = useState<'list' | 'board'>('list');
  const [tickets, setTickets] = useState(initialTickets);

  const open = summary.open ?? tickets.filter((t) => t.status === 'open').length;
  const inProgress = summary.inProgress ?? tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedToday = summary.resolvedToday ?? 0;
  const slaBreached = summary.slaBreached ?? tickets.filter((t) => t.slaBreached).length;

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <LifeBuoy size={22} className="text-gray-600" />
            Service Desk
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            List
          </button>
          <button
            onClick={() => setView('board')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'board' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Board
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-600">Open</span>
          <span className="text-sm font-bold text-gray-900">{open}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-sm text-gray-600">In Progress</span>
          <span className="text-sm font-bold text-gray-900">{inProgress}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl">
          <CheckCircle2 size={14} className="text-green-500" />
          <span className="text-sm text-gray-600">Resolved today</span>
          <span className="text-sm font-bold text-gray-900">{resolvedToday}</span>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${slaBreached > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <AlertCircle size={14} className={slaBreached > 0 ? 'text-red-500' : 'text-gray-400'} />
          <span className={`text-sm ${slaBreached > 0 ? 'text-red-700' : 'text-gray-600'}`}>SLA Breached</span>
          <span className={`text-sm font-bold ${slaBreached > 0 ? 'text-red-700' : 'text-gray-900'}`}>{slaBreached}</span>
        </div>
      </div>

      {view === 'list' && (
        <ListView tickets={tickets} onRefresh={() => setTickets(initialTickets)} />
      )}
      {view === 'board' && (
        <BoardView tickets={tickets} />
      )}
    </div>
  );
}
