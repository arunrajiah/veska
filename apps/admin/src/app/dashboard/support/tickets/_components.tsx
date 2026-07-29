'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents.js';
import type { Ticket } from './page.js';
import { useTranslations } from 'next-intl';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function isOverdue(ticket: Ticket): boolean {
  const createdAt = ticket.data.createdAt;
  const status = ticket.data.status ?? 'open';
  if (status === 'resolved' || status === 'closed') return false;
  if (!createdAt) return false;
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return ageHours > 48;
}

// ─── New Ticket Slide-Over ────────────────────────────────────────────────────
function NewTicketSlideOver({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      subject: fd.get('subject') as string,
      description: (fd.get('description') as string) || undefined,
      contactName: (fd.get('contactName') as string) || undefined,
      contactEmail: (fd.get('contactEmail') as string) || undefined,
      priority: fd.get('priority') as string,
      category: (fd.get('category') as string) || undefined,
      status: 'open',
    };
    try {
      const res = await fetch(`/api/veska/support/tickets`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onClose();
      startTransition(() => router.refresh());
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
          <h2 className="text-base font-semibold text-gray-900">New Ticket</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
            <input name="subject" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
              <input name="contactName"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Email</label>
              <input name="contactEmail" type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select name="priority" defaultValue="medium"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <input name="category" placeholder="e.g. billing, technical"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} aria-disabled={saving}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create Ticket'}
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

// ─── Main Client ──────────────────────────────────────────────────────────────
export function TicketsClient({ tickets: initialTickets }: { tickets: Ticket[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [showNew, setShowNew] = useState(searchParams.get('new') === 'true');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isUpdating, setIsUpdating] = useState(false);
  const t = useTranslations('support');

  // Realtime: refresh ticket list when ticket events arrive via SSE
  const handleRealtimeUpdate = useCallback(() => {
    setIsUpdating(true);
    startTransition(() => {
      router.refresh();
    });
    setTimeout(() => setIsUpdating(false), 1_500);
  }, [router]);

  useRealtimeEvents(['ticket.created', 'ticket.updated'], handleRealtimeUpdate);

  const filtered = initialTickets.filter((t) => {
    if (statusFilter !== 'all' && t.data.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.data.priority !== priorityFilter) return false;
    return true;
  });

  const total = initialTickets.length;
  const openCount = initialTickets.filter((t) => t.data.status === 'open').length;
  const inProgressCount = initialTickets.filter((t) => t.data.status === 'in_progress').length;
  const resolvedToday = initialTickets.filter((t) => {
    if (t.data.status !== 'resolved') return false;
    const upd = t.data.updatedAt;
    if (!upd) return false;
    return new Date(upd).toDateString() === new Date().toDateString();
  }).length;

  const STATUS_TABS = ['all', 'open', 'in_progress', 'resolved', 'closed'] as const;

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{t('title')} {t('tickets')}</h1>
            {isUpdating && (
              <span className="text-xs text-gray-400 animate-pulse">Updating…</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{openCount} open tickets</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          {t('newTicket')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('tickets'), value: total, color: 'text-gray-900' },
          { label: t('status.open'), value: openCount, color: 'text-blue-600' },
          { label: t('status.in_progress'), value: inProgressCount, color: 'text-yellow-600' },
          { label: t('status.resolved'), value: resolvedToday, color: 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                statusFilter === s
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          aria-label="Filter by priority"
          className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No tickets found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">#</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Subject</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Contact</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('assignee')}</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">{t('priority')}</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Created</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">SLA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => {
                const d = ticket.data;
                const overdue = isOverdue(ticket);
                return (
                  <tr
                    key={ticket.id}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/dashboard/support/tickets/${ticket.id}`);
                      }
                    }}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset"
                    onClick={() => router.push(`/dashboard/support/tickets/${ticket.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-400">
                        {d.ticketNumber ?? ticket.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="font-medium text-gray-900 truncate block">
                        {d.subject ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div>{d.contactName ?? ''}</div>
                      <div className="text-gray-400">{d.contactEmail ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{d.assignedTo ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        aria-label={`Priority: ${d.priority ?? 'medium'}`}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[d.priority ?? 'medium'] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {d.priority ?? 'medium'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[d.status ?? 'open'] ?? 'bg-gray-100 text-gray-600'}`}>
                        {(d.status ?? 'open').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {d.createdAt ? new Date(d.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {overdue ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                          <AlertTriangle size={11} /> Overdue
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <NewTicketSlideOver open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
