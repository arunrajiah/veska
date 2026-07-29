'use client';

import { useState } from 'react';
import { Hash, Mail, MessageCircle, Send, MessageSquare, Inbox } from 'lucide-react';

export interface AuditEvent {
  id: string;
  action: string;
  createdAt: string;
  tenantId?: string;
  metadata?: {
    channelName?: string;
    channel?: string;
    senderChannelId?: string;
    identityId?: string;
    response?: string;
    actionType?: string;
    [key: string]: unknown;
  };
}

type ChannelKey = 'slack' | 'email' | 'whatsapp' | 'telegram' | 'all';

const CHANNEL_CONFIG: Record<
  Exclude<ChannelKey, 'all'>,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    badge: string;
    label: string;
  }
> = {
  slack: {
    icon: Hash,
    color: 'text-indigo-500',
    badge: 'bg-indigo-100 text-indigo-700',
    label: 'Slack',
  },
  email: { icon: Mail, color: 'text-blue-500', badge: 'bg-blue-100 text-blue-700', label: 'Email' },
  whatsapp: {
    icon: MessageCircle,
    color: 'text-green-500',
    badge: 'bg-green-100 text-green-700',
    label: 'WhatsApp',
  },
  telegram: {
    icon: Send,
    color: 'text-sky-500',
    badge: 'bg-sky-100 text-sky-700',
    label: 'Telegram',
  },
};

function detectChannel(event: AuditEvent): Exclude<ChannelKey, 'all'> {
  const raw = (event.metadata?.channelName ?? event.metadata?.channel ?? '').toLowerCase();
  if (raw.includes('slack')) return 'slack';
  if (raw.includes('email')) return 'email';
  if (raw.includes('whatsapp')) return 'whatsapp';
  if (raw.includes('telegram')) return 'telegram';
  return 'slack';
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + '…';
}

function formatMetaValue(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

// ─── Conversation Detail ──────────────────────────────────────────────────────
function ConversationDetail({ event }: { event: AuditEvent }) {
  const channel = detectChannel(event);
  const cfg = CHANNEL_CONFIG[channel];
  const Icon = cfg.icon;
  const meta = event.metadata ?? {};
  const sender = meta.senderChannelId ?? meta.identityId ?? 'Unknown sender';

  const metaEntries = Object.entries(meta).filter(([, v]) => {
    const s = formatMetaValue(v);
    return s !== null && s !== '' && s !== 'null' && s !== 'undefined';
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
        <div className={`p-2 rounded-lg bg-gray-50`}>
          <Icon size={16} className={cfg.color} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{sender}</p>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}
          >
            {cfg.label}
          </span>
        </div>
        <span className="ml-auto text-xs text-gray-400">{relativeTime(event.createdAt)}</span>
      </div>

      <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
        {/* Message metadata card */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Event Info
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <span className="text-gray-400">Action</span>
              <p className="text-gray-700 font-medium mt-0.5 font-mono">{event.action}</p>
            </div>
            <div>
              <span className="text-gray-400">Timestamp</span>
              <p className="text-gray-700 font-medium mt-0.5">
                {new Date(event.createdAt).toLocaleString()}
              </p>
            </div>
            {event.tenantId && (
              <div>
                <span className="text-gray-400">Tenant</span>
                <p className="text-gray-700 font-medium mt-0.5">{event.tenantId}</p>
              </div>
            )}
            {meta.identityId && (
              <div>
                <span className="text-gray-400">Identity</span>
                <p className="text-gray-700 font-medium mt-0.5 truncate">
                  {String(meta.identityId)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AI Response */}
        {meta.response && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              AI Response
            </p>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl rounded-tl-sm p-4">
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {String(meta.response)}
              </p>
            </div>
          </div>
        )}

        {/* Metadata key-value pairs */}
        {metaEntries.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Metadata
            </p>
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {metaEntries.map(([key, val]) => {
                const display = formatMetaValue(val);
                if (!display) return null;
                return (
                  <div key={key} className="flex items-start gap-4 px-4 py-2.5 text-xs">
                    <span className="text-gray-400 font-mono min-w-[120px] flex-shrink-0">
                      {key}
                    </span>
                    <span className="text-gray-700 break-all">{display}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────
const FILTER_TABS: ChannelKey[] = ['all', 'slack', 'email', 'whatsapp', 'telegram'];

export function InboxClient({ events }: { events: AuditEvent[] }) {
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelKey>('all');
  const [search, setSearch] = useState('');

  const filtered = events.filter((ev) => {
    if (channelFilter !== 'all' && detectChannel(ev) !== channelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const sender = (ev.metadata?.senderChannelId ?? ev.metadata?.identityId ?? '').toLowerCase();
      const action = ev.action.toLowerCase();
      const resp = (ev.metadata?.response ?? '').toLowerCase();
      if (!sender.includes(q) && !action.includes(q) && !resp.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Left panel */}
      <div className="w-[300px] border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-semibold text-gray-900 flex items-center gap-1.5">
              <Inbox size={16} className="text-gray-500" />
              Inbox
            </h1>
            <span className="bg-gray-900 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {filtered.length}
            </span>
          </div>
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto scrollbar-none">
          {FILTER_TABS.map((tab) => {
            const isActive = channelFilter === tab;
            const label = tab === 'all' ? 'All' : CHANNEL_CONFIG[tab].label;
            return (
              <button
                key={tab}
                onClick={() => setChannelFilter(tab)}
                className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${
                  isActive ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <MessageSquare size={28} className="text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No messages yet.</p>
            </div>
          ) : (
            filtered.map((event) => {
              const channel = detectChannel(event);
              const cfg = CHANNEL_CONFIG[channel];
              const Icon = cfg.icon;
              const meta = event.metadata ?? {};
              const sender = meta.senderChannelId ?? meta.identityId ?? event.action;
              const preview = meta.response ? truncate(String(meta.response), 70) : event.action;
              const isSelected = selected?.id === event.id;

              return (
                <button
                  key={event.id}
                  onClick={() => setSelected(isSelected ? null : event)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                    isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={12} className={cfg.color + ' flex-shrink-0'} />
                    <span className="text-xs font-medium text-gray-700 truncate flex-1">
                      {truncate(String(sender), 28)}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {relativeTime(event.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{preview}</p>
                  <span
                    className={`inline-flex items-center mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.badge}`}
                  >
                    {cfg.label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-gray-50 overflow-hidden">
        {selected ? (
          <ConversationDetail event={selected} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <MessageSquare size={40} className="text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400">Select a conversation</p>
            <p className="text-xs text-gray-300 mt-1">
              Click any message in the list to view the thread
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
