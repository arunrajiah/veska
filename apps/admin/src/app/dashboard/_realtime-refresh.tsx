'use client';

/**
 * Invisible client component that listens for realtime SSE events and
 * triggers a Next.js router refresh so the parent server component
 * re-fetches its data.
 */

import { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents.js';

const DASHBOARD_EVENTS = [
  'invoice.created',
  'invoice.sent',
  'invoice.paid',
  'expense.submitted',
  'expense.approved',
  'ticket.created',
  'ticket.updated',
];

export function DashboardRealtimeRefresh() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useRealtimeEvents(DASHBOARD_EVENTS, refresh);

  // Renders nothing — side-effect only
  return null;
}
