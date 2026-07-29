'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DeleteChannelButtonProps {
  channelId: string;
  tenantId: string;
}

export default function DeleteChannelButton({ channelId, tenantId }: DeleteChannelButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setLoading(true);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/notification-channels/channels/${channelId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId }),
        },
      );
      router.refresh();
    } catch {
      console.error('Failed to delete channel');
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      onBlur={() => setConfirming(false)}
      disabled={loading}
      className={`inline-flex items-center gap-1 text-sm transition-colors ${
        confirming
          ? 'text-red-600 hover:text-red-800 font-medium'
          : 'text-gray-400 hover:text-red-600'
      } disabled:opacity-50`}
      aria-label="Delete channel"
    >
      <Trash2 size={14} />
      {confirming ? 'Confirm?' : 'Delete'}
    </button>
  );
}
