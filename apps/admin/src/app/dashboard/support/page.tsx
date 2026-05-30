import { apiFetch } from '@/lib/api.js';
import { SupportClient } from './_client.js';

export interface Ticket {
  id: string;
  data: {
    ticketNumber?: string;
    subject?: string;
    description?: string;
    status?: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
    priority?: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
    channel?: string;
    contactName?: string;
    contactEmail?: string;
    assignedTo?: string;
    assignee_id?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export default async function SupportPage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let tickets: Ticket[] = [];
  try {
    const res = await apiFetch<Ticket[] | { data: Ticket[] }>(
      '/api/v1/support/tickets?limit=50',
      tenantId,
    );
    tickets = Array.isArray(res) ? res : (res?.data ?? []);
  } catch {
    tickets = [];
  }

  return <SupportClient tickets={tickets} />;
}
