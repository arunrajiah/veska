'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

export default function MarkAllButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markAll() {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': TENANT_ID,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
      });
      router.refresh();
    } catch {
      // Silently ignore errors
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void markAll()}
      disabled={loading}
      className="text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Marking…' : 'Mark all as read'}
    </button>
  );
}
