import { apiFetch } from '@/lib/api.js';
import Link from 'next/link';
import { GitBranch, Plus, Pencil, Trash2 } from 'lucide-react';

interface ApprovalStep {
  order: number;
  label: string;
  approverRole: string;
}

interface ApprovalChain {
  id: string;
  name: string;
  entityType: string;
  conditionField?: string | null;
  conditionOp?: string;
  conditionValue?: number | null;
  steps: ApprovalStep[];
  enabled: boolean;
  createdAt: string;
}

async function fetchChains(): Promise<ApprovalChain[]> {
  try {
    const data = await apiFetch<ApprovalChain[] | { data?: ApprovalChain[] }>('/api/v1/approval-chains', '');
    return Array.isArray(data) ? data : (data.data ?? []);
  } catch {
    return [];
  }
}

function entityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    expense: 'Expense',
    invoice: 'Invoice',
    purchase_order: 'Purchase Order',
  };
  return labels[type.toLowerCase()] ?? type;
}

function entityTypeColor(type: string): string {
  const colors: Record<string, string> = {
    expense: 'bg-orange-100 text-orange-700',
    invoice: 'bg-blue-100 text-blue-700',
    purchase_order: 'bg-purple-100 text-purple-700',
  };
  return colors[type.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
}

function conditionDescription(chain: ApprovalChain): string {
  if (!chain.conditionField || chain.conditionOp === 'always') {
    return 'Always triggers';
  }
  if (chain.conditionOp === 'gt' && chain.conditionField === 'amount') {
    return `When amount > ${chain.conditionValue?.toLocaleString() ?? '—'}`;
  }
  return `${chain.conditionField} ${chain.conditionOp} ${chain.conditionValue}`;
}

function stepsDescription(steps: ApprovalStep[]): string {
  if (!steps || steps.length === 0) return 'No steps configured';
  const labels = steps.map((s) => s.label);
  return `${steps.length} step${steps.length === 1 ? '' : 's'}: ${labels.join(' → ')}`;
}

export default async function ApprovalsSettingsPage() {
  const chains = await fetchChains();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <GitBranch size={24} className="text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Approval Chains</h1>
          </div>
          <p className="text-sm text-gray-500 ml-9">
            Configure when and how approvals are required.
          </p>
        </div>
        <Link
          href="/dashboard/settings/approvals/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Add Chain
        </Link>
      </div>

      {/* Chains list */}
      {chains.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-gray-200">
          <GitBranch size={40} className="mb-3 text-gray-300" />
          <p className="text-base font-medium text-gray-600 mb-1">No approval chains yet</p>
          <p className="text-sm text-center max-w-xs">
            Approval chains define the sequence of approvers required before an action is finalized.
            Create your first chain to get started.
          </p>
          <Link
            href="/dashboard/settings/approvals/new"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} />
            Add Chain
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {chains.map((chain) => (
            <div
              key={chain.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-gray-900">{chain.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${entityTypeColor(chain.entityType)}`}
                    >
                      {entityTypeLabel(chain.entityType)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        chain.enabled ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${chain.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                      />
                      {chain.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-600">Condition:</span>{' '}
                      {conditionDescription(chain)}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-600">Steps:</span>{' '}
                      {stepsDescription(chain.steps)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/dashboard/settings/approvals/${chain.id}/edit` as any}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Pencil size={13} />
                    Edit
                  </Link>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-100 text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
