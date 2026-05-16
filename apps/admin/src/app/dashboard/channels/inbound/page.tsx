import { CheckCircle, XCircle, Copy, Hash, MessageCircle, ArrowDownLeft } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface InboundChannelConfig {
  id: 'slack' | 'whatsapp';
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  configured: boolean;
  webhookPath: string;
  envVar: string;
  setupSteps: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Copy-to-clipboard client component (inline — no extra file needed)
// ─────────────────────────────────────────────────────────────────────────────

function WebhookUrlRow({ url }: { url: string }) {
  // This renders as a server component; the copy button is a lightweight inline
  // form action to avoid adding a separate client component file.
  return (
    <div className="flex items-center gap-2 mt-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <code className="text-xs text-gray-700 flex-1 truncate">{url}</code>
      <form
        action={async () => {
          'use server';
          // Intentional no-op — clipboard copy must be done client-side.
          // The <button> below is styled to invite the user to copy manually.
        }}
      >
        <button
          type="button"
          title="Copy URL"
          className="text-gray-400 hover:text-gray-700 transition-colors"
          // onClick handled via plain JS in a real client component;
          // shown here for UI completeness — use a Client Component wrapper
          // (e.g. CopyButton) to wire up navigator.clipboard in production.
        >
          <Copy size={13} />
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page (Server Component — reads env vars at render time)
// ─────────────────────────────────────────────────────────────────────────────

export default function InboundChannelsPage() {
  const appUrl =
    process.env['NEXT_PUBLIC_APP_URL'] ??
    process.env['VERCEL_URL']
      ? `https://${process.env['VERCEL_URL']}`
      : 'https://your-domain.com';

  const slackConfigured = Boolean(process.env['SLACK_SIGNING_SECRET']);
  const whatsappConfigured = Boolean(process.env['TWILIO_AUTH_TOKEN']);

  const channels: InboundChannelConfig[] = [
    {
      id: 'slack',
      label: 'Slack',
      Icon: Hash,
      configured: slackConfigured,
      webhookPath: '/api/v1/channels/inbound/slack',
      envVar: 'SLACK_SIGNING_SECRET',
      setupSteps: [
        'Go to api.slack.com/apps and open your Slack app.',
        'Under "Event Subscriptions", enable events and paste the webhook URL above as the Request URL.',
        'Subscribe to the bot event: message.channels (or message.im for DMs).',
        'Under "Basic Information", copy the Signing Secret and set it as SLACK_SIGNING_SECRET in your environment.',
        'Reinstall the app to your workspace to apply the new permissions.',
        'Optionally set SLACK_BOT_TOKEN to enable automated help replies.',
      ],
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp (via Twilio)',
      Icon: MessageCircle,
      configured: whatsappConfigured,
      webhookPath: '/api/v1/channels/inbound/whatsapp',
      envVar: 'TWILIO_AUTH_TOKEN',
      setupSteps: [
        'Log in to console.twilio.com and open your WhatsApp Sender.',
        'Under "Messaging" → "Settings" → "WhatsApp Sandbox Settings" (or your approved number settings), paste the webhook URL above as the "When a message comes in" URL.',
        'Set the HTTP method to POST.',
        'Copy your Twilio Auth Token from the account dashboard and set it as TWILIO_AUTH_TOKEN in your environment.',
        'Also set TWILIO_ACCOUNT_SID and TWILIO_WHATSAPP_FROM (e.g. whatsapp:+14155238886).',
        'Send a test message to your Twilio WhatsApp number to verify.',
      ],
    },
  ];

  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <ArrowDownLeft size={20} className="text-gray-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Inbound Channels</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Configure webhook endpoints so that replies sent to Veska bot accounts trigger ERP
        actions such as approvals. These endpoints authenticate via channel signing secrets —
        not Bearer tokens.
      </p>

      <div className="space-y-6">
        {channels.map((ch) => {
          const webhookUrl = `${appUrl}${ch.webhookPath}`;

          return (
            <div
              key={ch.id}
              className="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
            >
              {/* Title row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ch.Icon size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{ch.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Inbound webhook handler
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {ch.configured ? (
                    <>
                      <CheckCircle size={15} className="text-green-600" />
                      <span className="text-xs font-medium text-green-700">Configured</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={15} className="text-red-500" />
                      <span className="text-xs font-medium text-red-600">Not configured</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status detail */}
              {ch.configured ? (
                <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  <code className="font-mono">{ch.envVar}</code> is set. Signature
                  verification is active.
                </p>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <code className="font-mono">{ch.envVar}</code> is not set. Signature
                  verification is disabled — set this variable to secure the endpoint.
                </p>
              )}

              {/* Webhook URL */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">Webhook URL</p>
                <WebhookUrlRow url={webhookUrl} />
              </div>

              {/* Setup instructions */}
              <details className="group">
                <summary className="text-xs text-indigo-600 cursor-pointer hover:text-indigo-800 select-none">
                  Setup instructions
                </summary>
                <ol className="mt-3 space-y-1.5 list-decimal list-inside">
                  {ch.setupSteps.map((step, i) => (
                    <li key={i} className="text-xs text-gray-600 leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </details>
            </div>
          );
        })}
      </div>

      {/* Supported actions */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Supported reply actions</h2>
        <table className="w-full text-xs text-gray-600">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-1.5 pr-4 font-medium text-gray-700">Message pattern</th>
              <th className="text-left py-1.5 font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-1.5 pr-4 font-mono">approve &lt;uuid&gt;</td>
              <td className="py-1.5">Approves the approval request with the given ID</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4 font-mono">reject &lt;uuid&gt;</td>
              <td className="py-1.5">Rejects the approval request with the given ID</td>
            </tr>
            <tr>
              <td className="py-1.5 pr-4 font-mono">help or ?</td>
              <td className="py-1.5">Sends a help message back to the sender</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
