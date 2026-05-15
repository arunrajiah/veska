'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Sparkles,
  X,
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

function NotifIcon({ type }: { type: string }) {
  switch (type) {
    case 'warning':
      return <Info size={14} className="text-amber-500" />;
    case 'error':
      return <AlertCircle size={14} className="text-red-500" />;
    case 'success':
      return <CheckCircle size={14} className="text-green-500" />;
    case 'ai_insight':
      return <Sparkles size={14} className="text-violet-500" />;
    case 'anomaly':
      return <AlertTriangle size={14} className="text-red-500" />;
    case 'approval':
      return <CheckCircle size={14} className="text-indigo-500" />;
    default:
      return <Info size={14} className="text-blue-500" />;
  }
}

function iconBg(type: string): string {
  switch (type) {
    case 'warning':
      return 'bg-amber-100';
    case 'error':
    case 'anomaly':
      return 'bg-red-100';
    case 'success':
      return 'bg-green-100';
    case 'ai_insight':
      return 'bg-violet-100';
    case 'approval':
      return 'bg-indigo-100';
    default:
      return 'bg-blue-100';
  }
}

export default function NotificationBell({ userId = 'demo-user' }: { userId?: string }) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/notifications/unread-count?userId=${encodeURIComponent(userId)}`,
        { headers: apiHeaders(), cache: 'no-store' },
      );
      if (res.ok) {
        const data = (await res.json()) as { count: number };
        setCount(data.count);
      }
    } catch {
      // ignore
    }
  }, [userId]);

  const fetchNotifications = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/notifications?userId=${encodeURIComponent(userId)}&limit=10`,
        { headers: apiHeaders(), cache: 'no-store' },
      );
      if (res.ok) {
        const data = (await res.json()) as Notification[];
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingList(false);
    }
  }, [userId]);

  // Poll unread count every 30s
  useEffect(() => {
    void fetchCount();
    const interval = setInterval(() => void fetchCount(), 30_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleToggle() {
    if (!open) {
      void fetchNotifications();
    }
    setOpen((v) => !v);
  }

  async function markRead(notif: Notification) {
    const actionUrl = notif.actionUrl ?? notif.link;
    try {
      await fetch(`${API_BASE}/api/v1/notifications/${notif.id}/read`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
      );
      setCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
    if (actionUrl) {
      setOpen(false);
      router.push(actionUrl);
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setCount(0);
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={15} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void markAllRead()}
                disabled={markingAll}
                className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
              >
                {markingAll ? 'Marking…' : 'Mark all read'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loadingList ? (
              <div className="px-4 py-8 text-center text-xs text-gray-400">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-400">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => void markRead(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                    !n.read ? 'bg-indigo-50/60' : ''
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${iconBg(n.type)}`}
                  >
                    <NotifIcon type={n.type} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium text-gray-900 truncate ${!n.read ? 'font-semibold' : ''}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-gray-500 truncate">{n.body}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => { setOpen(false); router.push('/dashboard/notifications'); }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
