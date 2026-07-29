'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';
const IDENTITY_ID = process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin';

function fmtHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': IDENTITY_ID,
  };
}

interface StatusDropdownProps {
  orderId: string;
  currentStatus: string;
}

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;

export function StatusDropdown({ orderId, currentStatus }: StatusDropdownProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleChange(newStatus: string) {
    if (newStatus === status) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/veska/sales/orders/${orderId}`, {
        method: 'PATCH',
        headers: fmtHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus(newStatus);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">Update Status</label>
      <select
        value={status}
        onChange={(e) => void handleChange(e.target.value)}
        disabled={loading}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50 capitalize"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
        ))}
      </select>
      {loading && <p className="text-xs text-gray-400 mt-1">Updating…</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
