'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ALL_EVENTS = [
  'invoice.created',
  'invoice.paid',
  'so.created',
  'so.won',
  'po.approved',
  'po.received',
  'expense.approved',
  'payroll.completed',
  'grn.posted',
];

export default function WebhookForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingSecret, setSigningSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleEvent(ev: string) {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError('URL is required.');
      return;
    }
    if (events.length === 0) {
      setError('Select at least one event.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        tenantId: 'demo',
        url: url.trim(),
        events,
      };
      if (description.trim()) body.description = description.trim();

      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1/webhooks/endpoints',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      const secret =
        data.signingSecret ?? data.secret ?? data.signing_secret ?? data.webhookSecret ?? null;
      setSigningSecret(secret ?? '(no secret returned)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook endpoint');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!signingSecret) return;
    await navigator.clipboard.writeText(signingSecret);
    setCopied(true);
  }

  function handleDone() {
    router.push('/dashboard/developer/webhooks');
  }

  if (signingSecret) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-800 mb-2">
            ⚠️ Copy your signing secret — it will not be shown again.
          </p>
          <code className="block font-mono text-sm bg-white border border-amber-200 rounded px-3 py-2 break-all text-gray-900 select-all">
            {signingSecret}
          </code>
          <button
            onClick={handleCopy}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-amber-100 text-amber-900 rounded hover:bg-amber-200 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <button
          onClick={handleDone}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white rounded-xl border border-gray-200 p-6"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Endpoint URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/webhooks/veska"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Slack notification handler"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Events <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ALL_EVENTS.map((ev) => (
            <label
              key={ev}
              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={events.includes(ev)}
                onChange={() => toggleEvent(ev)}
                className="rounded border-gray-300 text-gray-900"
              />
              <span className="font-mono text-xs">{ev}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Creating…' : 'Add Endpoint'}
        </button>
        <Link
          href="/dashboard/developer/webhooks"
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
