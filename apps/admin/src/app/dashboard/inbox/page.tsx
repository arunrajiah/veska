import { apiFetch } from '@/lib/api';
import { InboxClient } from './_client';
import type { AuditEvent } from './_client';

interface AuditResponse {
  events?: AuditEvent[];
  data?: AuditEvent[];
}

const TENANT_ID =
  process.env.VESKA_TENANT_ID ??
  process.env.NEXT_PUBLIC_TENANT_ID ??
  'demo-tenant';

async function fetchEvents(action: string): Promise<AuditEvent[]> {
  try {
    const res = await apiFetch<AuditResponse | AuditEvent[]>(
      `/api/v1/audit?limit=50&action=${action}`,
      TENANT_ID,
    );
    if (Array.isArray(res)) return res;
    return (res as AuditResponse).events ?? (res as AuditResponse).data ?? [];
  } catch {
    return [];
  }
}

export default async function InboxPage() {
  const [inbound, aiResponses] = await Promise.all([
    fetchEvents('message.received'),
    fetchEvents('ai.action.completed'),
  ]);

  // Merge and de-dupe by id, sort newest first
  const seen = new Set<string>();
  const events: AuditEvent[] = [];
  for (const ev of [...inbound, ...aiResponses]) {
    if (!seen.has(ev.id)) {
      seen.add(ev.id);
      events.push(ev);
    }
  }
  events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return <InboxClient events={events} />;
}
