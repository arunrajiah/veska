'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface QualifyButtonProps {
  leadId: string;
  tenantId: string;
}

export function QualifyButton({ leadId, tenantId }: QualifyButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleQualify = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/v1/crm/leads/${leadId}/qualify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify({}),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={() => void handleQualify()}
      disabled={loading}
      className="text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
    >
      {loading ? 'Qualifying…' : 'Qualify lead'}
    </button>
  );
}
