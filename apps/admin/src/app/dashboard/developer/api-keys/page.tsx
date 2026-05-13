import Link from 'next/link';
import { Key, Plus } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

async function fetchApiKeys(): Promise<{ data: ApiKey[] | null; error: string | null }> {
  try {
    const res = await fetch('http://localhost:3001/api/v1/api-keys?tenantId=demo', {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { data: Array.isArray(data) ? data : data.data ?? [], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to load API keys' };
  }
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function ApiKeysPage() {
  const { data: keys, error } = await fetchApiKeys();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-1">Manage programmatic access to your tenant</p>
        </div>
        <Link
          href="/dashboard/developer/api-keys/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Create API Key
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
          Failed to load API keys: {error}
        </div>
      )}

      {!error && keys && keys.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Key size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">No API keys yet</p>
          <p className="text-sm text-gray-400 mt-1">Create one to start accessing the Veska API</p>
          <Link
            href="/dashboard/developer/api-keys/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={15} />
            Create API Key
          </Link>
        </div>
      )}

      {!error && keys && keys.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Prefix</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Scopes</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Used</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{key.name}</td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {key.prefix}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="inline-block text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(key.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(key.lastUsedAt)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(key.expiresAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
