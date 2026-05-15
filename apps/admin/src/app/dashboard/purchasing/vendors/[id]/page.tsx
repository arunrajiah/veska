import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { PurchasingVendorDetailClient } from './_components.js';
import type { PurchasingVendor, PurchaseOrder } from './_components.js';

export default async function PurchasingVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = 'demo-tenant';

  let vendor: PurchasingVendor | null = null;
  let orders: PurchaseOrder[] = [];

  try {
    vendor = await apiFetch<PurchasingVendor>(`/api/v1/purchasing/vendors/${id}`, tenantId);
  } catch {
    vendor = null;
  }

  try {
    const res = await apiFetch<{ data: PurchaseOrder[] } | PurchaseOrder[]>('/api/v1/purchasing/orders?limit=50', tenantId);
    const all = Array.isArray(res) ? res : (res.data ?? []);
    orders = all.filter((o) => o.data.vendorId === id);
  } catch {
    orders = [];
  }

  if (!vendor) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500">Vendor not found.</p>
        <Link href="/dashboard/purchasing/vendors" className="text-sm text-gray-600 hover:text-gray-900 mt-2 inline-block">
          ← Back to vendors
        </Link>
      </div>
    );
  }

  return <PurchasingVendorDetailClient vendor={vendor} orders={orders} />;
}
