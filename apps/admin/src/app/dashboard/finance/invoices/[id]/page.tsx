import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { InvoiceDetailClient } from './_components.js';

export interface InvoiceRecord {
  id: string;
  tenantId?: string;
  entityType?: string;
  data: {
    invoiceNumber?: string;
    number?: string;
    clientName?: string;
    customer?: string;
    customer_name?: string;
    clientEmail?: string;
    status?: string;
    subtotal?: number;
    tax?: number;
    total?: number;
    dueDate?: string;
    due_date?: string;
    issuedAt?: string;
    issue_date?: string;
    lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    line_items?: Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
    notes?: string;
    currency?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';
  const { id } = await params;

  let record: InvoiceRecord | null = null;
  try {
    record = await apiFetch<InvoiceRecord>(`/api/v1/finance/invoices/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8 max-w-4xl">
        <p className="text-gray-500 text-sm">Invoice not found.</p>
        <Link
          href="/dashboard/finance/invoices"
          className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to invoices
        </Link>
      </div>
    );
  }

  return <InvoiceDetailClient record={record} tenantId={tenantId} />;
}
