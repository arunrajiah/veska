'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

interface Notification {
  id: string;
  title: string;
  body?: string | null;
  type: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string | null;
  link?: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotifTypeIcon({ type }: { type: string }) {
  const cls = 'flex-shrink-0';
  switch (type) {
    case 'warning':
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
          <Info size={15} className={`${cls} text-amber-500`} />
        </span>
      );
    case 'error':
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle size={15} className={`${cls} text-red-500`} />
        </span>
      );
    case 'success':
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={15} className={`${cls} text-green-500`} />
        </span>
      );
    case 'ai_insight':
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
          <Sparkles size={15} className={`${cls} text-violet-500`} />
        </span>
      );
    case 'anomaly':
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle size={15} className={`${cls} text-red-500`} />
        </span>
      );
    case 'approval':
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <CheckCircle size={15} className={`${cls} text-indigo-500`} />
        </span>
      );
    default:
      return (
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <Info size={15} className={`${cls} text-blue-500`} />
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

const PAGE_SIZE = 20;

export function NotificationsClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/notifications?userId=${encodeURIComponent(userId)}&limit=200`,
        { headers: apiHeaders(), cache: 'no-store' },
      );
      if (res.ok) {
        const data = (await res.json()) as Notification[];
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleNotifClick(n: Notification) {
    const actionUrl = n.actionUrl ?? n.link;
    if (!n.read) {
      try {
        await fetch(`${API_BASE}/api/v1/notifications/${n.id}/read`, {
          method: 'POST',
          headers: apiHeaders(),
        });
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
        );
      } catch {
        // ignore
      }
    }
    if (actionUrl) {
      router.push(actionUrl);
    }
  }

  // Filter
  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'ai_insights') return n.type === 'ai_insight';
    if (filter === 'approvals') return n.type === 'approval';
    if (filter === 'anomalies') return n.type === 'anomaly';
    return true;
  });

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;
  const unreadCount = notifications.filter((n) => !n.read).length;

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
            onClick={() => void handleMarkAllRead()}
            disabled={markingAll}
            className="text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {markingAll ? 'Marking…' : 'Mark all as read'}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setFilter(t.key); setPage(1); }}
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
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <Bell size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No notifications here.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-50">
            {paginated.map((n) => (
              <button
                key={n.id}
                onClick={() => void handleNotifClick(n)}
                className={`w-full text-left flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors ${
                  !n.read ? 'bg-indigo-50/40' : ''
                }`}
              >
                <NotifTypeIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm text-gray-900 ${!n.read ? 'font-semibold' : 'font-medium'}`}
                  >
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.body}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
