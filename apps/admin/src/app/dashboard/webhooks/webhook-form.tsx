'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const EVENT_OPTIONS = [
  { value: '*', label: '* (all events)' },
  { value: 'entity.created', label: 'entity.created' },
  { value: 'entity.updated', label: 'entity.updated' },
  { value: 'workflow.completed', label: 'workflow.completed' },
  { value: 'audit.*', label: 'audit.*' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface WebhookFormProps {
  tenantId: string;
}

export default function WebhookForm({ tenantId }: WebhookFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  function toggleEvent(value: string) {
    setSelectedEvents((prev) =>
      prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError('URL is required.');
      return;
    }
    if (selectedEvents.length === 0) {
      setError('Select at least one event.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify({ url: url.trim(), events: selectedEvents }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }
      const data = await res.json();
      if (data?.secret) {
        setRevealedSecret(data.secret);
      }
      setUrl('');
      setSelectedEvents([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Endpoint URL
        </label>
        <input
          type="url"
          placeholder="https://example.com/webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          required
        />
      </div>

      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">Events</p>
        <div className="space-y-2">
          {EVENT_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedEvents.includes(opt.value)}
                onChange={() => toggleEvent(opt.value)}
                className="rounded border-gray-300"
              />
              <span className="font-mono text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {revealedSecret && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-amber-800 mb-1">
            Signing secret — copy now, it will not be shown again
          </p>
          <code className="text-sm font-mono text-amber-900 break-all select-all">
            {revealedSecret}
          </code>
          <button
            type="button"
            onClick={() => setRevealedSecret(null)}
            className="mt-2 text-xs text-amber-600 hover:text-amber-800 underline block"
          >
            Dismiss
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating…' : 'Create subscription'}
      </button>
    </form>
  );
}
