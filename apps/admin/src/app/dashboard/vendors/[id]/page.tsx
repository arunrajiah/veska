import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { VendorDetailPageClient } from './_components.js';

export interface VendorDetail {
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
    status?: string;
    notes?: string;
    totalOrders?: number;
    totalSpend?: number;
  };
}

export interface Contract {
  id: string;
  data: {
    title?: string;
    type?: string;
    status?: string;
    value?: number;
    endDate?: string;
  };
}

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let vendor: VendorDetail | null = null;
  let contracts: Contract[] = [];

  try {
    vendor = await apiFetch<VendorDetail>(`/api/v1/vendors/${id}`, tenantId);
  } catch {
    vendor = null;
  }

  try {
    const res = await apiFetch<{ data: Contract[] } | Contract[]>('/api/v1/contracts?limit=50', tenantId);
    contracts = Array.isArray(res) ? res : (res.data ?? []);
    // Filter for contracts associated with this vendor by partyName
    if (vendor?.data.name) {
      const name = vendor.data.name.toLowerCase();
      contracts = contracts.filter((c) => c.data.title?.toLowerCase().includes(name) || false).slice(0, 5);
    } else {
      contracts = [];
    }
  } catch {
    contracts = [];
  }

  if (!vendor) {
    return (
      <div className="px-8 py-8">
        <p className="text-gray-500 text-sm">Vendor not found.</p>
        <Link href="/dashboard/vendors" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to vendors
        </Link>
      </div>
    );
  }

  return <VendorDetailPageClient vendor={vendor} contracts={contracts} />;
}
