'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface RevokeButtonProps {
  id: string;
  name: string;
  tenantId: string;
}

export function RevokeButton({ id, name, tenantId }: RevokeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke key');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRevoke}
      disabled={loading}
      title="Revoke key"
      className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 p-1.5 rounded-lg hover:bg-red-50"
    >
      <Trash2 size={15} />
    </button>
  );
}
