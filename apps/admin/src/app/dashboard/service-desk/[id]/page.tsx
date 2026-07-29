import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { ServiceDeskDetailClient } from './_components.js';

export interface ServiceDeskDetail {
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
    resolution?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export default async function ServiceDeskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let item: ServiceDeskDetail | null = null;
  try {
    item = await apiFetch<ServiceDeskDetail>(`/api/v1/service-desk/${id}`, tenantId);
  } catch {
    item = null;
  }

  if (!item) {
    return (
      <div className="px-8 py-8 max-w-4xl">
        <Link href="/dashboard/service-desk" className="text-xs text-gray-400 hover:text-gray-700">
          ← Service Desk
        </Link>
        <p className="text-gray-500 text-sm mt-4">Request not found.</p>
      </div>
    );
  }

  return <ServiceDeskDetailClient item={item} />;
}
