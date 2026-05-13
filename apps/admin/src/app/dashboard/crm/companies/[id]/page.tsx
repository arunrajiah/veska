import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { EnrichButton } from './_components.js';

interface CompanyRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = params;

  let record: CompanyRecord | null = null;
  try {
    record = await apiFetch<CompanyRecord>(`/api/v1/entities/Company/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Company not found.</p>
        <Link href="/dashboard/crm/companies" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to companies
        </Link>
      </div>
    );
  }

  const d = record.data;
  const name = String(d['name'] ?? 'Company');

  const fields: Array<{ label: string; value: string }> = [
    { label: 'Domain', value: String(d['domain'] ?? '') },
    { label: 'Industry', value: String(d['industry'] ?? '') },
    { label: 'Employees', value: d['employee_count'] != null ? String(d['employee_count']) : '' },
  ];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/crm/companies" className="text-xs text-gray-400 hover:text-gray-700">
          ← Companies
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{name}</h1>
          {d['industry'] && (
            <p className="text-sm text-gray-500 mt-0.5">{String(d['industry'])}</p>
          )}
        </div>
        <div className="flex gap-2">
          <EnrichButton companyId={id} tenantId={tenantId} />
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
