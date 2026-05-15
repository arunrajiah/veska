import { apiFetch } from '@/lib/api.js';
import { VendorsClient } from './_components.js';

export interface Vendor {
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

export interface VendorSummary {
  total?: number;
  active?: number;
  avgRating?: number;
  outstandingInvoices?: number;
  byCategory?: Record<string, number>;
  byStatus?: Record<string, number>;
}

export default async function VendorsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let vendors: Vendor[] = [];
  let summary: VendorSummary = {};

  try {
    const res = await apiFetch<Vendor[]>('/vendors', tenantId);
    vendors = Array.isArray(res) ? res : [];
  } catch {
    vendors = [];
  }

  try {
    const res = await apiFetch<VendorSummary>('/vendors/summary', tenantId);
    summary = res ?? {};
  } catch {
    summary = {};
  }

  return <VendorsClient vendors={vendors} summary={summary} />;
}
