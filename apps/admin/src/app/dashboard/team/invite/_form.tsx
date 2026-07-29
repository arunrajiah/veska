'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, CheckCheck } from 'lucide-react';

export default function InviteForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteResult, setInviteResult] = useState<{ name: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1/users',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: 'demo', name, email }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to invite user');
      }
      const data = await res.json();
      const token = data.inviteToken ?? data.user?.inviteToken ?? data.token ?? '';
      setInviteResult({ name, token });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteResult) return;
    const link = `/accept-invite?token=${inviteResult.token}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (inviteResult) {
    const link = `/accept-invite?token=${inviteResult.token}`;
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800 font-medium mb-2">
            Invitation created! Share this invite link with {inviteResult.name}:
          </p>
          <div className="flex items-center gap-2 bg-white border border-green-200 rounded px-3 py-2">
            <code className="text-xs text-gray-700 flex-1 break-all">{link}</code>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 text-green-700 hover:text-green-900 transition-colors"
              title="Copy link"
            >
              {copied ? <CheckCheck size={15} /> : <Copy size={15} />}
            </button>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/team')}
          className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Jane Doe"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="jane@example.com"
        />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Sending…' : 'Send Invite'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/team')}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
