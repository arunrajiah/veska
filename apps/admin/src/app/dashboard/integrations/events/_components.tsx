'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plug,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders(extra?: Record<string, string>) {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);
  return { toast, show };
}

function Toast({ toast }: { toast: { msg: string; type: 'success' | 'error' } | null }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg ${
        toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'
      }`}
    >
      {toast.msg}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type EventStatus = 'delivered' | 'failed' | 'pending';

interface IntegrationEvent {
  id: string;
  eventType: string;
  integrationId: string;
  integrationName?: string;
  status: EventStatus;
  statusCode?: number | null;
  deliveredAt?: string | null;
  payload?: unknown;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function EventStatusBadge({ status }: { status: EventStatus }) {
  const map: Record<EventStatus, { cls: string; Icon: React.ElementType }> = {
    delivered: { cls: 'bg-green-50 text-green-700 border-green-200', Icon: CheckCircle },
    failed: { cls: 'bg-red-50 text-red-700 border-red-200', Icon: XCircle },
    pending: { cls: 'bg-gray-100 text-gray-500 border-gray-200', Icon: RefreshCw },
  };
  const { cls, Icon } = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cls} capitalize`}>
      <Icon size={10} />
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Event row with expandable payload
// ---------------------------------------------------------------------------
function EventRow({ event }: { event: IntegrationEvent }) {
  const [expanded, setExpanded] = useState(false);

  function fmt(iso?: string | null) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  return (
    <>
      <tr
        className="hover:bg-gray-50/60 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="py-3 pl-5 pr-4">
          <div className="flex items-center gap-1.5">
            {expanded ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
            <span className="text-xs font-mono text-gray-700">{event.eventType}</span>
          </div>
        </td>
        <td className="py-3 pr-4 text-xs text-gray-600">{event.integrationName ?? event.integrationId}</td>
        <td className="py-3 pr-4"><EventStatusBadge status={event.status} /></td>
        <td className="py-3 pr-4 text-xs text-gray-500">{event.statusCode ?? '—'}</td>
        <td className="py-3 pr-5 text-xs text-gray-500 whitespace-nowrap">{fmt(event.deliveredAt ?? event.createdAt)}</td>
      </tr>
      {expanded && event.payload && (
        <tr className="bg-gray-50">
          <td colSpan={5} className="pl-10 pr-5 py-3">
            <pre className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-64">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------
export function IntegrationEventsClient() {
  const { toast, show: showToast } = useToast();
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [integrationFilter, setIntegrationFilter] = useState('all');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/integrations/events`, { headers: apiHeaders() });
      const d = (await res.json()) as IntegrationEvent[] | { data?: IntegrationEvent[] };
      setEvents(Array.isArray(d) ? d : (d.data ?? []));
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchEvents(); }, [fetchEvents]);

  async function handleClear() {
    setClearing(true);
    try {
      const res = await fetch(`${API_BASE}/integrations/events`, {
        method: 'DELETE',
        headers: apiHeaders(),
      });
      if (!res.ok) { showToast('Failed to clear events', 'error'); return; }
      showToast('Old events cleared');
      void fetchEvents();
    } catch {
      showToast('Network error', 'error');
    } finally {
      setClearing(false);
    }
  }

  // Unique integrations for filter
  const integrationOptions = Array.from(
    new Map(events.map((e) => [e.integrationId, e.integrationName ?? e.integrationId])).entries()
  );

  const filtered = events.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (integrationFilter !== 'all' && e.integrationId !== integrationFilter) return false;
    return true;
  });

  return (
    <div className="px-8 py-8 max-w-5xl">
      <Toast toast={toast} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Plug size={22} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Integration Events</h1>
            <p className="text-xs text-gray-500 mt-0.5">Delivery log for all integration webhook events</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchEvents()}
            className="inline-flex items-center gap-2 text-sm border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => void handleClear()}
            disabled={clearing}
            className="inline-flex items-center gap-2 text-sm border border-red-200 text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {clearing
              ? <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
              : <Trash2 size={13} />}
            Clear old events
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'all')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All statuses</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div>
          <select
            value={integrationFilter}
            onChange={(e) => setIntegrationFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All integrations</option>
            {integrationOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} events</span>
      </div>

      {/* Events table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-sm text-gray-400 py-10 text-center">Loading events…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-gray-400 py-10 text-center">No events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-400 pl-5 py-3 pr-4">Event type</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4 pt-3">Integration</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4 pt-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-4 pt-3">Code</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 pr-5 pt-3">Delivered at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
