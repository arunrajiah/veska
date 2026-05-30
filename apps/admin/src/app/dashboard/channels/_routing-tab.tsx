'use client';

import { useState } from 'react';
import { Trash2, GitBranch } from 'lucide-react';
import type { NotifChannel, NotifRoute } from './page.js';

const COMMON_EVENTS = [
  'ticket.created',
  'ticket.status_changed',
  'invoice.created',
  'invoice.overdue',
  'invoice.paid',
  'deal.won',
  'deal.lost',
  'lead.assigned',
  'approval.requested',
  'approval.decided',
  'alert.anomaly',
  'workflow.failed',
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.split('; ').find((r) => r.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : '';
}

async function clientFetch(path: string, init: RequestInit = {}) {
  const tenantId = getCookie('veska_tenant') || TENANT_ID;
  const identityId = getCookie('veska_identity') || getCookie('veska_user') || 'system';
  const sessionToken = getCookie('veska_session');

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Veska-Tenant-Id': tenantId,
      'X-Veska-Identity-Id': identityId,
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  return res;
}

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  slack: 'Slack',
  email: 'Email',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
};

interface Props {
  channels: NotifChannel[];
  routes: NotifRoute[];
  onRoutesChange: (routes: NotifRoute[]) => void;
}

export function RoutingTab({ channels, routes, onRoutesChange }: Props) {
  const [newEvent, setNewEvent] = useState('');
  const [newChannelId, setNewChannelId] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAddRoute(e: React.FormEvent) {
    e.preventDefault();
    if (!newEvent || !newChannelId) {
      setAddError('Please select both an event and a channel.');
      return;
    }
    setAdding(true);
    setAddError('');

    try {
      const res = await clientFetch('/api/v1/notification-channels/routes', {
        method: 'POST',
        body: JSON.stringify({ event: newEvent, channelId: newChannelId }),
      });

      if (!res.ok) {
        const text = await res.text();
        setAddError(`Failed: ${text}`);
        return;
      }

      const route = (await res.json()) as NotifRoute;
      onRoutesChange([route, ...routes]);
      setNewEvent('');
      setNewChannelId('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteRoute(id: string) {
    setDeletingId(id);
    try {
      const res = await clientFetch(`/api/v1/notification-channels/routes/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onRoutesChange(routes.filter((r) => r.id !== id));
      }
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  }

  const selectClass =
    'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white';

  return (
    <div className="space-y-6">
      {/* Routing table */}
      {routes.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <GitBranch size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium mb-1">No routing rules yet</p>
          <p className="text-sm text-gray-400">
            Add rules below to route specific events to your configured channels.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Event</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Channel</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {routes.map((route) => (
                <tr key={route.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {route.event}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{route.channelName}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">
                      {CHANNEL_TYPE_LABELS[route.channelType] ?? route.channelType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteRoute(route.id)}
                      disabled={deletingId === route.id}
                      className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      aria-label="Delete route"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add route form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Add Routing Rule</h3>

        {channels.length === 0 ? (
          <p className="text-sm text-gray-400">
            You need to configure at least one channel before creating routing rules.
          </p>
        ) : (
          <form onSubmit={handleAddRoute} className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Event</label>
              <select
                value={newEvent}
                onChange={(e) => setNewEvent(e.target.value)}
                className={`${selectClass} w-full`}
              >
                <option value="">Select event…</option>
                {COMMON_EVENTS.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-shrink-0 text-gray-400 text-sm pb-2">→</div>

            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Channel</label>
              <select
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
                className={`${selectClass} w-full`}
              >
                <option value="">Select channel…</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={adding}
              className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {adding ? 'Adding…' : 'Add Rule'}
            </button>
          </form>
        )}

        {addError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            {addError}
          </p>
        )}
      </div>
    </div>
  );
}
