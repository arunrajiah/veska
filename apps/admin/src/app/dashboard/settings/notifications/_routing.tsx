'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

const EVENTS = [
  { key: 'invoice.created', label: 'Invoice created' },
  { key: 'invoice.paid', label: 'Invoice paid' },
  { key: 'po.approved', label: 'PO approved' },
  { key: 'po.received', label: 'PO received (GRN posted)' },
  { key: 'expense.approved', label: 'Expense approved' },
  { key: 'payroll.completed', label: 'Payroll run completed' },
  { key: 'so.won', label: 'Deal won → Sales Order created' },
  { key: 'grn.posted', label: 'GRN posted' },
  { key: 'user.invited', label: 'User invited' },
];

type Channel = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
};

type Route = {
  id: string;
  event: string;
  channelId: string;
};

interface RoutingTableProps {
  routes: Route[];
  channels: Channel[];
  tenantId: string;
}

export default function RoutingTable({ routes: initialRoutes, channels, tenantId }: RoutingTableProps) {
  const [routes, setRoutes] = useState<Route[]>(initialRoutes);
  const [selectedChannel, setSelectedChannel] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  function getRoutesForEvent(eventKey: string): Route[] {
    return routes.filter((r) => r.event === eventKey);
  }

  function getChannelById(id: string): Channel | undefined {
    return channels.find((c) => c.id === id);
  }

  async function addRoute(eventKey: string) {
    const channelId = selectedChannel[eventKey];
    if (!channelId) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: Route = { id: optimisticId, event: eventKey, channelId };

    setRoutes((prev) => [...prev, optimistic]);
    setSelectedChannel((prev) => ({ ...prev, [eventKey]: '' }));
    setLoading(optimisticId);

    try {
      const res = await fetch('http://localhost:3001/api/v1/notification-channels/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, event: eventKey, channelId }),
      });

      if (!res.ok) throw new Error('Failed to add route');
      const created: Route = await res.json();

      setRoutes((prev) => prev.map((r) => (r.id === optimisticId ? created : r)));
    } catch {
      setRoutes((prev) => prev.filter((r) => r.id !== optimisticId));
    } finally {
      setLoading(null);
    }
  }

  async function removeRoute(routeId: string) {
    setRoutes((prev) => prev.filter((r) => r.id !== routeId));

    try {
      const res = await fetch(`http://localhost:3001/api/v1/notification-channels/routes/${routeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });

      if (!res.ok) throw new Error('Failed to remove route');
    } catch {
      // Re-fetch routes on error — for now just log
      console.error('Failed to remove route', routeId);
    }
  }

  const activeChannels = channels.filter((c) => c.enabled);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">
              Event
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Channels
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
              Add route
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {EVENTS.map((event) => {
            const eventRoutes = getRoutesForEvent(event.key);
            const routedChannelIds = new Set(eventRoutes.map((r) => r.channelId));
            const availableChannels = activeChannels.filter((c) => !routedChannelIds.has(c.id));

            return (
              <tr key={event.key} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-800">{event.label}</span>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{event.key}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {eventRoutes.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">No channels</span>
                    ) : (
                      eventRoutes.map((route) => {
                        const channel = getChannelById(route.channelId);
                        return (
                          <span
                            key={route.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                              loading === route.id
                                ? 'bg-gray-100 text-gray-400 border-gray-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {channel?.name ?? route.channelId}
                            <button
                              onClick={() => removeRoute(route.id)}
                              className="ml-0.5 hover:text-red-600 transition-colors"
                              aria-label={`Remove ${channel?.name ?? route.channelId}`}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {availableChannels.length === 0 ? (
                    <span className="text-xs text-gray-400">All channels routed</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedChannel[event.key] ?? ''}
                        onChange={(e) =>
                          setSelectedChannel((prev) => ({ ...prev, [event.key]: e.target.value }))
                        }
                        className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select channel…</option>
                        {availableChannels.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => addRoute(event.key)}
                        disabled={!selectedChannel[event.key]}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus size={12} />
                        Add
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
