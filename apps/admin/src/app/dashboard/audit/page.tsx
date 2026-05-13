import { ScrollText, Bot, User, Settings } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

const ACTOR_ICONS = {
  ai: Bot,
  user: User,
  system: Settings,
  plugin: Settings,
};

interface AuditEvent {
  id: string;
  actorType: string;
  action: string;
  resourceType: string | null;
  metadata: Record<string, unknown> | null;
  aiReasoningTrace: string | null;
  createdAt: string;
}

interface AuditResponse {
  events: AuditEvent[];
}

export default async function AuditLogPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let events: AuditEvent[] = [];
  try {
    const res = await apiFetch<AuditResponse>('/api/v1/audit', tenantId);
    events = Array.isArray(res.events) ? res.events : [];
  } catch {
    events = [];
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <ScrollText size={20} className="text-gray-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Audit log</h1>
      </div>

      {events.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <ScrollText size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No audit events yet.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {events.map((event, i) => {
            const IconComponent =
              ACTOR_ICONS[event.actorType as keyof typeof ACTOR_ICONS] ?? User;
            return (
              <div key={event.id} className="flex gap-4">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      event.actorType === 'ai'
                        ? 'bg-indigo-100 text-indigo-600'
                        : event.actorType === 'system' || event.actorType === 'plugin'
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <IconComponent size={14} />
                  </div>
                  {i < events.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200 my-1" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-6 flex-1">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div>
                      <span className="font-mono text-xs text-gray-400 mr-2">{event.action}</span>
                      {event.resourceType && (
                        <span className="text-xs text-gray-400 mr-2">{event.resourceType}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {typeof event.createdAt === 'string'
                        ? event.createdAt.replace('T', ' ').slice(0, 19)
                        : ''}
                    </span>
                  </div>

                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <p className="text-sm text-gray-600 mb-1">
                      {Object.entries(event.metadata)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(' · ')}
                    </p>
                  )}

                  {event.aiReasoningTrace && (
                    <details className="mt-2">
                      <summary className="text-xs text-indigo-600 cursor-pointer hover:text-indigo-800 select-none">
                        AI reasoning trace
                      </summary>
                      <p className="mt-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 leading-relaxed">
                        {event.aiReasoningTrace}
                      </p>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
