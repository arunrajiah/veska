import { ClipboardList } from 'lucide-react';
import AuditFilters from './_filters';

interface AuditEvent {
  id: string;
  timestamp: string;
  actorType: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  ip?: string;
}

interface SearchParams {
  action?: string;
  entityType?: string;
}

async function fetchAuditLog(
  action?: string,
  entityType?: string
): Promise<{ data: AuditEvent[]; error: string | null }> {
  try {
    const params = new URLSearchParams({ tenantId: 'demo', limit: '50' });
    if (action) params.set('action', action);
    if (entityType) params.set('entityType', entityType);
    const res = await fetch(
      `http://localhost:3001/api/v1/audit?${params.toString()}`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { data: Array.isArray(data) ? data : data.data ?? [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : 'Failed to load audit log' };
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const ACTOR_COLORS: Record<string, string> = {
  user: 'bg-blue-50 text-blue-700 border-blue-100',
  system: 'bg-gray-100 text-gray-600 border-gray-200',
  api: 'bg-purple-50 text-purple-700 border-purple-100',
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { action, entityType } = await searchParams;
  const { data: events, error } = await fetchAuditLog(action, entityType);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Track all actions across your tenant</p>
      </div>

      <AuditFilters initialAction={action ?? ''} initialEntityType={entityType ?? ''} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mt-4">
          Failed to load audit log: {error}
        </div>
      )}

      {!error && events.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center mt-4">
          <ClipboardList size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">No audit events yet.</p>
        </div>
      )}

      {!error && events.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    <span title={ev.timestamp}>{formatTime(ev.timestamp)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block text-xs font-medium border rounded px-1.5 py-0.5 capitalize ${ACTOR_COLORS[ev.actorType] ?? 'bg-gray-50 text-gray-600 border-gray-100'}`}
                      >
                        {ev.actorType}
                      </span>
                      <span className="text-gray-700 text-xs">{ev.actorId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs text-gray-700">{ev.action}</code>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {ev.entityType} <span className="text-gray-400">/</span> {ev.entityId}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{ev.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
