import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { QualifyButton } from './_components.js';

interface LeadRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = params;

  let record: LeadRecord | null = null;
  try {
    record = await apiFetch<LeadRecord>(`/api/v1/entities/Lead/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Lead not found.</p>
        <Link href="/dashboard/crm/leads" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to leads
        </Link>
      </div>
    );
  }

  const d = record.data;
  const status = (d['status'] as string) ?? 'new';

  const STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    qualified: 'bg-green-100 text-green-700',
    unqualified: 'bg-gray-100 text-gray-500',
  };

  const fields: Array<{ label: string; value: string }> = [
    { label: 'Name', value: String(d['name'] ?? '') },
    { label: 'Email', value: String(d['email'] ?? '') },
    { label: 'Phone', value: String(d['phone'] ?? '') },
    { label: 'Company', value: String(d['company'] ?? '') },
    { label: 'Source', value: String(d['source'] ?? '') },
    { label: 'Assigned to', value: String(d['assigned_to'] ?? '') },
  ];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/crm/leads" className="text-xs text-gray-400 hover:text-gray-700">
          ← Leads
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{String(d['name'] ?? 'Lead')}</h1>
          <span
            className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {status}
          </span>
        </div>
        <div className="flex gap-2">
          <QualifyButton leadId={id} tenantId={tenantId} />
          <Link
            href={`/dashboard/crm/leads/${id}/edit`}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
        </div>
        <dl className="divide-y divide-gray-50">
          {fields.map(({ label, value }) => (
            <div key={label} className="px-5 py-3 flex items-baseline gap-4">
              <dt className="text-xs text-gray-500 w-28 shrink-0">{label}</dt>
              <dd className="text-sm text-gray-900">{value || <span className="text-gray-300">—</span>}</dd>
            </div>
          ))}
        </dl>
      </div>

      {d['notes'] && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h2>
          </div>
          <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">{String(d['notes'])}</p>
        </div>
      )}
    </div>
  );
}
