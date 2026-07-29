import { apiFetch } from '@/lib/api.js';
import { ServiceDeskListClient } from './_components.js';

export interface ServiceDeskItem {
  id: string;
  data: {
    requestNumber?: string;
    title?: string;
    description?: string;
    type?: 'incident' | 'service_request' | 'change' | 'problem';
    status?: 'new' | 'assigned' | 'in_progress' | 'pending' | 'resolved' | 'closed';
    priority?: string;
    requestorName?: string;
    assignedTo?: string;
    sla?: string;
    dueBy?: string;
  };
}

export default async function ServiceDeskPage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let items: ServiceDeskItem[] = [];
  try {
    const res = await apiFetch<{ data: ServiceDeskItem[] }>(
      '/api/v1/service-desk?limit=50',
      tenantId,
    );
    items = Array.isArray(res) ? res : (res?.data ?? []);
  } catch {
    items = [];
  }

  return <ServiceDeskListClient items={items} />;
}
