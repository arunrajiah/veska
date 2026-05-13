'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

interface StatusButtonsProps {
  orderId: string;
  currentStatus: string;
}

export default function StatusButtons({ orderId, currentStatus }: StatusButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function updateStatus(status: string) {
    setLoading(status);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/purchasing/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': TENANT_ID,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(null);
    }
  }

  const canSend = currentStatus === 'draft';
  const canReceive = currentStatus === 'sent';
  const canCancel = currentStatus !== 'cancelled' && currentStatus !== 'received';

  return (
    <div className="flex flex-col gap-2">
      {canSend && (
        <button
          onClick={() => void updateStatus('sent')}
          disabled={loading !== null}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'sent' ? 'Updating…' : 'Mark as Sent'}
        </button>
      )}
      {canReceive && (
        <button
          onClick={() => void updateStatus('received')}
          disabled={loading !== null}
          className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'received' ? 'Updating…' : 'Mark as Received'}
        </button>
      )}
      {canCancel && (
        <button
          onClick={() => void updateStatus('cancelled')}
          disabled={loading !== null}
          className="border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {loading === 'cancelled' ? 'Updating…' : 'Cancel'}
        </button>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
