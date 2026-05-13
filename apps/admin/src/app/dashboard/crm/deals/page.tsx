import Link from 'next/link';
import { Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

const STAGES = [
  { key: 'prospecting', label: 'Prospecting', color: 'bg-gray-100' },
  { key: 'qualification', label: 'Qualification', color: 'bg-blue-50' },
  { key: 'proposal', label: 'Proposal', color: 'bg-indigo-50' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-yellow-50' },
  { key: 'closed_won', label: 'Won', color: 'bg-green-50' },
  { key: 'closed_lost', label: 'Lost', color: 'bg-red-50' },
];

interface DealData {
  name?: string;
  company_id?: string;
  value?: number;
  close_date?: string;
}

interface Deal {
  id: string;
  data: DealData;
}

interface StageData {
  deals: Deal[];
  count: number;
  totalValue: number;
}

type PipelineResponse = Record<string, StageData>;

function formatCurrency(value: number | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default async function DealsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let pipeline: PipelineResponse = {};
  try {
    pipeline = await apiFetch<PipelineResponse>('/api/v1/crm/pipeline', tenantId);
  } catch {
    pipeline = {};
  }

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Deals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pipeline overview</p>
        </div>
        <Link
          href="/dashboard/crm/deals/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New deal
        </Link>
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageData = pipeline[stage.key];
          const deals: Deal[] = stageData?.deals ?? [];
          return (
            <div key={stage.key} className="flex-shrink-0 w-60">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-medium text-gray-600">{stage.label}</span>
                <span className="text-xs text-gray-400">{deals.length}</span>
              </div>
              <div className={`rounded-xl p-2 min-h-32 space-y-2 ${stage.color}`}>
                {deals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/dashboard/crm/deals/${deal.id}`}
                    className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {deal.data.name ?? '(Unnamed)'}
                    </p>
                    {deal.data.company_id && (
                      <p className="text-xs text-gray-500 mb-2">
                        <span className="text-gray-400">Company: </span>
                        {deal.data.company_id}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(deal.data.value)}
                      </span>
                      {deal.data.close_date && (
                        <span className="text-xs text-gray-400">{deal.data.close_date}</span>
                      )}
                    </div>
                  </Link>
                ))}
                {deals.length === 0 && (
                  <p className="text-xs text-gray-400 text-center pt-4">Empty</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
