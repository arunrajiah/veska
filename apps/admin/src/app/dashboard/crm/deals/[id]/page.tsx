import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { DealDetailClient } from './_components.js';

interface DealRecord {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let record: DealRecord | null = null;
  try {
    record = await apiFetch<DealRecord>(`/api/v1/crm/deals/${id}`, TENANT_ID);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-4 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Deal not found.</p>
        <Link href="/dashboard/crm/deals" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to deals
        </Link>
      </div>
    );
  }

  const d = record.data;
  const stage = String(d['stage'] ?? d['stageId'] ?? '');
  const aiSummary = d['aiSummary'] as string | undefined;

  return (
    <div className="px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard/crm/deals" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          ← Deals
        </Link>
      </div>

      <DealDetailClient
        dealId={id}
        data={d}
        stage={stage}
        aiSummary={aiSummary}
      />
    </div>
  );
}
