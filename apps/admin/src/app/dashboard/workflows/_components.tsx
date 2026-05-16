'use client';

import { useState, useCallback } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Play,
  Save,
  ChevronDown,
  X,
  Sparkles,
  LayoutTemplate,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowDown,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_HEADERS = {
  'Content-Type': 'application/json',
  'x-tenant-id': 'demo-tenant',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Workflow {
  id?: string | undefined;
  name: string;
  status?: 'active' | 'inactive' | 'draft' | undefined;
  enabled?: boolean | undefined;
  trigger?: WorkflowTrigger | undefined;
  conditions?: WorkflowCondition[] | undefined;
  actions?: WorkflowAction[] | undefined;
  lastRunAt?: string | undefined;
  createdAt?: string | undefined;
}

interface WorkflowTrigger {
  type: 'entity_created' | 'entity_updated' | 'schedule' | 'webhook' | 'manual';
  entityType?: string;
  fieldName?: string;
  newValue?: string;
  cron?: string;
}

interface WorkflowCondition {
  id: string;
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  value: string;
}

interface WorkflowAction {
  id: string;
  type:
    | 'send_email'
    | 'send_notification'
    | 'update_field'
    | 'create_record'
    | 'call_webhook'
    | 'ai_analysis';
  // send_email
  emailTemplate?: string;
  emailSubject?: string;
  emailBody?: string;
  // send_notification
  message?: string;
  userId?: string;
  // update_field
  fieldName?: string;
  fieldValue?: string;
  // create_record
  recordEntityType?: string;
  recordData?: { key: string; value: string }[];
  // call_webhook
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST' | 'PUT';
  webhookHeaders?: { key: string; value: string }[];
  // ai_analysis
  prompt?: string;
  outputField?: string;
}

interface WorkflowRun {
  id: string;
  status: 'completed' | 'failed' | 'running' | 'pending';
  triggeredAt: string;
  duration?: number;
  steps?: WorkflowRunStep[];
}

interface WorkflowRunStep {
  name: string;
  status: string;
  input?: unknown;
  output?: unknown;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'finance' | 'hr' | 'support';
  trigger: WorkflowTrigger;
  conditions: Omit<WorkflowCondition, 'id'>[];
  actions: Omit<WorkflowAction, 'id'>[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function cronToHuman(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, dom, month, dow] = parts as [string, string, string, string, string];
  if (dom === '*' && month === '*' && dow === '*') {
    if (min === '0' && hour !== '*') return `Every day at ${hour}:00`;
    if (min !== '*' && hour !== '*') return `Every day at ${hour}:${min.padStart(2, '0')}`;
    if (min === '0') return 'Every hour';
    return `Every hour at minute ${min}`;
  }
  if (dow !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[parseInt(dow)] ?? dow;
    return `Every ${dayName} at ${hour}:${min.padStart(2, '0')}`;
  }
  return cron;
}

function statusBadge(wf: Workflow) {
  const s = wf.status ?? (wf.enabled ? 'active' : 'inactive');
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
    draft: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[s] ?? map.inactive}`}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function triggerChip(type: string | undefined) {
  const labels: Record<string, string> = {
    entity_created: 'Entity Created',
    entity_updated: 'Entity Updated',
    schedule: 'Schedule',
    webhook: 'Webhook',
    manual: 'Manual',
  };
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-mono">
      {labels[type ?? ''] ?? type ?? 'manual'}
    </span>
  );
}

const ENTITY_TYPES = [
  'CRMContact',
  'Invoice',
  'Expense',
  'Employee',
  'CRMDeal',
  'ServiceTicket',
  'Contract',
  'Vendor',
  'Product',
];

const OPERATORS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains'];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'update_field', label: 'Update Field' },
  { value: 'create_record', label: 'Create Record' },
  { value: 'call_webhook', label: 'Call Webhook' },
  { value: 'ai_analysis', label: 'AI Analysis' },
];

const EMAIL_TEMPLATES = [
  { value: 'invoice_reminder', label: 'Invoice Reminder' },
  { value: 'welcome_employee', label: 'Welcome Employee' },
  { value: 'contract_expiry', label: 'Contract Expiry' },
  { value: 'portal_invite', label: 'Portal Invite' },
  { value: 'custom', label: 'Custom' },
];

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
      ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
    >
      {type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowsClient — main layout
// ---------------------------------------------------------------------------

export function WorkflowsClient({ initialWorkflows }: { initialWorkflows: Workflow[] }) {
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAISuggest, setShowAISuggest] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleNew() {
    const blank: Workflow = {
      name: 'Untitled Workflow',
      status: 'draft',
      trigger: { type: 'entity_created', entityType: 'CRMContact' },
      conditions: [],
      actions: [
        {
          id: uid(),
          type: 'send_notification',
          message: '',
        },
      ],
    };
    setSelected(blank);
    setShowHistory(false);
  }

  function handleEdit(wf: Workflow) {
    setSelected({ ...wf });
    setShowHistory(false);
  }

  async function handleDelete(wf: Workflow) {
    if (!wf.id) return;
    if (!confirm(`Delete workflow "${wf.name}"?`)) return;
    try {
      await fetch(`${API_BASE}/workflows/${wf.id}`, {
        method: 'DELETE',
        headers: TENANT_HEADERS,
      });
      setWorkflows((prev) => prev.filter((w) => w.id !== wf.id));
      if (selected?.id === wf.id) setSelected(null);
      showToast('Workflow deleted');
    } catch {
      showToast('Failed to delete workflow', 'error');
    }
  }

  async function handleTestRun(wf: Workflow) {
    if (!wf.id) return;
    try {
      await fetch(`${API_BASE}/workflows/${wf.id}/test-run`, {
        method: 'POST',
        headers: TENANT_HEADERS,
      });
      showToast('Test run started');
    } catch {
      showToast('Test run failed', 'error');
    }
  }

  function handleSaved(saved: Workflow) {
    setWorkflows((prev) => {
      const idx = prev.findIndex((w) => w.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setSelected(saved);
    showToast('Workflow saved');
  }

  function handleUseTemplate(tpl: WorkflowTemplate) {
    const wf: Workflow = {
      name: tpl.name,
      status: 'draft',
      trigger: tpl.trigger,
      conditions: tpl.conditions.map((c) => ({ ...c, id: uid() })),
      actions: tpl.actions.map((a) => ({ ...a, id: uid() })),
    };
    setSelected(wf);
    setShowTemplates(false);
  }

  function handleUseAISuggestion(wf: Workflow) {
    setSelected(wf);
    setShowAISuggest(false);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} className="text-indigo-600" />
            <h1 className="text-base font-semibold text-gray-900">Workflows</h1>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleNew}
              className="flex items-center justify-center gap-1.5 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors w-full"
            >
              <Plus size={14} />
              New Workflow
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplates(true)}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <LayoutTemplate size={13} />
                Templates
              </button>
              <button
                onClick={() => setShowAISuggest(true)}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <Sparkles size={13} />
                AI Suggest
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {workflows.length === 0 && (
            <div className="px-4 py-10 text-center">
              <Zap size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No workflows yet</p>
            </div>
          )}
          {workflows.map((wf) => (
            <div
              key={wf.id ?? wf.name}
              onClick={() => handleEdit(wf)}
              className={`mx-2 mb-1 px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                selected?.id && selected.id === wf.id
                  ? 'bg-indigo-50 border border-indigo-100'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-sm font-medium text-gray-900 truncate">{wf.name}</span>
                {statusBadge(wf)}
              </div>
              <div className="flex items-center gap-2 mb-2">
                {triggerChip(wf.trigger?.type)}
                {wf.lastRunAt && (
                  <span className="text-xs text-gray-400">
                    {new Date(wf.lastRunAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(wf);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded border border-gray-200 hover:bg-white transition-colors"
                >
                  Edit
                </button>
                {wf.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestRun(wf);
                    }}
                    className="text-xs text-indigo-500 hover:text-indigo-700 px-2 py-1 rounded border border-indigo-100 hover:bg-indigo-50 transition-colors"
                  >
                    Test
                  </button>
                )}
                {wf.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(wf);
                    }}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-red-100 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {selected ? (
          showHistory && selected.id ? (
            <WorkflowRunHistory
              workflowId={selected.id}
              onBack={() => setShowHistory(false)}
            />
          ) : (
            <WorkflowEditor
              workflow={selected}
              onChange={setSelected}
              onSaved={handleSaved}
              onShowHistory={() => setShowHistory(true)}
              showToast={showToast}
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Zap size={48} className="text-gray-200 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-2">No workflow selected</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-sm">
              Select a workflow from the list to edit it, or create a new one.
            </p>
            <button
              onClick={handleNew}
              className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Plus size={14} />
              New Workflow
            </button>
          </div>
        )}
      </div>

      {/* Overlays */}
      {showTemplates && (
        <TemplatesGallery
          onUse={handleUseTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
      {showAISuggest && (
        <AISuggestPanel
          onUse={handleUseAISuggestion}
          onClose={() => setShowAISuggest(false)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowEditor
// ---------------------------------------------------------------------------

function WorkflowEditor({
  workflow,
  onChange,
  onSaved,
  onShowHistory,
  showToast,
}: {
  workflow: Workflow;
  onChange: (wf: Workflow) => void;
  onSaved: (wf: Workflow) => void;
  onShowHistory: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const trigger = workflow.trigger ?? { type: 'entity_created' as const };
  const conditions = workflow.conditions ?? [];
  const actions = workflow.actions ?? [];

  function updateTrigger(patch: Partial<WorkflowTrigger>) {
    onChange({ ...workflow, trigger: { ...trigger, ...patch } });
  }

  function addCondition() {
    const cond: WorkflowCondition = { id: uid(), field: '', operator: 'eq', value: '' };
    onChange({ ...workflow, conditions: [...conditions, cond] });
  }

  function updateCondition(id: string, patch: Partial<WorkflowCondition>) {
    onChange({
      ...workflow,
      conditions: conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  }

  function removeCondition(id: string) {
    onChange({ ...workflow, conditions: conditions.filter((c) => c.id !== id) });
  }

  function addAction() {
    const action: WorkflowAction = { id: uid(), type: 'send_notification', message: '' };
    onChange({ ...workflow, actions: [...actions, action] });
  }

  function updateAction(id: string, patch: Partial<WorkflowAction>) {
    onChange({
      ...workflow,
      actions: actions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  }

  function removeAction(id: string) {
    onChange({ ...workflow, actions: actions.filter((a) => a.id !== id) });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = workflow.id
        ? `${API_BASE}/workflows/${workflow.id}`
        : `${API_BASE}/workflows`;
      const method = workflow.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: TENANT_HEADERS,
        body: JSON.stringify(workflow),
      });
      if (!res.ok) throw new Error('Save failed');
      const saved: Workflow = await res.json();
      onSaved(saved);
    } catch {
      showToast('Failed to save workflow', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestRun() {
    if (!workflow.id) {
      showToast('Save the workflow first before running a test', 'error');
      return;
    }
    setTesting(true);
    try {
      await fetch(`${API_BASE}/workflows/${workflow.id}/test-run`, {
        method: 'POST',
        headers: TENANT_HEADERS,
      });
      showToast('Test run started');
    } catch {
      showToast('Test run failed', 'error');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-8">
        <input
          value={workflow.name}
          onChange={(e) => onChange({ ...workflow, name: e.target.value })}
          className="flex-1 text-lg font-semibold text-gray-900 bg-transparent border-0 border-b-2 border-transparent focus:border-indigo-400 outline-none pb-0.5 transition-colors"
          placeholder="Workflow name..."
        />
        <select
          value={workflow.status ?? 'draft'}
          onChange={(e) =>
            onChange({ ...workflow, status: e.target.value as Workflow['status'] })
          }
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
        </select>
        {workflow.id && (
          <button
            onClick={onShowHistory}
            className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Clock size={13} />
            History
          </button>
        )}
        <button
          onClick={handleTestRun}
          disabled={testing}
          className="flex items-center gap-1.5 text-sm text-indigo-600 border border-indigo-200 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-60"
        >
          {testing ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          Test Run
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </button>
      </div>

      {/* Trigger block */}
      <WorkflowBlock icon="trigger" title="TRIGGER">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">When</label>
            <select
              value={trigger.type}
              onChange={(e) =>
                updateTrigger({ type: e.target.value as WorkflowTrigger['type'] })
              }
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="entity_created">Entity Created</option>
              <option value="entity_updated">Entity Updated</option>
              <option value="schedule">Schedule (cron)</option>
              <option value="webhook">Webhook</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          {(trigger.type === 'entity_created' || trigger.type === 'entity_updated') && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Entity Type</label>
              <select
                value={trigger.entityType ?? 'CRMContact'}
                onChange={(e) => updateTrigger({ entityType: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {trigger.type === 'entity_updated' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Field Name</label>
                <input
                  value={trigger.fieldName ?? ''}
                  onChange={(e) => updateTrigger({ fieldName: e.target.value })}
                  placeholder="e.g. status"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">New Value</label>
                <input
                  value={trigger.newValue ?? ''}
                  onChange={(e) => updateTrigger({ newValue: e.target.value })}
                  placeholder="e.g. closed"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
          )}

          {trigger.type === 'schedule' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cron Expression</label>
              <input
                value={trigger.cron ?? ''}
                onChange={(e) => updateTrigger({ cron: e.target.value })}
                placeholder="e.g. 0 9 * * *"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {trigger.cron && (
                <p className="text-xs text-indigo-600 mt-1">
                  {cronToHuman(trigger.cron)}
                </p>
              )}
            </div>
          )}

          {trigger.type === 'webhook' && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500 font-mono">
              Webhook URL will be:{' '}
              <span className="text-indigo-600">
                /webhooks/workflow/{workflow.id ?? '{workflowId}'}
              </span>
            </div>
          )}

          {trigger.type === 'manual' && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
              Triggered manually via API or Test Run button
            </div>
          )}
        </div>
      </WorkflowBlock>

      <ConnectorArrow />

      {/* Condition blocks */}
      {conditions.map((cond) => (
        <div key={cond.id}>
          <WorkflowBlock icon="condition" title="CONDITION">
            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-24">
                <label className="block text-xs text-gray-500 mb-1">Field</label>
                <input
                  value={cond.field}
                  onChange={(e) => updateCondition(cond.id, { field: e.target.value })}
                  placeholder="field name"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="w-28">
                <label className="block text-xs text-gray-500 mb-1">Operator</label>
                <select
                  value={cond.operator}
                  onChange={(e) =>
                    updateCondition(cond.id, {
                      operator: e.target.value as WorkflowCondition['operator'],
                    })
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-24">
                <label className="block text-xs text-gray-500 mb-1">Value</label>
                <input
                  value={cond.value}
                  onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                  placeholder="value"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <button
                onClick={() => removeCondition(cond.id)}
                className="mb-0.5 text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Remove condition"
              >
                <X size={14} />
              </button>
            </div>
          </WorkflowBlock>
          <ConnectorArrow />
        </div>
      ))}

      {/* Add condition */}
      <div className="flex justify-center mb-2">
        <button
          onClick={addCondition}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 hover:border-indigo-300 transition-colors"
        >
          <Plus size={12} />
          Add Condition
        </button>
      </div>

      <ConnectorArrow />

      {/* Action blocks */}
      {actions.map((action, idx) => (
        <div key={action.id}>
          <WorkflowBlock icon="action" title="ACTION">
            <div className="space-y-3">
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select
                    value={action.type}
                    onChange={(e) =>
                      updateAction(action.id, { type: e.target.value as WorkflowAction['type'] })
                    }
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {ACTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                {actions.length > 1 && (
                  <button
                    onClick={() => removeAction(action.id)}
                    className="mt-5 text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Remove action"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <ActionFields action={action} onChange={(patch) => updateAction(action.id, patch)} />
            </div>
          </WorkflowBlock>
          {idx < actions.length - 1 && <ConnectorArrow />}
        </div>
      ))}

      {/* Add action */}
      <div className="flex justify-center mt-3">
        <button
          onClick={addAction}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 hover:border-indigo-300 transition-colors"
        >
          <Plus size={12} />
          Add Action
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowBlock
// ---------------------------------------------------------------------------

function WorkflowBlock({
  icon,
  title,
  children,
}: {
  icon: 'trigger' | 'condition' | 'action';
  title: string;
  children: React.ReactNode;
}) {
  const iconMap = {
    trigger: { bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', symbol: '⚡' },
    condition: { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', symbol: '◇' },
    action: { bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', symbol: '▶' },
  };
  const style = iconMap[icon];

  return (
    <div className={`border rounded-xl p-4 ${style.bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
          {style.symbol} {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function ConnectorArrow() {
  return (
    <div className="flex justify-center py-1">
      <ArrowDown size={18} className="text-gray-300" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionFields
// ---------------------------------------------------------------------------

function ActionFields({
  action,
  onChange,
}: {
  action: WorkflowAction;
  onChange: (patch: Partial<WorkflowAction>) => void;
}) {
  switch (action.type) {
    case 'send_email':
      return (
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email Template</label>
            <select
              value={action.emailTemplate ?? ''}
              onChange={(e) => onChange({ emailTemplate: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">Select template...</option>
              {EMAIL_TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {action.emailTemplate === 'custom' && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Subject</label>
                <input
                  value={action.emailSubject ?? ''}
                  onChange={(e) => onChange({ emailSubject: e.target.value })}
                  placeholder="Email subject"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Body</label>
                <textarea
                  value={action.emailBody ?? ''}
                  onChange={(e) => onChange({ emailBody: e.target.value })}
                  placeholder="Email body..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
              </div>
            </>
          )}
        </div>
      );

    case 'send_notification':
      return (
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Message</label>
            <textarea
              value={action.message ?? ''}
              onChange={(e) => onChange({ message: e.target.value })}
              placeholder="Notification message..."
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              User ID{' '}
              <span className="text-gray-400">(optional — blank = all admins)</span>
            </label>
            <input
              value={action.userId ?? ''}
              onChange={(e) => onChange({ userId: e.target.value })}
              placeholder="user-id or blank"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
      );

    case 'update_field':
      return (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Field</label>
            <input
              value={action.fieldName ?? ''}
              onChange={(e) => onChange({ fieldName: e.target.value })}
              placeholder="field name"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">New Value</label>
            <input
              value={action.fieldValue ?? ''}
              onChange={(e) => onChange({ fieldValue: e.target.value })}
              placeholder="value"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
      );

    case 'create_record':
      return (
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Entity Type</label>
            <select
              value={action.recordEntityType ?? ''}
              onChange={(e) => onChange({ recordEntityType: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">Select entity...</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data (key-value pairs)</label>
            {(action.recordData ?? []).map((row, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input
                  value={row.key}
                  onChange={(e) => {
                    const d = [...(action.recordData ?? [])];
                    d[i] = { key: e.target.value, value: row.value };
                    onChange({ recordData: d });
                  }}
                  placeholder="key"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <input
                  value={row.value}
                  onChange={(e) => {
                    const d = [...(action.recordData ?? [])];
                    d[i] = { key: row.key, value: e.target.value };
                    onChange({ recordData: d });
                  }}
                  placeholder="value"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  onClick={() => {
                    const d = (action.recordData ?? []).filter((_, j) => j !== i);
                    onChange({ recordData: d });
                  }}
                  className="text-red-400 hover:text-red-600 px-1"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                onChange({ recordData: [...(action.recordData ?? []), { key: '', value: '' }] })
              }
              className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
            >
              <Plus size={11} />
              Add row
            </button>
          </div>
        </div>
      );

    case 'call_webhook':
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="w-24">
              <label className="block text-xs text-gray-500 mb-1">Method</label>
              <select
                value={action.webhookMethod ?? 'POST'}
                onChange={(e) =>
                  onChange({ webhookMethod: e.target.value as 'GET' | 'POST' | 'PUT' })
                }
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">URL</label>
              <input
                value={action.webhookUrl ?? ''}
                onChange={(e) => onChange({ webhookUrl: e.target.value })}
                placeholder="https://..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Headers (key-value)</label>
            {(action.webhookHeaders ?? []).map((row, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input
                  value={row.key}
                  onChange={(e) => {
                    const h = [...(action.webhookHeaders ?? [])];
                    h[i] = { key: e.target.value, value: row.value };
                    onChange({ webhookHeaders: h });
                  }}
                  placeholder="Header-Name"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <input
                  value={row.value}
                  onChange={(e) => {
                    const h = [...(action.webhookHeaders ?? [])];
                    h[i] = { key: row.key, value: e.target.value };
                    onChange({ webhookHeaders: h });
                  }}
                  placeholder="value"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  onClick={() => {
                    const h = (action.webhookHeaders ?? []).filter((_, j) => j !== i);
                    onChange({ webhookHeaders: h });
                  }}
                  className="text-red-400 hover:text-red-600 px-1"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                onChange({
                  webhookHeaders: [...(action.webhookHeaders ?? []), { key: '', value: '' }],
                })
              }
              className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
            >
              <Plus size={11} />
              Add header
            </button>
          </div>
        </div>
      );

    case 'ai_analysis':
      return (
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Prompt</label>
            <textarea
              value={action.prompt ?? ''}
              onChange={(e) => onChange({ prompt: e.target.value })}
              placeholder="Describe what AI should analyze..."
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Output Field Name</label>
            <input
              value={action.outputField ?? ''}
              onChange={(e) => onChange({ outputField: e.target.value })}
              placeholder="e.g. ai_summary"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// WorkflowRunHistory
// ---------------------------------------------------------------------------

function WorkflowRunHistory({
  workflowId,
  onBack,
}: {
  workflowId: string;
  onBack: () => void;
}) {
  const [runs, setRuns] = useState<WorkflowRun[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workflows/${workflowId}/runs`, {
        headers: TENANT_HEADERS,
      });
      if (res.ok) {
        const data = await res.json();
        setRuns(Array.isArray(data) ? data : (data.runs ?? []));
      } else {
        setRuns([]);
      }
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useState(() => {
    load();
  });

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 size={15} className="text-green-500" />;
    if (status === 'failed') return <XCircle size={15} className="text-red-500" />;
    if (status === 'running') return <Loader2 size={15} className="text-blue-500 animate-spin" />;
    return <AlertCircle size={15} className="text-yellow-500" />;
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ChevronRight size={13} className="rotate-180" />
          Back
        </button>
        <h2 className="text-base font-semibold text-gray-900">Run History</h2>
        <button
          onClick={load}
          className="ml-auto text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      )}

      {!loading && runs?.length === 0 && (
        <div className="text-center py-12">
          <Clock size={32} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No runs yet</p>
        </div>
      )}

      {!loading && runs && runs.length > 0 && (
        <div className="space-y-2">
          {runs.map((run) => (
            <div key={run.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === run.id ? null : run.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                {statusIcon(run.status)}
                <span className="flex-1 text-sm text-gray-700">
                  {typeof run.triggeredAt === 'string'
                    ? run.triggeredAt.replace('T', ' ').slice(0, 19)
                    : 'Unknown time'}
                </span>
                {run.duration != null && (
                  <span className="text-xs text-gray-400">{run.duration}ms</span>
                )}
                {run.steps && (
                  <span className="text-xs text-gray-400">{run.steps.length} steps</span>
                )}
                <ChevronDown
                  size={14}
                  className={`text-gray-400 transition-transform ${expanded === run.id ? 'rotate-180' : ''}`}
                />
              </button>

              {expanded === run.id && run.steps && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                  {run.steps.map((step, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            step.status === 'success' ? 'bg-green-500' : 'bg-red-400'
                          }`}
                        />
                        <span className="font-medium text-gray-700">{step.name}</span>
                        <span className="text-gray-400 capitalize">{step.status}</span>
                      </div>
                      {step.input != null && (
                        <pre className="bg-gray-50 rounded px-2 py-1 text-gray-500 overflow-x-auto text-xs mb-1">
                          IN: {JSON.stringify(step.input).slice(0, 200)}
                        </pre>
                      )}
                      {step.output != null && (
                        <pre className="bg-gray-50 rounded px-2 py-1 text-gray-500 overflow-x-auto text-xs">
                          OUT: {JSON.stringify(step.output).slice(0, 200)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TemplatesGallery (slide-over / modal)
// ---------------------------------------------------------------------------

const MOCK_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Invoice Reminder',
    description: 'Send a reminder email when an invoice is overdue',
    category: 'finance',
    trigger: { type: 'entity_updated', entityType: 'Invoice', fieldName: 'status', newValue: 'overdue' },
    conditions: [{ field: 'amount', operator: 'gt', value: '0' }],
    actions: [{ type: 'send_email', emailTemplate: 'invoice_reminder' }],
  },
  {
    id: 'tpl-2',
    name: 'Welcome New Employee',
    description: 'Send welcome email when a new employee record is created',
    category: 'hr',
    trigger: { type: 'entity_created', entityType: 'Employee' },
    conditions: [],
    actions: [{ type: 'send_email', emailTemplate: 'welcome_employee' }],
  },
  {
    id: 'tpl-3',
    name: 'New Lead Notification',
    description: 'Notify the sales team when a new CRM contact is created',
    category: 'sales',
    trigger: { type: 'entity_created', entityType: 'CRMContact' },
    conditions: [],
    actions: [{ type: 'send_notification', message: 'A new lead has been added to CRM.' }],
  },
  {
    id: 'tpl-4',
    name: 'Contract Expiry Alert',
    description: 'Alert when a contract is nearing expiry',
    category: 'finance',
    trigger: { type: 'entity_updated', entityType: 'Contract', fieldName: 'status', newValue: 'expiring_soon' },
    conditions: [],
    actions: [{ type: 'send_email', emailTemplate: 'contract_expiry' }],
  },
  {
    id: 'tpl-5',
    name: 'Escalate Critical Ticket',
    description: 'Auto-escalate support tickets marked critical',
    category: 'support',
    trigger: { type: 'entity_updated', entityType: 'ServiceTicket', fieldName: 'priority', newValue: 'critical' },
    conditions: [{ field: 'status', operator: 'ne', value: 'resolved' }],
    actions: [
      { type: 'send_notification', message: 'Critical ticket requires immediate attention.' },
      { type: 'update_field', fieldName: 'assignee', fieldValue: 'escalation-team' },
    ],
  },
  {
    id: 'tpl-6',
    name: 'Deal Won Celebration',
    description: 'Notify the team when a deal is marked Won',
    category: 'sales',
    trigger: { type: 'entity_updated', entityType: 'CRMDeal', fieldName: 'stage', newValue: 'won' },
    conditions: [],
    actions: [{ type: 'send_notification', message: 'A deal was just marked as Won!' }],
  },
  {
    id: 'tpl-7',
    name: 'Daily Finance Digest',
    description: 'Run AI analysis on finance data every morning',
    category: 'finance',
    trigger: { type: 'schedule', cron: '0 8 * * *' },
    conditions: [],
    actions: [{ type: 'ai_analysis', prompt: 'Summarise today\'s outstanding invoices and flag any anomalies.', outputField: 'finance_digest' }],
  },
  {
    id: 'tpl-8',
    name: 'Portal Invite on Hire',
    description: 'Send portal invite to a new employee on their start date',
    category: 'hr',
    trigger: { type: 'entity_updated', entityType: 'Employee', fieldName: 'status', newValue: 'active' },
    conditions: [],
    actions: [{ type: 'send_email', emailTemplate: 'portal_invite' }],
  },
];

const CATEGORY_BADGE: Record<string, string> = {
  sales: 'bg-blue-100 text-blue-700',
  finance: 'bg-green-100 text-green-700',
  hr: 'bg-violet-100 text-violet-700',
  support: 'bg-amber-100 text-amber-700',
};

function TemplatesGallery({
  onUse,
  onClose,
}: {
  onUse: (tpl: WorkflowTemplate) => void;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(MOCK_TEMPLATES);
  const [loading, setLoading] = useState(false);

  useState(() => {
    setLoading(true);
    fetch(`${API_BASE}/workflows/templates`, { headers: TENANT_HEADERS })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          const list = Array.isArray(data) ? data : (data.templates ?? null);
          if (list) setTemplates(list);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  });

  const categories = Array.from(new Set(templates.map((t) => t.category)));

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[640px] bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={18} className="text-gray-600" />
            <h2 className="text-base font-semibold text-gray-900">Workflow Templates</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-gray-300" />
            </div>
          )}
          {!loading && categories.map((cat) => (
            <div key={cat} className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {cat}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {templates.filter((t) => t.category === cat).map((tpl) => (
                  <div
                    key={tpl.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">{tpl.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_BADGE[tpl.category]}`}>
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{tpl.description}</p>
                    <div className="flex items-center justify-between">
                      {triggerChip(tpl.trigger.type)}
                      <button
                        onClick={() => onUse(tpl)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AISuggestPanel (slide-over from right)
// ---------------------------------------------------------------------------

const SUGGESTION_CHIPS = [
  'Remind customers about unpaid invoices',
  'Auto-escalate critical support tickets',
  'Notify HR when contract expires',
];

function AISuggestPanel({
  onUse,
  onClose,
}: {
  onUse: (wf: Workflow) => void;
  onClose: () => void;
}) {
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Workflow | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!description.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/workflows/ai-suggest`, {
        method: 'POST',
        headers: TENANT_HEADERS,
        body: JSON.stringify({ description, context }),
      });
      if (!res.ok) throw new Error('AI suggestion failed');
      const data: Workflow = await res.json();
      setResult(data);
    } catch {
      // Build a mock result for demo purposes
      setResult({
        name: description.slice(0, 60),
        status: 'draft',
        trigger: { type: 'entity_created', entityType: 'CRMContact' },
        conditions: [],
        actions: [{ id: uid(), type: 'send_notification', message: description }],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[480px] bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">AI Workflow Suggest</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Chips */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Quick suggestions</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setDescription(chip)}
                  className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Describe your business process
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. When a new deal is won, send a congratulations notification to the sales team and create an onboarding task..."
              rows={4}
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          {/* Context */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Additional context{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Any extra info about your team, tools, or constraints..."
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !description.trim()}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm py-2.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Generate Workflow
              </>
            )}
          </button>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>
          )}

          {/* Result preview */}
          {result && (
            <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{result.name}</h3>

              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-500 w-16">Trigger</span>
                  {triggerChip(result.trigger?.type)}
                  {result.trigger?.entityType && (
                    <span className="text-gray-500">on {result.trigger.entityType}</span>
                  )}
                </div>

                {result.conditions && result.conditions.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-500">Conditions</span>
                    <ul className="mt-1 space-y-0.5 pl-2">
                      {result.conditions.map((c, i) => (
                        <li key={i} className="text-gray-500">
                          {(c as WorkflowCondition).field} {(c as WorkflowCondition).operator}{' '}
                          {(c as WorkflowCondition).value}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.actions && result.actions.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-500">Actions</span>
                    <ul className="mt-1 space-y-0.5 pl-2">
                      {result.actions.map((a, i) => (
                        <li key={i} className="text-gray-500">
                          {ACTION_TYPES.find((t) => t.value === a.type)?.label ?? a.type}
                          {(a as WorkflowAction).message && `: ${(a as WorkflowAction).message?.slice(0, 60)}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                onClick={() => onUse(result)}
                className="mt-4 w-full flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-sm py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={14} />
                Use This Workflow
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
