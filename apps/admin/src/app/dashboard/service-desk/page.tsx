import { apiFetch } from '@/lib/api.js';
import { ServiceDeskClient } from './_components.js';

export interface Ticket {
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
}

export interface ServiceDeskSummary {
  open?: number;
  inProgress?: number;
  resolvedToday?: number;
  slaBreached?: number;
}

export default async function ServiceDeskPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let tickets: Ticket[] = [];
  let summary: ServiceDeskSummary = {};

  try {
    const res = await apiFetch<Ticket[]>('/service-desk/tickets', tenantId);
    tickets = Array.isArray(res) ? res : [];
  } catch {
    tickets = [];
  }

  try {
    const res = await apiFetch<ServiceDeskSummary>('/service-desk/summary', tenantId);
    summary = res ?? {};
  } catch {
    summary = {};
  }

  return <ServiceDeskClient tickets={tickets} summary={summary} />;
}
