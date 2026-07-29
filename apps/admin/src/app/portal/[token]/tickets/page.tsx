import { use } from 'react';
import { PortalTicketList } from './_components.js';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface PortalTicket {
  id: string;
  code?: string;
  title: string;
  status?: string;
  priority?: string;
  createdAt?: string;
}

export default function TicketsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <TicketsPageInner token={token} />;
}

async function TicketsPageInner({ token }: { token: string }) {
  let tickets: PortalTicket[] = [];
  try {
    const res = await fetch(`${API_BASE}/portal/${encodeURIComponent(token)}/tickets`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as PortalTicket[];
      tickets = Array.isArray(data) ? data : [];
    }
  } catch {
    tickets = [];
  }

  return <PortalTicketList tickets={tickets} token={token} />;
}
