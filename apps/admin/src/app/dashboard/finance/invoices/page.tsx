import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api.js';
import { InvoicesClient } from './_components.js';

export interface Invoice {
  id: string;
  tenantId?: string;
  entityType?: string;
  data: {
    invoiceNumber?: string;
    number?: string;
    clientName?: string;
    customer?: string;
    customer_name?: string;
    customerName?: string;
    clientEmail?: string;
    status?: string;
    subtotal?: number;
    tax?: number;
    total?: number;
    amount?: number;
    dueDate?: string;
    due_date?: string;
    issuedAt?: string;
    issue_date?: string;
    issueDate?: string;
    lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    line_items?: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      amount: number;
    }>;
    notes?: string;
    currency?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

async function fetchInvoices(tenantId: string): Promise<Invoice[]> {
  try {
    const res = await apiFetch<Invoice[] | { invoices: Invoice[] }>(
      '/api/v1/finance/invoices?limit=50',
      tenantId,
    );
    return Array.isArray(res) ? res : ((res as { invoices: Invoice[] }).invoices ?? []);
  } catch {
    return [];
  }
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const tenantId =
    cookieStore.get('veska_tenant')?.value ?? process.env.VESKA_TENANT_ID ?? 'demo-tenant';
  const invoices = await fetchInvoices(tenantId);
  const openNew = params.new === 'true';

  return <InvoicesClient invoices={invoices} tenantId={tenantId} openNew={openNew} />;
}
