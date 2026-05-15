import { apiFetch } from '@/lib/api.js';
import { TicketDetailClient } from './_components.js';

export interface TicketComment {
  id: string;
  body?: string;
  author?: string;
  isInternal?: boolean;
  createdAt?: string;
}

export interface TicketDetail {
  id: string;
  number?: string;
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  requestedBy?: string;
  assignedTo?: string;
  slaHours?: number;
  slaBreached?: boolean;
  slaDueAt?: string;
  createdAt?: string;
  updatedAt?: string;
  comments?: TicketComment[];
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let ticket: TicketDetail | null = null;

  try {
    ticket = await apiFetch<TicketDetail>(`/service-desk/tickets/${id}`, tenantId);
  } catch {
    ticket = null;
  }

  if (!ticket) {
    return (
      <div className="px-8 py-16 text-center">
        <p className="text-gray-500">Ticket not found.</p>
      </div>
    );
  }

  return <TicketDetailClient ticket={ticket} />;
}
