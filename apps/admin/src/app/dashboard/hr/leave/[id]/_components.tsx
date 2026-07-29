'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ActionButtonsProps {
  leaveId: string;
  tenantId: string;
  currentStatus: string;
}

export function ApproveButton({ leaveId, tenantId, currentStatus }: ActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await fetch(`/api/veska/hr/leave/${leaveId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === 'approved') return null;

  return (
    <button
      onClick={() => void handleApprove()}
      disabled={loading}
      className="text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
    >
      {loading ? 'Approving…' : 'Approve'}
    </button>
  );
}

export function RejectButton({ leaveId, tenantId, currentStatus }: ActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    setLoading(true);
    try {
      await fetch(`/api/veska/hr/leave/${leaveId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify({ status: 'rejected' }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === 'rejected') return null;

  return (
    <button
      onClick={() => void handleReject()}
      disabled={loading}
      className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {loading ? 'Rejecting…' : 'Reject'}
    </button>
  );
}
