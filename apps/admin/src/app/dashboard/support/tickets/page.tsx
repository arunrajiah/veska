import { apiFetch } from '@/lib/api.js';
import { TicketsClient } from './_components.js';

export interface Ticket {
  id: string;
  data: {
    ticketNumber?: string;
    subject?: string;
    description?: string;
    status?: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    category?: string;
    contactName?: string;
    contactEmail?: string;
    assignedTo?: string;
    createdAt?: string;
    updatedAt?: string;
    resolution?: string;
  };
}

export default async function TicketsPage() {
  const tenantId = 'demo-tenant';

  let tickets: Ticket[] = [];
  try {
    const res = await apiFetch<{ data: Ticket[] }>('/api/v1/support/tickets?limit=50', tenantId);
    tickets = Array.isArray(res) ? res : (res?.data ?? []);
  } catch {
    tickets = [];
  }

  return <TicketsClient tickets={tickets} />;
}
