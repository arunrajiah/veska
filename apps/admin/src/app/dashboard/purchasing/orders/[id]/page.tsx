import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { OrderDetailClient } from './_components.js';
import type { PurchaseOrder } from './_components.js';

interface GRN {
  id: string;
  data: {
    grnNumber?: string;
    poId?: string;
    status?: string;
    receivedDate?: string;
    items?: Array<{ description: string; orderedQty: number; receivedQty: number }>;
  };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let order: PurchaseOrder | null = null;
  let grns: GRN[] = [];

  try {
    order = await apiFetch<PurchaseOrder>(`/api/v1/purchasing/orders/${id}`, tenantId);
  } catch {
    order = null;
  }

  try {
    const res = await apiFetch<{ data: GRN[] } | GRN[]>(`/api/v1/grn?limit=50`, tenantId);
    const all = Array.isArray(res) ? res : (res.data ?? []);
    grns = all.filter((g) => g.data.poId === id);
  } catch {
    grns = [];
  }

  if (!order) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500">Purchase order not found.</p>
        <Link href="/dashboard/purchasing/orders" className="text-sm text-gray-600 hover:text-gray-900 mt-2 inline-block">
          ← Back to orders
        </Link>
      </div>
    );
  }

  return <OrderDetailClient order={order} grns={grns} />;
}
