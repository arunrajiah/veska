import { apiFetch } from '@/lib/api.js';
import { VendorDetailClient } from './_components.js';

export interface VendorDetail {
  id: string;
  code?: string;
  name?: string;
  category?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  currency?: string;
  paymentTerms?: number;
  taxId?: string;
  notes?: string;
  tags?: string[];
  status?: string;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorContact {
  id: string;
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface VendorRating {
  id: string;
  category?: string;
  score?: number;
  comment?: string;
  createdAt?: string;
}

export interface VendorInvoice {
  id: string;
  number?: string;
  amount?: number;
  currency?: string;
  status?: string;
  dueDate?: string;
}

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let vendor: VendorDetail | null = null;

  try {
    vendor = await apiFetch<VendorDetail>(`/vendors/${id}`, tenantId);
  } catch {
    vendor = null;
  }

  if (!vendor) {
    return (
      <div className="px-8 py-16 text-center">
        <p className="text-gray-500">Vendor not found.</p>
      </div>
    );
  }

  return <VendorDetailClient vendor={vendor} />;
}
