'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ChevronDown } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

interface StepDraft {
  id: string;
  name: string;
  action: string;
  config: string;
}

const TRIGGER_OPTIONS = [
  { value: 'inbound_message', label: 'When a message is received' },
  { value: 'entity.created', label: 'When a record is created' },
  { value: 'entity.updated', label: 'When a record is updated' },
  { value: 'schedule', label: 'On a schedule' },
  { value: 'manual', label: 'Manually triggered' },
];

const ACTION_OPTIONS = [
  { value: 'send_message', label: 'Send message' },
  { value: 'update_entity', label: 'Update record' },
  { value: 'create_entity', label: 'Create record' },
  { value: 'require_approval', label: 'Request approval' },
  { value: 'call_integration', label: 'Call integration' },
  { value: 'run_agent', label: 'Run AI agent' },
];

const ACTION_CONFIG_HINTS: Record<string, string> = {
  send_message: '{ "channel": "email", "recipient": "{{entity.email}}", "template": "hello" }',
  update_entity: '{ "entityId": "{{entity.id}}", "data": { "status": "resolved" } }',
  create_entity: '{ "entityType": "Task", "data": { "title": "Follow up" } }',
  require_approval: '{ "approvers": ["alice@example.com"], "title": "Approve action" }',
  call_integration: '{ "integrationId": "my-integration", "method": "doSomething" }',
  run_agent: '{ "agentId": "my-agent", "input": {} }',
};

function tryParseJson(str: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/^[^a-z]/, 'step') || `step_${Date.now()}`;
}

let stepCounter = 0;

function newStepId(): string {
  stepCounter += 1;
  return `step_${stepCounter}`;
}

export default function WorkflowBuilder() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('inbound_message');
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { id: newStepId(), name: '', action: 'send_message', config: '' },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStep = (id: string, patch: Partial<StepDraft>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleSave = async () => {
    setError('');

    if (!name.trim()) {
      setError('Workflow name is required.');
      return;
    }
    if (steps.length === 0) {
      setError('Add at least one step before saving.');
      return;
    }
    for (const step of steps) {
      if (!step.name.trim()) {
        setError('All steps must have a name.');
        return;
      }
    }

    const mappedSteps = steps.map((s) => ({
      id: slugify(s.name) || s.id,
      label: s.name,
      action: {
        type: s.action,
        ...tryParseJson(s.config),
      },
    }));

    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      trigger: { type: triggerType },
      steps: mappedSteps,
      entryStep: mappedSteps[0]!.id,
      enabled: true,
      isSystem: false,
    };

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Veska-Tenant-Id': TENANT_ID,
          'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(`Failed to save: ${text}`);
        return;
      }

      router.push('/dashboard/workflows');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Basic info */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic info</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="wf-name">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="wf-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Onboard new lead"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="wf-desc">
              Description
            </label>
            <textarea
              id="wf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
            />
          </div>
        </div>
      </section>

      {/* Trigger */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trigger</h2>
        </div>
        <div className="px-5 py-5">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="wf-trigger">
            When should this workflow run?
          </label>
          <div className="relative">
            <select
              id="wf-trigger"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 pr-8"
            >
              {TRIGGER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Steps</h2>
          <span className="text-xs text-gray-400">{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
        </div>

        {steps.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400 mb-4">No steps yet. Add a step to define what this workflow does.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {steps.map((step, index) => (
              <div key={step.id} className="px-5 py-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    Step {index + 1}
                  </span>
                  <button
                    onClick={() => removeStep(step.id)}
                    className="ml-auto flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                    type="button"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Step name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={step.name}
                    onChange={(e) => updateStep(step.id, { name: e.target.value })}
                    placeholder="e.g. Send welcome email"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
                  <div className="relative">
                    <select
                      value={step.action}
                      onChange={(e) => updateStep(step.id, { action: e.target.value })}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 pr-8"
                    >
                      {ACTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Config (JSON)
                  </label>
                  <textarea
                    value={step.config}
                    onChange={(e) => updateStep(step.id, { config: e.target.value })}
                    placeholder={ACTION_CONFIG_HINTS[step.action] ?? '{ }'}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Example: <span className="font-mono">{ACTION_CONFIG_HINTS[step.action] ?? '{ }'}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={addStep}
            type="button"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Plus size={14} />
            Add step
          </button>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          type="button"
          className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save workflow'}
        </button>
        <a
          href="/dashboard/workflows"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </a>
      </div>
    </div>
  );
}
