import { CheckCircle, XCircle, AlertCircle, Radio, Hash, Mail, MessageCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';

type ChannelStatus = 'connected' | 'disconnected' | 'degraded';

const CHANNEL_ICONS = {
  slack: Hash,
  email: Mail,
  whatsapp: MessageCircle,
  telegram: Send,
};

const STATUS_ICONS = {
  connected: CheckCircle,
  disconnected: XCircle,
  degraded: AlertCircle,
};

const STATUS_COLORS = {
  connected: 'text-green-600',
  disconnected: 'text-red-500',
  degraded: 'text-yellow-500',
};

const ALL_CHANNELS = ['slack', 'email', 'whatsapp', 'telegram'] as const;
type KnownChannel = (typeof ALL_CHANNELS)[number];

interface ChannelConfig {
  id: string;
  channelName: string;
  enabled: boolean;
  metadata: Record<string, unknown> | null;
}

interface ChannelHealth {
  channelName: string;
  enabled: boolean;
  healthy: boolean;
}

function channelDisplayName(name: string): string {
  const map: Record<string, string> = {
    slack: 'Slack',
    email: 'Email',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
  };
  return map[name] ?? name.charAt(0).toUpperCase() + name.slice(1);
}

export default async function ChannelsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let configs: ChannelConfig[] = [];
  try {
    configs = await apiFetch<ChannelConfig[]>('/api/v1/channels', tenantId);
  } catch {
    configs = [];
  }

  // Fetch health for each configured channel in parallel
  const healthResults = await Promise.allSettled(
    configs.map((ch) =>
      apiFetch<ChannelHealth>(`/api/v1/channels/${ch.channelName}/health`, tenantId),
    ),
  );

  const healthMap: Record<string, ChannelHealth> = {};
  healthResults.forEach((result, i) => {
    const name = configs[i]?.channelName;
    if (name && result.status === 'fulfilled') {
      healthMap[name] = result.value;
    }
  });

  const configuredNames = new Set(configs.map((c) => c.channelName));

  // Build display rows for all 4 known channels
  const channelRows = ALL_CHANNELS.map((name) => {
    const isConfigured = configuredNames.has(name);
    const health = healthMap[name];

    let status: ChannelStatus = 'disconnected';
    if (isConfigured) {
      if (!health) {
        status = 'degraded';
      } else if (health.healthy && health.enabled) {
        status = 'connected';
      } else if (!health.enabled) {
        status = 'disconnected';
      } else {
        status = 'degraded';
      }
    }

    let details = '';
    if (!isConfigured) {
      const detailsMap: Record<string, string> = {
        slack: 'No Slack workspace connected. Add a bot token to enable.',
        email: 'No email channel configured. Add a Resend API key to enable.',
        whatsapp: 'WhatsApp Business API not configured.',
        telegram: 'Telegram bot not configured.',
      };
      details = detailsMap[name] ?? `${channelDisplayName(name)} not configured.`;
    } else if (status === 'connected') {
      details = `Connected · ${channelDisplayName(name)} channel active`;
    } else if (status === 'degraded') {
      details = `${channelDisplayName(name)} configured but health check failed.`;
    } else {
      details = `${channelDisplayName(name)} is disabled.`;
    }

    return { name, isConfigured, status, details };
  });

  const connectedCount = channelRows.filter((c) => c.status === 'connected').length;

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-2">
        <Radio size={20} className="text-gray-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Channels</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        {connectedCount} of {ALL_CHANNELS.length} channels connected
      </p>

      <div className="space-y-3">
        {channelRows.map((ch) => {
          const ChannelIcon = CHANNEL_ICONS[ch.name as KnownChannel] ?? Radio;
          const StatusIcon = STATUS_ICONS[ch.status];

          return (
            <div key={ch.name} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ChannelIcon size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{channelDisplayName(ch.name)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{ch.details}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon size={16} className={STATUS_COLORS[ch.status]} />
                </div>
              </div>

              <div className="flex items-center justify-end mt-4">
                {ch.status === 'disconnected' ? (
                  <button className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                    Configure
                  </button>
                ) : (
                  <button className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                    Settings
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Need help? Check the{' '}
        <Link href="/docs/channels" className="underline hover:text-gray-600">
          channel setup guide
        </Link>
        .
      </p>
    </div>
  );
}
