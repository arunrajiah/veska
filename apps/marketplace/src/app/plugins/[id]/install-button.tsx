'use client';
import { useState } from 'react';

type Mode = 'idle' | 'choosing' | 'self-hosted-url' | 'installing' | 'done' | 'error';

export default function InstallButton({ pluginId, pluginName }: { pluginId: string; pluginName: string }) {
  const [mode, setMode] = useState<Mode>('idle');
  const [instanceUrl, setInstanceUrl] = useState('');
  const [error, setError] = useState('');

  // Cloud install: redirect to cloud dashboard install page
  function handleCloudInstall() {
    window.location.href = `https://hub.arunrajiah.com/products/veska?pluginId=${encodeURIComponent(pluginId)}`;
  }

  // Self-hosted install: redirect to user's instance admin
  function handleSelfHostedInstall() {
    if (!instanceUrl.trim()) { setError('Please enter your instance URL'); return; }
    try {
      const url = new URL(instanceUrl.trim().replace(/\/$/, ''));
      window.location.href = `${url.origin}/dashboard/plugins/install?pluginId=${encodeURIComponent(pluginId)}&source=marketplace`;
    } catch {
      setError('Invalid URL — enter something like https://veska.mycompany.com');
    }
  }

  if (mode === 'done') {
    return <div className="text-sm text-green-600 font-medium">Installed ✓</div>;
  }

  return (
    <div>
      {mode === 'idle' && (
        <button
          onClick={() => setMode('choosing')}
          className="w-full bg-gray-900 text-white text-sm px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          Install plugin
        </button>
      )}

      {mode === 'choosing' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-3">Where do you want to install?</p>
          <button
            onClick={handleCloudInstall}
            className="w-full border border-gray-900 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Veska Cloud ↗
          </button>
          <button
            onClick={() => setMode('self-hosted-url')}
            className="w-full border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Self-hosted instance
          </button>
          <button onClick={() => setMode('idle')} className="w-full text-xs text-gray-400 hover:text-gray-600 pt-1">
            Cancel
          </button>
        </div>
      )}

      {mode === 'self-hosted-url' && (
        <div className="space-y-2">
          <label className="block text-xs text-gray-500">Your Veska instance URL</label>
          <input
            type="url"
            value={instanceUrl}
            onChange={(e) => { setInstanceUrl(e.target.value); setError(''); }}
            placeholder="https://veska.mycompany.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            onKeyDown={(e) => e.key === 'Enter' && handleSelfHostedInstall()}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleSelfHostedInstall}
            className="w-full bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go to my instance →
          </button>
          <button onClick={() => setMode('choosing')} className="w-full text-xs text-gray-400 hover:text-gray-600 pt-1">
            Back
          </button>
        </div>
      )}
    </div>
  );
}
