'use client';

import { useState } from 'react';

interface Plugin {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  price: string;
  installs: string;
  icon: string;
}

interface InstallButtonProps {
  pluginId: string;
  pluginName: string;
  plugin: Plugin;
}

export function InstallButton({ pluginId, pluginName, plugin }: InstallButtonProps) {
  const [status, setStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

  if (!apiUrl) {
    return (
      <div className="w-full text-center bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-700 font-medium mb-1">Configuration required</p>
        <p className="text-xs text-amber-600">
          Set <code className="font-mono bg-amber-100 px-1 rounded">NEXT_PUBLIC_API_URL</code> to
          enable one-click install.
        </p>
      </div>
    );
  }

  async function handleInstall() {
    setStatus('installing');
    try {
      const res = await fetch(`${apiUrl}/api/v1/plugins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': tenantId ?? '',
        },
        body: JSON.stringify({
          pluginId,
          name: pluginName,
          version: '1.0.0',
          manifest: {
            id: plugin.id,
            name: plugin.name,
            description: plugin.description,
            category: plugin.category,
            author: plugin.author,
            price: plugin.price,
            icon: plugin.icon,
          },
          code: '// Plugin installed from marketplace',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }

      setStatus('success');
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  const label =
    status === 'installing'
      ? 'Installing…'
      : status === 'success'
      ? 'Installed!'
      : status === 'error'
      ? 'Failed — retry'
      : `Install ${pluginName}`;

  const colorClass =
    status === 'success'
      ? 'bg-green-600 hover:bg-green-700'
      : status === 'error'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-gray-900 hover:bg-gray-700';

  return (
    <button
      onClick={handleInstall}
      disabled={status === 'installing' || status === 'success'}
      className={`w-full text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 ${colorClass}`}
    >
      {label}
    </button>
  );
}
