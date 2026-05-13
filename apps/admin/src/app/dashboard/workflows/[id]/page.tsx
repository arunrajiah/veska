import Link from 'next/link';
import { GitBranch } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';
import { TriggerButton } from '../trigger-button.js';

interface WorkflowStep {
  id: string;
  label: string;
  action: { type: string; [key: string]: unknown };
  onSuccess?: string;
  onFailure?: string;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  trigger: { type: string; [key: string]: unknown };
  steps: WorkflowStep[];
  entryStep: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  recentRuns?: WorkflowRun[];
}

interface WorkflowRun {
  id: string;
  workflowId: string;
  status: string;
  currentStep?: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

const RUN_STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  running: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  awaiting_approval: 'bg-indigo-100 text-indigo-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const TRIGGER_LABELS: Record<string, string> = {
  inbound_message: 'Inbound message',
  'entity.created': 'Record created',
  'entity.updated': 'Record updated',
  'entity.deleted': 'Record deleted',
  schedule: 'Scheduled',
  manual: 'Manual',
};

const ACTION_LABELS: Record<string, string> = {
  send_message: 'Send message',
  update_entity: 'Update record',
  create_entity: 'Create record',
  require_approval: 'Request approval',
  call_integration: 'Call integration',
  run_agent: 'Run AI agent',
  wait: 'Wait',
};

export default async function WorkflowDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = params;

  let workflow: WorkflowDefinition | null = null;

  try {
    workflow = await apiFetch<WorkflowDefinition>(`/api/v1/workflows/${id}`, tenantId);
  } catch {
    workflow = null;
  }

  if (!workflow) {
    return (
      <div className="px-8 py-8 max-w-3xl">
        <p className="text-gray-500 text-sm">Workflow not found.</p>
        <Link
          href="/dashboard/workflows"
          className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to workflows
        </Link>
      </div>
    );
  }

  const triggerType =
    typeof workflow.trigger?.type === 'string' ? workflow.trigger.type : 'manual';
  const recentRuns: WorkflowRun[] = Array.isArray(workflow.recentRuns) ? workflow.recentRuns : [];

  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/dashboard/workflows"
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← Workflows
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch size={18} className="text-gray-500" />
            <h1 className="text-2xl font-semibold text-gray-900">{workflow.name}</h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-mono">
              {TRIGGER_LABELS[triggerType] ?? triggerType}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                workflow.enabled
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {workflow.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {workflow.description && (
            <p className="text-sm text-gray-500 mt-2">{workflow.description}</p>
          )}
        </div>
        <TriggerButton workflowId={workflow.id} tenantId={tenantId} />
      </div>

      {/* Details */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
        </div>
        <dl className="divide-y divide-gray-50">
          <div className="px-5 py-3 flex items-baseline gap-4">
            <dt className="text-xs text-gray-500 w-28 shrink-0">Trigger</dt>
            <dd className="text-sm text-gray-900 font-mono">{triggerType}</dd>
          </div>
          <div className="px-5 py-3 flex items-baseline gap-4">
            <dt className="text-xs text-gray-500 w-28 shrink-0">Entry step</dt>
            <dd className="text-sm text-gray-900 font-mono">{workflow.entryStep}</dd>
          </div>
          <div className="px-5 py-3 flex items-baseline gap-4">
            <dt className="text-xs text-gray-500 w-28 shrink-0">Created</dt>
            <dd className="text-sm text-gray-900">
              {typeof workflow.createdAt === 'string'
                ? workflow.createdAt.replace('T', ' ').slice(0, 19)
                : '—'}
            </dd>
          </div>
          <div className="px-5 py-3 flex items-baseline gap-4">
            <dt className="text-xs text-gray-500 w-28 shrink-0">Updated</dt>
            <dd className="text-sm text-gray-900">
              {typeof workflow.updatedAt === 'string'
                ? workflow.updatedAt.replace('T', ' ').slice(0, 19)
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Steps */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Steps ({workflow.steps.length})
          </h2>
        </div>
        {workflow.steps.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-400">No steps defined.</p>
          </div>
        ) : (
          <ol className="divide-y divide-gray-50">
            {workflow.steps.map((step, index) => {
              const actionType =
                typeof step.action?.type === 'string' ? step.action.type : 'unknown';
              return (
                <li key={step.id} className="px-5 py-4 flex items-start gap-3">
                  <span className="mt-0.5 text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{step.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-mono">
                        {ACTION_LABELS[actionType] ?? actionType}
                      </span>
                      {step.id === workflow.entryStep && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                          entry
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="font-mono">{step.id}</span>
                      {step.onSuccess && (
                        <span>
                          on success →{' '}
                          <span className="font-mono text-gray-500">{step.onSuccess}</span>
                        </span>
                      )}
                      {step.onFailure && (
                        <span>
                          on failure →{' '}
                          <span className="font-mono text-gray-500">{step.onFailure}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Recent runs */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Recent runs</h2>
        {recentRuns.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl px-8 py-10 text-center">
            <p className="text-gray-400 text-sm">No runs yet for this workflow.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Run ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Started</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Completed</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs truncate max-w-[180px]">
                      {run.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          RUN_STATUS_COLORS[run.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {run.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {typeof run.startedAt === 'string'
                        ? run.startedAt.replace('T', ' ').slice(0, 19)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {run.completedAt
                        ? run.completedAt.replace('T', ' ').slice(0, 19)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
