'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';


interface DeleteButtonProps {
  budgetId: string;
  tenantId: string;
}

export function DeleteButton({ budgetId, tenantId }: DeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/veska/budgets/${budgetId}`, {
        method: 'DELETE',
        headers: {
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to delete budget: ${text}`);
      }

      router.push('/dashboard/budgets');
    } catch (err) {
      console.error(err);
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Delete this budget?</span>
        <button
          onClick={() => void handleDelete()}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Deleting…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
    >
      Delete
    </button>
  );
}
