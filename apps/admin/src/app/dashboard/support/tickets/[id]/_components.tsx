'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ReplyFormProps {
  ticketId: string;
}

export function ReplyForm({ ticketId }: ReplyFormProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Failed to send reply');
        return;
      }
      setMessage('');
      router.refresh();
    } catch {
      setError('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write a reply…"
        rows={4}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !message.trim()}
        className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Send reply'}
      </button>
    </form>
  );
}

interface StatusButtonsProps {
  ticketId: string;
  tenantId: string;
  currentStatus: string;
}

const STATUS_TRANSITIONS = [
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting_customer', label: 'Waiting customer' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
] as const;

export function StatusButtons({ ticketId, tenantId, currentStatus }: StatusButtonsProps) {
  const [loading, setLoading] = useState('');
  const router = useRouter();

  const transition = async (status: string) => {
    setLoading(status);
    try {
      await fetch(`${API_BASE}/api/v1/support/tickets/${ticketId}/status`, {
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
      setLoading('');
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_TRANSITIONS.filter((t) => t.value !== currentStatus).map((t) => (
        <button
          key={t.value}
          onClick={() => void transition(t.value)}
          disabled={loading === t.value}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading === t.value ? '…' : `Move to: ${t.label}`}
        </button>
      ))}
    </div>
  );
}
