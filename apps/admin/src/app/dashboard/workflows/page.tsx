import Link from 'next/link';
import { Plus, GitBranch } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';
import { TriggerButton } from './trigger-button.js';

interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  trigger: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
}

interface WorkflowRun {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  // workflowName is joined from definitions
  workflowName?: string;
}

const RUN_STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  running: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  awaiting_approval: 'bg-indigo-100 text-indigo-700',
};

export default async function WorkflowsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let workflows: WorkflowDefinition[] = [];
  let runs: WorkflowRun[] = [];

  try {
    const res = await apiFetch<WorkflowDefinition[] | { workflows: WorkflowDefinition[] }>(
      '/api/v1/workflows',
      tenantId,
    );
    workflows = Array.isArray(res) ? res : (res.workflows ?? []);
  } catch {
    workflows = [];
  }

  try {
    const res = await apiFetch<WorkflowRun[] | { runs: WorkflowRun[] }>(
      '/api/v1/workflows/runs?limit=10',
      tenantId,
    );
    runs = Array.isArray(res) ? res : (res.runs ?? []);
  } catch {
    runs = [];
  }

  // Build a lookup for workflow names
  const workflowNames = Object.fromEntries(workflows.map((w) => [w.id, w.name]));

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <GitBranch size={20} className="text-gray-600" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Workflows</h1>
            <p className="text-sm text-gray-500 mt-0.5">{workflows.length} workflow{workflows.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Link
          href="/dashboard/workflows/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New workflow
        </Link>
      </div>

      {/* Workflow cards */}
      {workflows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-16 text-center mb-8">
          <GitBranch size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No workflows yet.</p>
          <Link
            href="/dashboard/workflows/new"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus size={14} /> Create your first workflow
          </Link>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {workflows.map((wf) => {
            const triggerType =
              typeof wf.trigger?.type === 'string' ? wf.trigger.type : 'manual';
            return (
              <div
                key={wf.id}
                className="bg-white border border-gray-200 rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{wf.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-mono">
                        {triggerType}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          wf.enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {wf.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {wf.description && (
                      <p className="text-sm text-gray-500 truncate">{wf.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/dashboard/workflows/${wf.id}/runs`}
                      className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      View runs
                    </Link>
                    <TriggerButton workflowId={wf.id} tenantId={tenantId} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent runs */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Recent runs</h2>
        {runs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl px-8 py-10 text-center">
            <p className="text-gray-400 text-sm">No workflow runs yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Workflow</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Started</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Completed</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 text-gray-700">
                      {run.workflowName ?? workflowNames[run.workflowId] ?? run.workflowId}
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
