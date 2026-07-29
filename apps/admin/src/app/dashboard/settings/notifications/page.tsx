import Link from 'next/link';
import { Mail, Hash, Globe, Plus, Pencil } from 'lucide-react';
import DeleteChannelButton from './_delete-button';
import RoutingTable from './_routing';

type Channel = {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook';
  enabled: boolean;
  config: Record<string, unknown>;
};

type Route = {
  id: string;
  event: string;
  channelId: string;
};

const TENANT_ID = 'demo';

async function fetchChannels(): Promise<Channel[]> {
  try {
    const res = await fetch(
      `${process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/notification-channels/channels?tenantId=${TENANT_ID}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.channels ?? []);
  } catch {
    return [];
  }
}

async function fetchRoutes(): Promise<Route[]> {
  try {
    const res = await fetch(
      `${process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/notification-channels/routes?tenantId=${TENANT_ID}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.routes ?? []);
  } catch {
    return [];
  }
}

function channelIcon(type: string) {
  if (type === 'email') return <Mail size={18} className="text-blue-500" />;
  if (type === 'slack') return <Hash size={18} className="text-purple-500" />;
  return <Globe size={18} className="text-green-500" />;
}

function typeBadgeClass(type: string) {
  if (type === 'email') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (type === 'slack') return 'bg-purple-50 text-purple-700 border-purple-200';
  return 'bg-green-50 text-green-700 border-green-200';
}

export default async function NotificationsPage() {
  const [channels, routes] = await Promise.all([fetchChannels(), fetchRoutes()]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notification Channels</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure where Veska sends alerts for key ERP events.
          </p>
        </div>
      </div>

      {/* Section 1: Channels */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Channels</h2>
          <Link
            href="/dashboard/settings/notifications/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Add Channel
          </Link>
        </div>

        {channels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
            <p className="text-sm text-gray-500">
              No channels configured. Add one to start receiving alerts.
            </p>
            <Link
              href="/dashboard/settings/notifications/new"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} />
              Add Channel
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3.5 shadow-sm"
              >
                {/* Left: icon + name + type */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                    {channelIcon(channel.type)}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">{channel.name}</span>
                    <div className="mt-0.5">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${typeBadgeClass(channel.type)}`}
                      >
                        {channel.type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: status + actions */}
                <div className="flex items-center gap-4">
                  {/* Enabled indicator */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${channel.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                    />
                    <span className="text-xs text-gray-500">
                      {channel.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {/* Edit */}
                  <Link
                    href={`/dashboard/settings/notifications/${channel.id}/edit` as any}
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                    aria-label="Edit channel"
                  >
                    <Pencil size={14} />
                    Edit
                  </Link>

                  {/* Delete */}
                  <DeleteChannelButton channelId={channel.id} tenantId={TENANT_ID} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Event Routing */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-800">Event Routing</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Choose which channels receive notifications for each ERP event.
          </p>
        </div>
        <RoutingTable routes={routes} channels={channels} tenantId={TENANT_ID} />
      </section>
    </div>
  );
}
