'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface UninstallButtonProps {
  pluginId: string;
  pluginName: string;
  tenantId: string;
}

export function UninstallButton({ pluginId, pluginName, tenantId }: UninstallButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUninstall = async () => {
    if (!confirm(`Uninstall "${pluginName}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/v1/plugins/${pluginId}`, {
        method: 'DELETE',
        headers: {
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUninstall}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50"
    >
      <Trash2 size={12} />
      {loading ? 'Uninstalling…' : 'Uninstall'}
    </button>
  );
}
