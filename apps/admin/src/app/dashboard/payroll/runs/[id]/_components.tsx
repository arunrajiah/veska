'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface StatusButtonsProps {
  runId: string;
  tenantId: string;
  currentStatus: string;
}

export function StatusButtons({ runId, tenantId, currentStatus }: StatusButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function transition(status: string) {
    setLoading(status);
    try {
      await fetch(`${API_BASE}/api/v1/payroll/runs/${runId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (currentStatus === 'completed' || currentStatus === 'cancelled') {
    return null;
  }

  return (
    <div className="flex gap-2">
      {currentStatus === 'draft' && (
        <button
          onClick={() => void transition('processing')}
          disabled={loading !== null}
          className="text-sm px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors disabled:opacity-50"
        >
          {loading === 'processing' ? 'Processing…' : 'Process'}
        </button>
      )}
      {currentStatus === 'processing' && (
        <button
          onClick={() => void transition('completed')}
          disabled={loading !== null}
          className="text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {loading === 'completed' ? 'Completing…' : 'Complete'}
        </button>
      )}
      <button
        onClick={() => void transition('cancelled')}
        disabled={loading !== null}
        className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {loading === 'cancelled' ? 'Cancelling…' : 'Cancel'}
      </button>
    </div>
  );
}
