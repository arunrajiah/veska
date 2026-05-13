'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

interface ApprovalButtonsProps {
  orderId: string;
  tenantId: string;
  currentStatus: string;
  poNumber: string;
}

export default function ApprovalButtons({ orderId, currentStatus }: ApprovalButtonsProps) {
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
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try { msg = JSON.parse(text).error ?? text; } catch { /* ignore */ }
        throw new Error(msg);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(null);
    }
  }

  const isTerminal = currentStatus === 'cancelled' || currentStatus === 'received';

  return (
    <div className="flex flex-col gap-2">
      {currentStatus === 'draft' && (
        <button
          onClick={() => void updateStatus('pending_approval')}
          disabled={loading !== null}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'pending_approval' ? 'Submitting…' : 'Submit for Approval'}
        </button>
      )}

      {currentStatus === 'pending_approval' && (
        <>
          <button
            onClick={() => void updateStatus('approved')}
            disabled={loading !== null}
            className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'approved' ? 'Approving…' : 'Approve'}
          </button>
          <button
            onClick={() => void updateStatus('draft')}
            disabled={loading !== null}
            className="bg-gray-100 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {loading === 'draft' ? 'Recalling…' : 'Recall'}
          </button>
        </>
      )}

      {currentStatus === 'approved' && (
        <button
          onClick={() => void updateStatus('ordered')}
          disabled={loading !== null}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'ordered' ? 'Updating…' : 'Mark Ordered'}
        </button>
      )}

      {currentStatus === 'ordered' && (
        <>
          <button
            onClick={() => void updateStatus('received')}
            disabled={loading !== null}
            className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'received' ? 'Updating…' : 'Mark Received'}
          </button>
          <button
            onClick={() => void updateStatus('partial_received')}
            disabled={loading !== null}
            className="bg-yellow-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
          >
            {loading === 'partial_received' ? 'Updating…' : 'Partial'}
          </button>
        </>
      )}

      {currentStatus === 'partial_received' && (
        <button
          onClick={() => void updateStatus('received')}
          disabled={loading !== null}
          className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'received' ? 'Updating…' : 'Mark Fully Received'}
        </button>
      )}

      {!isTerminal && (
        <button
          onClick={() => void updateStatus('cancelled')}
          disabled={loading !== null}
          className="border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {loading === 'cancelled' ? 'Cancelling…' : 'Cancel'}
        </button>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
