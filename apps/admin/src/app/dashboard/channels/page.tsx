import { apiFetch } from '@/lib/api.js';
import { ChannelsClient } from './_client.js';

export interface NotifChannel {
  id: string;
  type: 'slack' | 'email' | 'whatsapp' | 'telegram';
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
}

export interface NotifRoute {
  id: string;
  event: string;
  channelId: string;
  channelName: string;
  channelType: string;
}

export default async function ChannelsPage() {
  const tenantId =
    process.env.VESKA_TENANT_ID ?? process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let channels: NotifChannel[] = [];
  let routes: NotifRoute[] = [];

  try {
    const res = await apiFetch<NotifChannel[] | { data: NotifChannel[] }>(
      '/api/v1/notification-channels/channels',
      tenantId,
    );
    channels = Array.isArray(res) ? res : (res?.data ?? []);
  } catch {
    channels = [];
  }

  try {
    const res = await apiFetch<NotifRoute[] | { data: NotifRoute[] }>(
      '/api/v1/notification-channels/routes',
      tenantId,
    );
    routes = Array.isArray(res) ? res : (res?.data ?? []);
  } catch {
    routes = [];
  }

  return <ChannelsClient initialChannels={channels} initialRoutes={routes} />;
}
