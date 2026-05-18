'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Hash, Globe, ChevronLeft, CheckCircle2 } from 'lucide-react';

type ChannelType = 'email' | 'slack' | 'webhook';

const TYPE_OPTIONS: Array<{
  type: ChannelType;
  icon: React.ReactNode;
  title: string;
  description: string;
}> = [
  {
    type: 'email',
    icon: <Mail size={22} className="text-blue-500" />,
    title: 'Email',
    description: 'Send alerts to an email address via Resend.',
  },
  {
    type: 'slack',
    icon: <Hash size={22} className="text-purple-500" />,
    title: 'Slack',
    description: 'Post messages to a Slack channel via Incoming Webhooks.',
  },
  {
    type: 'webhook',
    icon: <Globe size={22} className="text-green-500" />,
    title: 'Webhook',
    description: 'Send a signed HTTP POST to any endpoint.',
  },
];

const TENANT_ID = 'demo';

export default function AddChannelForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<ChannelType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [resendApiKey, setResendApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  function handleSelectType(type: ChannelType) {
    setSelectedType(type);
    setStep(2);
  }

  function buildConfig() {
    if (selectedType === 'email') {
      return {
        toEmail,
        resendApiKey,
        ...(fromEmail ? { fromEmail } : {}),
      };
    }
    if (selectedType === 'slack') {
      return { slackWebhookUrl };
    }
    return {
      webhookUrl,
      ...(webhookSecret ? { webhookSecret } : {}),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1/notification-channels/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          type: selectedType,
          name,
          config: buildConfig(),
          enabled: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Request failed (${res.status})`);
      }

      router.push('/dashboard/settings/notifications');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Step 1: type selector ─────────────────────────────────────────── */
  if (step === 1) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700 mb-2">Choose channel type</p>
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            onClick={() => handleSelectType(opt.type)}
            className="w-full flex items-start gap-4 px-4 py-4 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all text-left group"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:border-blue-200">
              {opt.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{opt.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>
    );
  }

  /* ── Step 2: configure ─────────────────────────────────────────────── */
  const typeLabel = TYPE_OPTIONS.find((o) => o.type === selectedType)?.title;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Back */}
      <button
        type="button"
        onClick={() => { setStep(1); setError(null); }}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ChevronLeft size={14} />
        Back
      </button>

      {/* Type badge */}
      <div className="flex items-center gap-2">
        <CheckCircle2 size={15} className="text-blue-500" />
        <span className="text-sm text-gray-600">
          Type: <strong>{typeLabel}</strong>
        </span>
      </div>

      {/* Common: name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Finance Team Email"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Email fields */}
      {selectedType === 'email' && (
        <>
          <div>
            <label htmlFor="toEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <input
              id="toEmail"
              type="email"
              required
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="alerts@example.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="resendApiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Resend API Key <span className="text-red-500">*</span>
            </label>
            <input
              id="resendApiKey"
              type="password"
              required
              value={resendApiKey}
              onChange={(e) => setResendApiKey(e.target.value)}
              placeholder="re_••••••••••••••••"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700 mb-1">
              From Email{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="fromEmail"
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="Veska <noreply@example.com>"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}

      {/* Slack fields */}
      {selectedType === 'slack' && (
        <div>
          <label htmlFor="slackWebhookUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Slack Webhook URL <span className="text-red-500">*</span>
          </label>
          <input
            id="slackWebhookUrl"
            type="url"
            required
            value={slackWebhookUrl}
            onChange={(e) => setSlackWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/…"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Create an Incoming Webhook in your Slack workspace and paste the URL here.
          </p>
        </div>
      )}

      {/* Webhook fields */}
      {selectedType === 'webhook' && (
        <>
          <div>
            <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint URL <span className="text-red-500">*</span>
            </label>
            <input
              id="webhookUrl"
              type="url"
              required
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-service.com/hooks/veska"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="webhookSecret" className="block text-sm font-medium text-gray-700 mb-1">
              Signing Secret{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="webhookSecret"
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_••••••••••••••••"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2 px-4 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Saving…' : 'Add Channel'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/settings/notifications')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
