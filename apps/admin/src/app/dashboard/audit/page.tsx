import { ScrollText, Bot, User, Settings } from 'lucide-react';

const ACTOR_ICONS = {
  ai: Bot,
  user: User,
  system: Settings,
};

// Stub — in production fetched from GET /api/v1/audit (paginated, filtered)
const STUB_EVENTS = [
  {
    id: '1',
    actorType: 'ai',
    action: 'config.applied',
    resourceType: 'tenant',
    description: 'Applied config change: added Lead pipeline workflow',
    aiReasoningTrace: 'User asked to set up a CRM. Proposed 3 workflow changes. User confirmed. Applied atomically.',
    createdAt: '2026-05-13 10:42:01',
  },
  {
    id: '2',
    actorType: 'user',
    action: 'ticket.status_changed',
    resourceType: 'ticket',
    description: 'TKT-002 → in_progress',
    aiReasoningTrace: null,
    createdAt: '2026-05-13 09:15:22',
  },
  {
    id: '3',
    actorType: 'ai',
    action: 'entity.created',
    resourceType: 'Lead',
    description: 'Created lead: Sarah Chen (Nexus Labs) via Slack message',
    aiReasoningTrace: "User said 'Add Sarah from Nexus Labs as a new lead'. Extracted name=Sarah Chen, company=Nexus Labs, status=new.",
    createdAt: '2026-05-13 08:58:10',
  },
  {
    id: '4',
    actorType: 'ai',
    action: 'invoice.sent',
    resourceType: 'Invoice',
    description: 'Sent invoice INV-002 to BrightPath',
    aiReasoningTrace: "User asked to send the invoice to BrightPath. Retrieved INV-002. Generated magic link. Sent via email channel.",
    createdAt: '2026-05-12 17:30:00',
  },
  {
    id: '5',
    actorType: 'system',
    action: 'tenant.created',
    resourceType: 'tenant',
    description: 'Tenant created',
    aiReasoningTrace: null,
    createdAt: '2026-05-10 12:00:00',
  },
];

export default function AuditLogPage() {
  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <ScrollText size={20} className="text-gray-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Audit log</h1>
      </div>

      <div className="space-y-0">
        {STUB_EVENTS.map((event, i) => {
          const IconComponent = ACTOR_ICONS[event.actorType as keyof typeof ACTOR_ICONS] ?? User;
          return (
            <div key={event.id} className="flex gap-4">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  event.actorType === 'ai'
                    ? 'bg-indigo-100 text-indigo-600'
                    : event.actorType === 'system'
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  <IconComponent size={14} />
                </div>
                {i < STUB_EVENTS.length - 1 && (
                  <div className="w-px flex-1 bg-gray-200 my-1" />
                )}
              </div>

              {/* Content */}
              <div className={`pb-6 flex-1 ${i === STUB_EVENTS.length - 1 ? '' : ''}`}>
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div>
                    <span className="font-mono text-xs text-gray-400 mr-2">{event.action}</span>
                    <span className="text-sm text-gray-900">{event.description}</span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{event.createdAt}</span>
                </div>

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
    </div>
  );
}
