// Server component — read query params, look up plugin info, show confirmation UI
import InstallConfirm from './install-confirm.js';

export default function PluginInstallPage({
  searchParams,
}: {
  searchParams: { pluginId?: string; source?: string };
}) {
  const pluginId = searchParams.pluginId ?? '';
  if (!pluginId) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500 text-sm">No plugin specified.</p>
      </div>
    );
  }
  return (
    <div className="px-8 py-8 max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Install plugin</h1>
      <p className="text-sm text-gray-500 mb-6">
        Plugin ID: <span className="font-mono text-gray-700">{pluginId}</span>
        {searchParams.source === 'marketplace' && (
          <span className="ml-2 text-xs text-indigo-600">from Marketplace</span>
        )}
      </p>
      <InstallConfirm pluginId={pluginId} />
    </div>
  );
}
