import Link from 'next/link';
import { Plus } from 'lucide-react';

const STAGES = [
  { key: 'prospecting', label: 'Prospecting', color: 'bg-gray-100' },
  { key: 'qualification', label: 'Qualification', color: 'bg-blue-50' },
  { key: 'proposal', label: 'Proposal', color: 'bg-indigo-50' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-yellow-50' },
  { key: 'closed_won', label: 'Won', color: 'bg-green-50' },
  { key: 'closed_lost', label: 'Lost', color: 'bg-red-50' },
];

// Stub pipeline data
const STUB_PIPELINE: Record<string, Array<{ id: string; name: string; company: string; value: string; closeDate: string }>> = {
  prospecting: [
    { id: '1', name: 'Website Redesign', company: 'Nexus Labs', value: '$8,000', closeDate: '2026-06-30' },
  ],
  qualification: [
    { id: '2', name: 'Annual Support Contract', company: 'BrightPath', value: '$24,000', closeDate: '2026-06-15' },
  ],
  proposal: [
    { id: '3', name: 'ERP Integration', company: 'TechVault', value: '$45,000', closeDate: '2026-05-31' },
  ],
  negotiation: [],
  closed_won: [
    { id: '4', name: 'Starter Onboarding', company: 'GreenLeaf', value: '$3,500', closeDate: '2026-05-01' },
  ],
  closed_lost: [],
};

export default function DealsPage() {
  const totalPipeline = Object.values(STUB_PIPELINE)
    .flat()
    .filter((d) => !['closed_won', 'closed_lost'].includes(
      STAGES.find((s) => Object.values(STUB_PIPELINE).some((deals) => deals.find((x) => x.id === d.id)))?.key ?? ''
    ))
    .reduce((sum, d) => sum + parseFloat(d.value.replace(/[$,]/g, '')), 0);

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
          const deals = STUB_PIPELINE[stage.key] ?? [];
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
                    <p className="text-sm font-medium text-gray-900 mb-1">{deal.name}</p>
                    <p className="text-xs text-gray-500 mb-2">{deal.company}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">{deal.value}</span>
                      <span className="text-xs text-gray-400">{deal.closeDate}</span>
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
