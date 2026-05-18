import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { CompanyDetailClient } from './_components.js';

interface CompanyRecord {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface ContactRecord { id: string; data: Record<string, unknown> }
interface DealRecord { id: string; data: Record<string, unknown> }

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let record: CompanyRecord | null = null;
  try {
    record = await apiFetch<CompanyRecord>(`/api/v1/crm/companies/${id}`, TENANT_ID);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-4 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Company not found.</p>
        <Link href="/dashboard/crm/companies" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to companies
        </Link>
      </div>
    );
  }

  const [contacts, deals] = await Promise.all([
    apiFetch<{ data: ContactRecord[] } | ContactRecord[]>(`/api/v1/crm/contacts?companyId=${id}&limit=20`, TENANT_ID)
      .then((res) => (Array.isArray(res) ? res : (res as { data: ContactRecord[] }).data ?? []))
      .catch(() => [] as ContactRecord[]),
    apiFetch<{ data: DealRecord[] } | DealRecord[]>(`/api/v1/crm/deals?companyId=${id}&limit=20`, TENANT_ID)
      .then((res) => (Array.isArray(res) ? res : (res as { data: DealRecord[] }).data ?? []))
      .catch(() => [] as DealRecord[]),
  ]);

  const d = record.data;
  const aiSummary = d['aiSummary'] as string | undefined;

  return (
    <div className="px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard/crm/companies" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          ← Companies
        </Link>
      </div>

      <CompanyDetailClient
        companyId={id}
        data={d}
        aiSummary={aiSummary}
        contacts={contacts}
        deals={deals}
      />
    </div>
  );
}
