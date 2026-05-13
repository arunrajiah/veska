'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ActionButtonsProps {
  expenseId: string;
  tenantId: string;
  currentStatus: string;
}

export function ActionButtons({ expenseId, tenantId, currentStatus }: ActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/api/v1/expenses/${expenseId}`, {
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

  const handleReject = async () => {
    setLoading('reject');
    try {
      await patch({ status: 'rejected', notes: rejectNotes || undefined });
      router.refresh();
    } finally {
      setLoading(null);
      setShowRejectForm(false);
    }
  };

  const handleMarkPaid = async () => {
    setLoading('paid');
    try {
      await patch({ status: 'paid' });
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
        {loading === 'submit' ? 'Submitting…' : 'Submit for approval'}
      </button>
    );
  }

  if (currentStatus === 'submitted') {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => void handleApprove()}
            disabled={loading !== null}
            className="text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading === 'approve' ? 'Approving…' : 'Approve'}
          </button>
          <button
            onClick={() => setShowRejectForm((v) => !v)}
            disabled={loading !== null}
            className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        </div>

        {showRejectForm && (
          <div className="mt-2 w-full max-w-sm">
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={3}
              placeholder="Reason for rejection (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
            />
            <div className="flex gap-2 mt-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectNotes('');
                }}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleReject()}
                disabled={loading !== null}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading === 'reject' ? 'Rejecting…' : 'Confirm reject'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentStatus === 'approved') {
    return (
      <button
        onClick={() => void handleMarkPaid()}
        disabled={loading !== null}
        className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading === 'paid' ? 'Updating…' : 'Mark as paid'}
      </button>
    );
  }

  // rejected or paid — status indicator only
  if (currentStatus === 'rejected') {
    return (
      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-700">
        Rejected
      </span>
    );
  }

  if (currentStatus === 'paid') {
    return (
      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
        Paid
      </span>
    );
  }

  return null;
}
