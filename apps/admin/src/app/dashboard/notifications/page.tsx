import { apiFetch } from '@/lib/api.js';
import { NotificationsClient } from './_components.js';

export interface Notification {
  id: string;
  data: {
    title?: string;
    message?: string;
    type?: 'info' | 'warning' | 'error' | 'success' | 'ai_insight' | 'anomaly' | 'approval';
    read?: boolean;
    link?: string;
    createdAt?: string;
  };
}

export default async function NotificationsPage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let notifications: Notification[] = [];
  try {
    const res = await apiFetch<{ data: Notification[] }>('/api/v1/notifications?limit=50', tenantId);
    notifications = Array.isArray(res) ? res : (res?.data ?? []);
  } catch {
    notifications = [];
  }

  return <NotificationsClient initialNotifications={notifications} />;
}
