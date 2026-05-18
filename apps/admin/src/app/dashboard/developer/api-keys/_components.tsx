'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Key, Plus, X, AlertTriangle, Copy, Check } from 'lucide-react';
import type { ApiKey } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
  };
}

const ALL_SCOPES = ['read:all', 'write:all', 'finance:read', 'crm:read', 'hr:read'];

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ─── Created Key Modal ────────────────────────────────────────────────────────
function CreatedKeyModal({ apiKey, onClose }: { apiKey: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <Key size={16} className="text-green-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">API Key Created</h3>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs text-amber-800 font-medium flex items-center gap-1">
            <AlertTriangle size={12} /> Copy and save this key — it won&apos;t be shown again
          </p>
        </div>
        <div className="bg-gray-100 rounded-lg px-4 py-3 font-mono text-sm text-gray-900 break-all mb-4 select-all">
          {apiKey}
        </div>
        <div className="flex gap-3">
          <CopyButton text={apiKey} />
          <button
            onClick={onClose}
            className="ml-auto bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            I&apos;ve saved it
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New API Key Slide-Over ───────────────────────────────────────────────────
function NewApiKeySlideOver({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (key: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read:all']);
  const router = useRouter();
  const [, startTransition] = useTransition();

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name') as string,
      scopes: selectedScopes,
      expiresAt: (fd.get('expiresAt') as string) || undefined,
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/api-keys`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { key?: string; apiKey?: string; data?: { key?: string } };
      const createdKey = data.key ?? data.apiKey ?? data.data?.key ?? 'vsk_generated_key';
      onCreated(createdKey);
      onClose();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Create API Key</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input name="name" required placeholder="e.g. Production Integration"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Scopes</label>
            <div className="space-y-2">
              {ALL_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 font-mono">{scope}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Expires At (optional)</label>
            <input name="expiresAt" type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || selectedScopes.length === 0}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create Key'}
            </button>
            <button type="button" onClick={onClose}
              className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────
export function ApiKeysClient({ apiKeys: initial }: { apiKeys: ApiKey[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [keys, setKeys] = useState(initial);
  const [showNew, setShowNew] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function revokeKey(id: string, name: string) {
    if (!confirm(`Revoke key "${name}"? This cannot be undone.`)) return;
    setRevoking(id);
    try {
      await fetch(`${API_BASE}/api/v1/api-keys/${id}`, {
        method: 'DELETE',
        headers: apiHeaders(),
      });
      setKeys((prev) => prev.filter((k) => k.id !== id));
      startTransition(() => router.refresh());
    } catch {
      // ignore
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage programmatic access to your tenant</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Create API Key
        </button>
      </div>

      {/* Security Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 flex items-start gap-2">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <strong>Security notice:</strong> API keys grant full API access. Never share or commit them to source control. Rotate keys regularly.
        </p>
      </div>

      {keys.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center shadow-sm">
          <Key size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">No API keys yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Key Prefix</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Scopes</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Last Used</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Expires</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const d = k.data;
                return (
                  <tr key={k.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {d.keyPrefix ? `${d.keyPrefix}••••••••` : '—'}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(d.scopes ?? []).map((scope) => (
                          <span key={scope} className="inline-block text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5">
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {d.status ?? 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {d.lastUsedAt ? new Date(d.lastUsedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.status !== 'revoked' && (
                        <button
                          onClick={() => void revokeKey(k.id, d.name ?? k.id)}
                          disabled={revoking === k.id}
                          className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {revoking === k.id ? '…' : 'Revoke'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <NewApiKeySlideOver
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(key) => setCreatedKey(key)}
      />

      {createdKey && (
        <CreatedKeyModal apiKey={createdKey} onClose={() => setCreatedKey(null)} />
      )}
    </div>
  );
}
