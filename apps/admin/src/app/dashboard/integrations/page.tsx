import { Plug } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';
import SyncButton from './sync-button.js';

interface IntegrationRecord {
  name: string;
  enabled: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  config: Record<string, unknown>;
}

export default async function IntegrationsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let integrations: IntegrationRecord[] = [];
  try {
    const res = await apiFetch<IntegrationRecord[]>('/api/v1/integrations', tenantId);
    integrations = Array.isArray(res) ? res : [];
  } catch {
    integrations = [];
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Plug size={20} className="text-gray-600" />
        <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
      </div>

      {integrations.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <Plug size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No integrations configured yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {integrations.map((integration) => (
            <div key={integration.name} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 capitalize">{integration.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${integration.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {integration.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                {integration.lastSyncedAt && (
                  <p className="text-xs text-gray-400">
                    Last synced {new Date(integration.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <SyncButton integrationName={integration.name} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
