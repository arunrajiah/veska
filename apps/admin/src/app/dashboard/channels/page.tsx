import { CheckCircle, XCircle, AlertCircle, Radio, Hash, Mail, MessageCircle } from 'lucide-react';
import Link from 'next/link';

type ChannelStatus = 'connected' | 'disconnected' | 'degraded';

const CHANNEL_ICONS = {
  slack: Hash,
  email: Mail,
  whatsapp: MessageCircle,
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

// Stub — in production fetched from GET /api/v1/channels with health check
const STUB_CHANNELS: Array<{
  name: string;
  displayName: string;
  status: ChannelStatus;
  latencyMs?: number;
  lastChecked: string;
  details: string;
}> = [
  {
    name: 'slack',
    displayName: 'Slack',
    status: 'connected',
    latencyMs: 84,
    lastChecked: '30s ago',
    details: 'Connected to workspace: Acme Corp (#general)',
  },
  {
    name: 'email',
    displayName: 'Email',
    status: 'disconnected',
    lastChecked: 'never',
    details: 'No email channel configured. Add a Resend API key to enable.',
  },
  {
    name: 'whatsapp',
    displayName: 'WhatsApp',
    status: 'disconnected',
    lastChecked: 'never',
    details: 'WhatsApp Business API not configured.',
  },
];

export default function ChannelsPage() {
  const connectedCount = STUB_CHANNELS.filter((c) => c.status === 'connected').length;

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-2">
        <Radio size={20} className="text-gray-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Channels</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        {connectedCount} of {STUB_CHANNELS.length} channels connected
      </p>

      <div className="space-y-3">
        {STUB_CHANNELS.map((ch) => {
          const ChannelIcon = CHANNEL_ICONS[ch.name as keyof typeof CHANNEL_ICONS] ?? Radio;
          const StatusIcon = STATUS_ICONS[ch.status];

          return (
            <div key={ch.name} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ChannelIcon size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{ch.displayName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{ch.details}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ch.latencyMs !== undefined && (
                    <span className="text-xs text-gray-400">{ch.latencyMs}ms</span>
                  )}
                  <StatusIcon
                    size={16}
                    className={STATUS_COLORS[ch.status]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-400">Last checked: {ch.lastChecked}</span>
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
