import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { LeadDetailClient } from './_components.js';

interface LeadRecord {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const TENANT_ID = 'demo-tenant';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let record: LeadRecord | null = null;
  try {
    record = await apiFetch<LeadRecord>(`/api/v1/crm/leads/${id}`, TENANT_ID);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-4 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Lead not found.</p>
        <Link href="/dashboard/crm/leads" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to leads
        </Link>
      </div>
    );
  }

  const d = record.data;
  const status = (d['status'] as string) ?? 'new';
  const aiSummary = d['aiSummary'] as string | undefined;

  return (
    <div className="px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard/crm/leads" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          ← Leads
        </Link>
      </div>

      <LeadDetailClient
        leadId={id}
        data={d}
        status={status}
        aiSummary={aiSummary}
        createdAt={record.createdAt}
        updatedAt={record.updatedAt}
      />
    </div>
  );
}
