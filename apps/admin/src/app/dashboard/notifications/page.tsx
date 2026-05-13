import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import MarkAllButton from './mark-all-button.js';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function TypeIcon({ type }: { type: string }) {
  if (type === 'success') {
    return (
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold">
        ✓
      </span>
    );
  }
  if (type === 'warning') {
    return (
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 text-xs font-bold">
        !
      </span>
    );
  }
  if (type === 'error') {
    return (
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold">
        ✕
      </span>
    );
  }
  // info (default)
  return (
    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
      i
    </span>
  );
}

export default async function NotificationsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let notifications: Notification[] = [];
  try {
    const res = await apiFetch<Notification[]>('/api/v1/notifications?all=true', tenantId);
    notifications = Array.isArray(res) ? res : [];
  } catch {
    notifications = [];
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">{notifications.length} notifications</p>
        </div>
        {notifications.some((n) => !n.read) && <MarkAllButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-50">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-5 py-4 ${!n.read ? 'bg-blue-50/40' : ''}`}
            >
              <TypeIcon type={n.type} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                )}
                {n.link && (
                  <Link
                    href={n.link}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                  >
                    View →
                  </Link>
                )}
              </div>
              <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">
                {timeAgo(n.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
