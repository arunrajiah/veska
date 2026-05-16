'use client';
import { useEffect, useRef, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type RealtimeEvent = {
  type: string;
  payload: Record<string, unknown>;
};

type Handler = (event: RealtimeEvent) => void;

// ── Overload 1: original API — onEvent handler, optional options ──────────────
export function useRealtimeEvents(
  onEvent: Handler,
  options?: { tenantId?: string; enabled?: boolean },
): void;

// ── Overload 2: new API — eventType filter(s), handler, optional deps ─────────
export function useRealtimeEvents(
  eventType: string | string[],
  handler: (data: RealtimeEvent['payload']) => void,
  deps?: unknown[],
): void;

// ── Implementation ────────────────────────────────────────────────────────────
export function useRealtimeEvents(
  first: Handler | string | string[],
  second?: Handler | { tenantId?: string; enabled?: boolean } | ((data: RealtimeEvent['payload']) => void),
  _deps?: unknown[],
): void {
  // Determine which overload is being used
  const isFilteredMode =
    typeof first === 'string' ||
    (Array.isArray(first) && first.every((x) => typeof x === 'string'));

  const handlerRef = useRef<Handler | ((data: RealtimeEvent['payload']) => void)>(
    isFilteredMode
      ? (second as (data: RealtimeEvent['payload']) => void) ?? (() => {})
      : (first as Handler),
  );

  // Keep handler ref fresh without re-subscribing
  useEffect(() => {
    if (isFilteredMode) {
      handlerRef.current = (second as (data: RealtimeEvent['payload']) => void) ?? (() => {});
    } else {
      handlerRef.current = first as Handler;
    }
  });

  const options = isFilteredMode ? undefined : (second as { tenantId?: string; enabled?: boolean } | undefined);
  const enabled = options?.enabled ?? true;

  // Normalise event-type filter to an array (or null = accept all)
  const filterTypes: string[] | null = isFilteredMode
    ? Array.isArray(first)
      ? first
      : [first as string]
    : null;
  const filterKey = filterTypes ? filterTypes.join(',') : '__all__';

  const retryDelayRef = useRef(1_000); // starts at 1 s
  const esRef = useRef<EventSource | null>(null);
  const abortRef = useRef(false);

  const connect = useCallback(() => {
    if (abortRef.current || !enabled) return;

    const url = `${API_BASE}/api/v1/events/stream`;
    const es = new EventSource(url, { withCredentials: false });
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as RealtimeEvent;
        if (event.type === 'connected') return; // skip initial ping

        if (filterTypes === null) {
          // Original API: pass the full event
          (handlerRef.current as Handler)(event);
        } else {
          // Filtered API: only call handler for matching event types
          if (filterTypes.includes(event.type)) {
            (handlerRef.current as (data: RealtimeEvent['payload']) => void)(event.payload);
          }
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onopen = () => {
      // Reset backoff on successful connection
      retryDelayRef.current = 1_000;
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      if (abortRef.current) return;

      // Exponential backoff: 1s → 2s → 4s → … → max 30s
      const delay = retryDelayRef.current;
      retryDelayRef.current = Math.min(delay * 2, 30_000);
      setTimeout(connect, delay);
    };
  }, [enabled, filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled) return;
    abortRef.current = false;
    connect();

    return () => {
      abortRef.current = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect, enabled]);
}
