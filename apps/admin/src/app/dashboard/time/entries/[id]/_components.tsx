'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface StatusButtonsProps {
  entryId: string;
  tenantId: string;
  currentStatus: string;
}

export function StatusButtons({ entryId, tenantId, currentStatus }: StatusButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/api/v1/time/entries/${entryId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Veska-Tenant-Id': tenantId,
        'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Request failed: ${text}`);
    }
  };

  const handleSubmit = async () => {
    setLoading('submit');
    try {
      await patch({ status: 'submitted' });
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const handleApprove = async () => {
    setLoading('approve');
    try {
      await patch({ status: 'approved' });
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const handleRecall = async () => {
    setLoading('recall');
    try {
      await patch({ status: 'draft' });
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  if (currentStatus === 'draft') {
    return (
      <button
        onClick={() => void handleSubmit()}
        disabled={loading !== null}
        className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {loading === 'submit' ? 'Submitting…' : 'Submit'}
      </button>
    );
  }

  if (currentStatus === 'submitted') {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => void handleApprove()}
          disabled={loading !== null}
          className="text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {loading === 'approve' ? 'Approving…' : 'Approve'}
        </button>
        <button
          onClick={() => void handleRecall()}
          disabled={loading !== null}
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading === 'recall' ? 'Recalling…' : 'Recall'}
        </button>
      </div>
    );
  }

  if (currentStatus === 'approved') {
    return (
      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700">
        Approved
      </span>
    );
  }

  return null;
}
