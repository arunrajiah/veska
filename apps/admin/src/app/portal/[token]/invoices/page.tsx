import { use } from 'react';
import { PortalInvoiceList } from './_components.js';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface PortalInvoice {
  id: string;
  invoiceNumber?: string;
  number?: string;
  issuedAt?: string;
  dueDate?: string;
  total?: number;
  currency?: string;
  status?: string;
}

export default function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { token } = use(params);
  const sp = use(searchParams);
  return <InvoicesPageInner token={token} {...(sp['payment'] !== undefined && { payment: sp['payment'] })} />;
}

async function InvoicesPageInner({ token, payment }: { token: string; payment?: string }) {
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

  return <PortalInvoiceList invoices={invoices} token={token} {...(payment !== undefined && { payment })} />;
}
