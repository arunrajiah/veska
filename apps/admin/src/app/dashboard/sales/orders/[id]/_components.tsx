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
      const res = await fetch(`${API_BASE}/api/v1/sales/orders/${orderId}`, {
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

  const canConfirm = currentStatus === 'draft';
  const canPick = currentStatus === 'confirmed';
  const canShip = currentStatus === 'picking';
  const canDeliver = currentStatus === 'shipped';
  const canCancel = currentStatus !== 'cancelled' && currentStatus !== 'delivered';

  return (
    <div className="flex flex-col gap-2">
      {canConfirm && (
        <button
          onClick={() => void updateStatus('confirmed')}
          disabled={loading !== null}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'confirmed' ? 'Updating…' : 'Confirm Order'}
        </button>
      )}
      {canPick && (
        <button
          onClick={() => void updateStatus('picking')}
          disabled={loading !== null}
          className="bg-yellow-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
        >
          {loading === 'picking' ? 'Updating…' : 'Start Picking'}
        </button>
      )}
      {canShip && (
        <button
          onClick={() => void updateStatus('shipped')}
          disabled={loading !== null}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'shipped' ? 'Updating…' : 'Mark Shipped'}
        </button>
      )}
      {canDeliver && (
        <button
          onClick={() => void updateStatus('delivered')}
          disabled={loading !== null}
          className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'delivered' ? 'Updating…' : 'Mark Delivered'}
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
