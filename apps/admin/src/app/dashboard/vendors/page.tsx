import { apiFetch } from '@/lib/api.js';
import { VendorsPageClient } from './_components.js';

export interface Vendor {
  id: string;
  data: {
    name?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    category?: string;
    paymentTerms?: string;
    rating?: number;
    status?: 'active' | 'inactive' | 'blocked';
    notes?: string;
    totalOrders?: number;
    totalSpend?: number;
  };
}

export default async function VendorsPage() {
  const tenantId = 'demo-tenant';

  let vendors: Vendor[] = [];
  try {
    const res = await apiFetch<{ data: Vendor[] } | Vendor[]>('/api/v1/vendors?limit=50', tenantId);
    vendors = Array.isArray(res) ? res : (res.data ?? []);
  } catch {
    vendors = [];
  }

  return <VendorsPageClient vendors={vendors} />;
}
