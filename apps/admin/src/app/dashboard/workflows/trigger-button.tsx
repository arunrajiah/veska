'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface TriggerButtonProps {
  workflowId: string;
  tenantId: string;
}

export function TriggerButton({ workflowId, tenantId }: TriggerButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleTrigger = async () => {
    setLoading(true);
    setStatus('idle');
    try {
      const res = await fetch(`${API_BASE}/api/v1/workflows/${workflowId}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': tenantId,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify({ context: {} }),
      });
      if (res.ok) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleTrigger}
      disabled={loading}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
        status === 'success'
          ? 'border-green-300 bg-green-50 text-green-700'
          : status === 'error'
          ? 'border-red-300 bg-red-50 text-red-700'
          : 'border-gray-200 text-gray-600 hover:bg-gray-100'
      } disabled:opacity-50`}
    >
      <Play size={12} />
      {loading ? 'Running…' : status === 'success' ? 'Triggered!' : status === 'error' ? 'Failed' : 'Trigger'}
    </button>
  );
}
