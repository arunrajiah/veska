'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Info, AlertTriangle, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents.js';
import type { Notification } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotifTypeIcon({ type }: { type?: string }) {
  switch (type) {
    case 'warning':
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle size={15} className="text-amber-500" />
        </span>
      );
    case 'error':
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle size={15} className="text-red-500" />
        </span>
      );
    case 'success':
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={15} className="text-green-500" />
        </span>
      );
    case 'ai_insight':
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
          <Sparkles size={15} className="text-violet-500" />
        </span>
      );
    case 'anomaly':
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
          <AlertTriangle size={15} className="text-orange-500" />
        </span>
      );
    case 'approval':
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <CheckCircle size={15} className="text-indigo-500" />
        </span>
      );
    default:
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <Info size={15} className="text-blue-500" />
        </span>
      );
  }
}

type FilterTab = 'all' | 'unread' | 'ai_insights' | 'approvals' | 'anomalies';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'ai_insights', label: 'AI Insights' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'anomalies', label: 'Anomalies' },
];

export function NotificationsClient({ initialNotifications }: { initialNotifications: Notification[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [markingAll, setMarkingAll] = useState(false);

  useRealtimeEvents((event) => {
    if (event.type === 'notification') {
      // Refresh server data to prepend the new notification
      startTransition(() => router.refresh());
    }
  });

  const total = notifications.length;
  const unreadCount = notifications.filter((n) => !n.data.read).length;
  const aiInsights = notifications.filter((n) => n.data.type === 'ai_insight').length;
  const anomalies = notifications.filter((n) => n.data.type === 'anomaly').length;

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.data.read;
    if (filter === 'ai_insights') return n.data.type === 'ai_insight';
    if (filter === 'approvals') return n.data.type === 'approval';
    if (filter === 'anomalies') return n.data.type === 'anomaly';
    return true;
  });

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
        method: 'PATCH',
        headers: apiHeaders(),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, data: { ...n.data, read: true } })));
      startTransition(() => router.refresh());
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  }

  async function markRead(n: Notification) {
    if (n.data.read) {
      if (n.data.link) window.location.href = n.data.link;
      return;
    }
    try {
      await fetch(`${API_BASE}/api/v1/notifications/${n.id}/read`, {
        method: 'PATCH',
        headers: apiHeaders(),
      });
      setNotifications((prev) =>
        prev.map((item) => {
          if (item.id !== n.id) return item;
          const d = item.data;
          return {
            ...item,
            data: {
              ...(d.title !== undefined ? { title: d.title } : {}),
              ...(d.message !== undefined ? { message: d.message } : {}),
              ...(d.type !== undefined ? { type: d.type } : {}),
              ...(d.link !== undefined ? { link: d.link } : {}),
              ...(d.createdAt !== undefined ? { createdAt: d.createdAt } : {}),
              read: true,
            },
          };
        })
      );
    } catch {
      // ignore
    }
    if (n.data.link) window.location.href = n.data.link;
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell size={22} className="text-gray-700" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => void markAllRead()}
            disabled={markingAll}
            className="text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {markingAll ? 'Marking…' : 'Mark All Read'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: total, color: 'text-gray-900' },
          { label: 'Unread', value: unreadCount, color: 'text-blue-600' },
          { label: 'AI Insights', value: aiInsights, color: 'text-violet-600' },
          { label: 'Anomalies', value: anomalies, color: 'text-orange-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center shadow-sm">
          <Bell size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No notifications here.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-50">
          {filtered.map((n) => {
            const d = n.data;
            return (
              <button
                key={n.id}
                onClick={() => void markRead(n)}
                className={`w-full text-left flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors ${
                  !d.read ? 'bg-indigo-50/40' : ''
                }`}
              >
                <NotifTypeIcon {...(d.type !== undefined ? { type: d.type } : {})} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-gray-900 ${!d.read ? 'font-semibold' : 'font-medium'}`}>
                    {d.title ?? '—'}
                  </p>
                  {d.message && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{d.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(d.createdAt)}</span>
                  {!d.read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
