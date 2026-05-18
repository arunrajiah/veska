import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { ContactDetailClient } from './_components.js';

interface ContactRecord {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface DealRecord {
  id: string;
  data: Record<string, unknown>;
}

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let record: ContactRecord | null = null;
  try {
    record = await apiFetch<ContactRecord>(`/api/v1/crm/contacts/${id}`, TENANT_ID);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-4 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Contact not found.</p>
        <Link href="/dashboard/crm/contacts" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to contacts
        </Link>
      </div>
    );
  }

  let deals: DealRecord[] = [];
  try {
    const res = await apiFetch<{ data: DealRecord[] } | DealRecord[]>(
      `/api/v1/crm/deals?contactId=${id}&limit=20`,
      TENANT_ID,
    );
    deals = Array.isArray(res) ? res : (res as { data: DealRecord[] }).data ?? [];
  } catch {
    deals = [];
  }

  const d = record.data;
  const aiSummary = d['aiSummary'] as string | undefined;

  return (
    <div className="px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard/crm/contacts" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          ← Contacts
        </Link>
      </div>

      <ContactDetailClient
        contactId={id}
        data={d}
        aiSummary={aiSummary}
        deals={deals}
      />
    </div>
  );
}
