'use client';
import { useEffect, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type RealtimeEvent = {
  type: string;
  payload: Record<string, unknown>;
};

type Handler = (event: RealtimeEvent) => void;

export function useRealtimeEvents(
  onEvent: Handler,
  options?: { tenantId?: string; enabled?: boolean },
) {
  const { tenantId = 'demo-tenant', enabled = true } = options ?? {};
  const esRef = useRef<EventSource | null>(null);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const url = `${API_BASE}/api/v1/events/stream`;
    const es = new EventSource(url, { withCredentials: false });
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as RealtimeEvent;
        if (event.type !== 'connected') handlerRef.current(event);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
      // Reconnect after 5s
      setTimeout(() => {
        esRef.current = null;
      }, 5_000);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [enabled, tenantId]);
}
