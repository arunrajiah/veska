import { KeyRound } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';
import { RevokeButton } from './revoke-button.js';
import { CreateKeyForm } from './create-key-form.js';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default async function ApiKeysPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let apiKeys: ApiKey[] = [];
  try {
    const res = await apiFetch<ApiKey[]>('/api/v1/api-keys', tenantId);
    apiKeys = Array.isArray(res) ? res : [];
  } catch {
    apiKeys = [];
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <KeyRound size={20} className="text-gray-600" />
        <h1 className="text-2xl font-semibold text-gray-900">API Keys</h1>
      </div>

      {apiKeys.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center mb-8">
          <KeyRound size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No API keys yet. Create one below to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Prefix</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Created</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Last used</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Expires</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-900 font-medium">{key.name}</td>
                  <td className="px-5 py-3">
                    <code className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {key.keyPrefix}…
                    </code>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <RevokeButton id={key.id} name={key.name} tenantId={tenantId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Create API key</h2>
        <CreateKeyForm tenantId={tenantId} />
      </div>
    </div>
  );
}
