import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { AutomationBanner } from './_automation.js';

const STAGES = [
  { key: 'prospecting', label: 'Prospecting', color: 'bg-gray-100 text-gray-600' },
  { key: 'qualification', label: 'Qualification', color: 'bg-blue-100 text-blue-700' },
  { key: 'proposal', label: 'Proposal', color: 'bg-indigo-100 text-indigo-700' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'closed_won', label: 'Won', color: 'bg-green-100 text-green-700' },
  { key: 'closed_lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
];

interface DealRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function formatCurrency(value: unknown): string {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = params;

  let record: DealRecord | null = null;
  try {
    record = await apiFetch<DealRecord>(`/api/v1/entities/Deal/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Deal not found.</p>
        <Link href="/dashboard/crm/deals" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to deals
        </Link>
      </div>
    );
  }

  const d = record.data;
  const stage = (d['stage'] as string) ?? '';
  const dealStatus = (d['status'] as string) ?? '';
  const stageInfo = STAGES.find((s) => s.key === stage);

  const fields: Array<{ label: string; value: string }> = [
    { label: 'Value', value: formatCurrency(d['value']) },
    { label: 'Company', value: String(d['company_id'] ?? '') },
    { label: 'Close date', value: String(d['close_date'] ?? '') },
  ];

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/crm/deals" className="text-xs text-gray-400 hover:text-gray-700">
          ← Deals
        </Link>
      </div>

      <AutomationBanner status={dealStatus} dealId={id} />

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{String(d['name'] ?? 'Deal')}</h1>
          {stageInfo && (
            <span
              className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${stageInfo.color}`}
            >
              {stageInfo.label}
            </span>
          )}
        </div>
        <Link
          href={`/dashboard/crm/deals/${id}/edit`}
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Edit
        </Link>
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
