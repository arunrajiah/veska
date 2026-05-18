'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ALL_SCOPES = [
  'read:invoices',
  'write:invoices',
  'read:hr',
  'write:hr',
  'read:inventory',
  'write:inventory',
  'read:orders',
  'write:orders',
  'read:reports',
  'admin',
];

export default function ApiKeyForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (scopes.length === 0) {
      setError('Select at least one scope.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { tenantId: 'demo', name: name.trim(), scopes };
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      const key = data.key ?? data.apiKey ?? data.token ?? data.secret ?? JSON.stringify(data);
      setCreatedKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
  }

  function handleDone() {
    router.push('/dashboard/developer/api-keys');
  }

  if (createdKey) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-800 mb-2">
            ⚠️ Copy your API key — it will not be shown again.
          </p>
          <code className="block font-mono text-sm bg-white border border-amber-200 rounded px-3 py-2 break-all text-gray-900 select-all">
            {createdKey}
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
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl border border-gray-200 p-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CI/CD pipeline"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Scopes <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ALL_SCOPES.map((scope) => (
            <label key={scope} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={scopes.includes(scope)}
                onChange={() => toggleScope(scope)}
                className="rounded border-gray-300 text-gray-900"
              />
              <span className="font-mono text-xs">{scope}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expiry date <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Creating…' : 'Create API Key'}
        </button>
        <Link
          href="/dashboard/developer/api-keys"
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
