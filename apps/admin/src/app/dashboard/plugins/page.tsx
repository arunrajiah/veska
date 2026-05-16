import Link from 'next/link';
import { Puzzle } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';
import { UninstallButton } from './uninstall-button.js';

interface Plugin {
  id: string;
  pluginId: string;
  name: string;
  version: string;
  enabled: boolean;
  config: Record<string, unknown>;
  installedAt: string;
}

interface PluginsResponse {
  plugins: Plugin[];
}

export default async function PluginsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let plugins: Plugin[] = [];
  try {
    const res = await apiFetch<PluginsResponse>('/api/v1/plugins', tenantId);
    plugins = Array.isArray(res.plugins) ? res.plugins : [];
  } catch {
    plugins = [];
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Puzzle size={20} className="text-gray-600" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Plugins</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {plugins.length} installed
            </p>
          </div>
        </div>
        <Link
          href={"/dashboard/plugins/marketplace" as any}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Browse marketplace
        </Link>
      </div>

      {plugins.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center">
          <Puzzle size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-1">No plugins installed.</p>
          <p className="text-gray-400 text-sm">
            Browse the{' '}
            <Link
              href={"/dashboard/plugins/marketplace" as any}
              className="text-gray-600 underline hover:text-gray-900"
            >
              marketplace
            </Link>{' '}
            to install your first plugin.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="bg-white border border-gray-200 rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{plugin.name}</h3>
                    <span className="text-xs text-gray-400">v{plugin.version}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        plugin.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {plugin.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-gray-400 mb-1">{plugin.pluginId}</p>
                  {plugin.installedAt && (
                    <p className="text-xs text-gray-400">
                      Installed{' '}
                      {typeof plugin.installedAt === 'string'
                        ? plugin.installedAt.slice(0, 10)
                        : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/dashboard/plugins/${plugin.pluginId}/run` as any}
                    className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Run function
                  </Link>
                  <UninstallButton
                    pluginId={plugin.pluginId}
                    pluginName={plugin.name}
                    tenantId={tenantId}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
