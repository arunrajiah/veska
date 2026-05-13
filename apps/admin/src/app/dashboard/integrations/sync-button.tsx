'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function SyncButton({ integrationName }: { integrationName: string }) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  async function handleSync() {
    setSyncing(true);
    setStatus('idle');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? '';
      const res = await fetch(`${apiUrl}/api/v1/integrations/${integrationName}/sync`, {
        method: 'POST',
        headers: { 'X-Veska-Tenant-Id': tenantId },
      });
      setStatus(res.ok ? 'ok' : 'error');
    } catch {
      setStatus('error');
    } finally {
      setSyncing(false);
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
    >
      <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
      {status === 'ok' ? 'Synced!' : status === 'error' ? 'Failed' : 'Sync'}
    </button>
  );
}
