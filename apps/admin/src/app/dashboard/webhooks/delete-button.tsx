'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';


interface DeleteButtonProps {
  id: string;
  tenantId: string;
}

export function DeleteButton({ id, tenantId }: DeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Delete this webhook subscription?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/veska/webhooks/${id}`, {
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
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete subscription"
      className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 p-1.5 rounded-lg hover:bg-red-50"
    >
      <Trash2 size={15} />
    </button>
  );
}
