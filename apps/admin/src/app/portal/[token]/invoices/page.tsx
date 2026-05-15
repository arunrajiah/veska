import { use } from 'react';
import { PortalInvoiceList } from './_components.js';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface PortalInvoice {
  id: string;
  number?: string;
  date?: string;
  dueDate?: string;
  amount?: number;
  currency?: string;
  status?: 'paid' | 'overdue' | 'pending' | 'draft';
}

export default function InvoicesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <InvoicesPageInner token={token} />;
}

async function InvoicesPageInner({ token }: { token: string }) {
  let invoices: PortalInvoice[] = [];
  try {
    const res = await fetch(`${API_BASE}/portal/${encodeURIComponent(token)}/invoices`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as PortalInvoice[];
      invoices = Array.isArray(data) ? data : [];
    }
  } catch {
    invoices = [];
  }

  return <PortalInvoiceList invoices={invoices} token={token} />;
}
