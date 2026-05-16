import { MessageSquare, Mail, Hash } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

const CHANNEL_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  slack: Hash,
  email: Mail,
  default: MessageSquare,
};

interface AuditEvent {
  id: string;
  action: string;
  createdAt: string;
  metadata?: {
    channelName?: string;
    channel?: string;
    senderChannelId?: string;
    identityId?: string;
    response?: string;
    [key: string]: unknown;
  };
}

interface AuditResponse {
  events?: AuditEvent[];
  data?: AuditEvent[];
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + '…';
}

export default async function InboxPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let events: AuditEvent[] = [];
  try {
    const res = await apiFetch<AuditResponse | AuditEvent[]>(
      '/api/v1/audit?action=ai.action.completed&limit=20',
      tenantId,
    );
    if (Array.isArray(res)) {
      events = res;
    } else {
      events = (res as AuditResponse).events ?? (res as AuditResponse).data ?? [];
    }
  } catch {
    events = [];
  }

  return (
    <div className="flex h-screen">
      {/* Message list */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <h1 className="font-semibold text-gray-900">Inbox</h1>
          <span className="bg-gray-900 text-white text-xs rounded-full px-2 py-0.5">
            {events.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <MessageSquare size={28} className="text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No recent events yet.</p>
            </div>
          ) : (
            events.map((event) => {
              const meta = event.metadata ?? {};
              const channelKey = (meta.channelName ?? meta.channel ?? 'default').toLowerCase();
              const Icon = CHANNEL_ICONS[channelKey] ?? CHANNEL_ICONS['default'] ?? MessageSquare;
              const sender = meta.senderChannelId ?? meta.identityId ?? event.action;
              const preview = meta.response
                ? truncate(meta.response, 80)
                : event.action;
              const time = relativeTime(event.createdAt);

              return (
                <div
                  key={event.id}
                  className="w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={12} className="text-gray-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-700 truncate">{sender}</span>
                    <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{time}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{preview}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Thread view placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <MessageSquare size={32} className="text-gray-300 mx-auto" />
          <p className="text-sm text-gray-400">Select a message to view the thread</p>
        </div>
      </div>
    </div>
  );
}
