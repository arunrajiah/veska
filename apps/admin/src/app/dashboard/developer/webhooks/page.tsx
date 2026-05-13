import Link from 'next/link';
import { Webhook, Plus } from 'lucide-react';

interface WebhookEndpoint {
  id: string;
  url: string;
  description?: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  event: string;
  status: 'delivered' | 'failed' | 'pending';
  statusCode?: number;
  attempt: number;
  createdAt: string;
}

async function fetchEndpoints(): Promise<{ data: WebhookEndpoint[]; error: string | null }> {
  try {
    const res = await fetch('http://localhost:3001/api/v1/webhooks/endpoints?tenantId=demo', {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { data: Array.isArray(data) ? data : data.data ?? [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load endpoints' };
  }
}

async function fetchDeliveries(): Promise<{ data: WebhookDelivery[]; error: string | null }> {
  try {
    const res = await fetch('http://localhost:3001/api/v1/webhooks/deliveries?tenantId=demo', {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { data: Array.isArray(data) ? data : data.data ?? [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load deliveries' };
  }
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_STYLES: Record<string, string> = {
  delivered: 'bg-green-50 text-green-700 border-green-100',
  failed: 'bg-red-50 text-red-700 border-red-100',
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
};

export default async function WebhooksPage() {
  const [{ data: endpoints, error: epError }, { data: deliveries, error: dlError }] =
    await Promise.all([fetchEndpoints(), fetchDeliveries()]);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-1">Receive real-time event notifications</p>
        </div>
        <Link
          href="/dashboard/developer/webhooks/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Add Endpoint
        </Link>
      </div>

      {/* Endpoints */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Endpoints</h2>

        {epError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            Failed to load endpoints: {epError}
          </div>
        )}

        {!epError && endpoints.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
            <Webhook size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">No webhook endpoints yet</p>
            <Link
              href="/dashboard/developer/webhooks/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Plus size={15} />
              Add Endpoint
            </Link>
          </div>
        )}

        {!epError && endpoints.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Events</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Enabled</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {endpoints.map((ep) => (
                  <tr key={ep.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs text-gray-700 break-all">{ep.url}</code>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{ep.description ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ep.events.map((ev) => (
                          <span
                            key={ev}
                            className="inline-block text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 rounded px-1.5 py-0.5"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${ep.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                        title={ep.enabled ? 'Enabled' : 'Disabled'}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(ep.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                          Test
                        </button>
                        <button className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Deliveries */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Recent Deliveries</h2>

        {dlError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            Failed to load deliveries: {dlError}
          </div>
        )}

        {!dlError && deliveries.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-400">No deliveries recorded yet.</p>
          </div>
        )}

        {!dlError && deliveries.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Attempt</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveries.map((dl) => (
                  <tr key={dl.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs text-gray-700">{dl.event}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-xs font-medium border rounded-full px-2 py-0.5 capitalize ${STATUS_STYLES[dl.status] ?? 'bg-gray-50 text-gray-600 border-gray-100'}`}
                      >
                        {dl.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{dl.statusCode ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{dl.attempt}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(dl.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
