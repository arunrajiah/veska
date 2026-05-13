'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InstallConfirm({ pluginId }: { pluginId: string }) {
  const router = useRouter();
  const [installing, setInstalling] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleInstall() {
    setInstalling(true);
    setError('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? '';
      const res = await fetch(`${apiUrl}/api/v1/plugins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': tenantId,
        },
        body: JSON.stringify({
          pluginId,
          name: pluginId.split('.').pop() ?? pluginId,
          version: '1.0.0',
          manifest: { id: pluginId, name: pluginId, version: '1.0.0', capabilitiesRequired: [] },
          code: `// Plugin ${pluginId} installed from Veska Marketplace`,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDone(true);
      setTimeout(() => router.push('/dashboard/plugins'), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Installation failed');
    } finally {
      setInstalling(false);
    }
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <p className="text-green-700 font-medium">Plugin installed successfully!</p>
        <p className="text-sm text-green-600 mt-1">Redirecting to plugins…</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <p className="text-sm text-gray-600">
        This will install the plugin into your Veska instance. The plugin runs in an isolated
        sandbox with the permissions listed in its manifest.
      </p>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <button
          onClick={handleInstall}
          disabled={installing}
          className="flex-1 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {installing ? 'Installing…' : 'Confirm install'}
        </button>
        <button
          onClick={() => router.push('/dashboard/plugins')}
          className="flex-1 border border-gray-200 text-gray-700 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
