import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { TicketDetailClient } from './_components.js';

export interface TicketDetail {
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

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let ticket: TicketDetail | null = null;
  try {
    ticket = await apiFetch<TicketDetail>(`/api/v1/support/tickets/${id}`, tenantId);
  } catch {
    ticket = null;
  }

  if (!ticket) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <Link
          href="/dashboard/support/tickets"
          className="text-xs text-gray-400 hover:text-gray-700"
        >
          ← Tickets
        </Link>
        <p className="text-gray-500 text-sm mt-4">Ticket not found.</p>
      </div>
    );
  }

  return <TicketDetailClient ticket={ticket} />;
}
