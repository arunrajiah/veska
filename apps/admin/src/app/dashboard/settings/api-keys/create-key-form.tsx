'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface CreateKeyFormProps {
  tenantId: string;
}

export function CreateKeyForm({ tenantId }: CreateKeyFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/veska/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify({
          name: name.trim(),
          expiresAt: expiresAt || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }
      const data = await res.json();
      if (data?.rawKey) {
        setRevealedKey(data.rawKey);
      }
      setName('');
      setExpiresAt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    setRevealedKey(null);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. CI/CD pipeline"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expires <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {revealedKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-amber-800 mb-1">
            API key — copy now, it will not be shown again
          </p>
          <code className="text-sm font-mono text-amber-900 break-all select-all">
            {revealedKey}
          </code>
          <button
            type="button"
            onClick={handleDismiss}
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
        {loading ? 'Creating…' : 'Create key'}
      </button>
    </form>
  );
}
