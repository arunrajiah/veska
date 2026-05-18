import { apiFetch } from '@/lib/api.js';
import { PurchasingVendorsClient } from './_components.js';
import type { PurchasingVendor } from './_components.js';

export default async function PurchasingVendorsPage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let vendors: PurchasingVendor[] = [];
  try {
    const res = await apiFetch<{ data: PurchasingVendor[] } | PurchasingVendor[]>('/api/v1/purchasing/vendors?limit=50', tenantId);
    vendors = Array.isArray(res) ? res : (res.data ?? []);
  } catch {
    vendors = [];
  }

  return <PurchasingVendorsClient vendors={vendors} />;
}
