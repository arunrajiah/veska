'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface EnrichButtonProps {
  companyId: string;
  tenantId: string;
}

export function EnrichButton({ companyId, tenantId }: EnrichButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  const handleEnrich = async () => {
    setState('loading');
    try {
      await fetch(`${API_BASE}/api/v1/entities/Company/${companyId}/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify({}),
      });
      setState('done');
    } catch {
      setState('idle');
    }
  };

  return (
    <button
      onClick={() => void handleEnrich()}
      disabled={state !== 'idle'}
      className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
    >
      {state === 'loading' ? 'Enriching…' : state === 'done' ? 'Enriched!' : 'Enrich with AI'}
    </button>
  );
}
