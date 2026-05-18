'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2 } from 'lucide-react';

interface Step {
  label: string;
  approverRole: string;
  approverUserId: string;
}

const ENTITY_TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'purchase_order', label: 'Purchase Order' },
];

const APPROVER_ROLES = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Finance', label: 'Finance' },
  { value: 'HR', label: 'HR' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Viewer', label: 'Viewer' },
  { value: 'Custom', label: 'Custom' },
];

export default function NewApprovalChainForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState('expense');
  const [conditionType, setConditionType] = useState<'always' | 'amount_gt'>('always');
  const [conditionValue, setConditionValue] = useState('');
  const [steps, setSteps] = useState<Step[]>([
    { label: '', approverRole: 'Manager', approverUserId: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function addStep() {
    setSteps((prev) => [...prev, { label: '', approverRole: 'Manager', approverUserId: '' }]);
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateStep(idx: number, field: keyof Step, value: string) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (steps.length === 0) {
      setError('At least one step is required.');
      return;
    }
    for (const s of steps) {
      if (!s.label.trim()) {
        setError('Each step must have a label.');
        return;
      }
    }

    const payload = {
      tenantId: 'demo',
      name: name.trim(),
      entityType,
      conditionField: conditionType === 'amount_gt' ? 'amount' : null,
      conditionOp: conditionType === 'amount_gt' ? 'gt' : 'always',
      conditionValue: conditionType === 'amount_gt' ? parseFloat(conditionValue) || null : null,
      steps: steps.map((s, idx) => ({
        order: idx + 1,
        label: s.label.trim(),
        approverRole: s.approverRole,
        approverUserId: s.approverUserId.trim() || null,
      })),
      enabled: true,
    };

    setSubmitting(true);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1/approval-chains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.message ?? 'Failed to create approval chain.');
        return;
      }

      router.push('/dashboard/settings/approvals');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Section 1: Basic Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-5">
          Basic Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High-Value Expense Approval"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Entity Type <span className="text-red-500">*</span>
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent bg-white"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Condition */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-5">
          Condition (When to Trigger)
        </h2>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="conditionType"
              value="always"
              checked={conditionType === 'always'}
              onChange={() => setConditionType('always')}
              className="mt-0.5 accent-indigo-600"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">Always trigger</p>
              <p className="text-xs text-gray-500">
                This approval chain activates for every matching entity.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="conditionType"
              value="amount_gt"
              checked={conditionType === 'amount_gt'}
              onChange={() => setConditionType('amount_gt')}
              className="mt-0.5 accent-indigo-600"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">When amount exceeds threshold</p>
              <p className="text-xs text-gray-500 mb-2">
                Only trigger when the entity amount exceeds a specified value.
              </p>
              {conditionType === 'amount_gt' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Amount &gt;</span>
                  <input
                    type="number"
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    placeholder="500"
                    min="0"
                    step="any"
                    className="w-32 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Section 3: Approval Steps */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Approval Steps
          </h2>
          <button
            type="button"
            onClick={addStep}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Plus size={13} />
            Add Step
          </button>
        </div>

        {steps.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No steps yet. Click &ldquo;Add Step&rdquo; to begin.
          </p>
        ) : (
          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-1">
                  {idx + 1}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Step Label <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={step.label}
                      onChange={(e) => updateStep(idx, 'label', e.target.value)}
                      placeholder="e.g. Finance Review"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Approver Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={step.approverRole}
                      onChange={(e) => updateStep(idx, 'approverRole', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                    >
                      {APPROVER_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Specific User ID{' '}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={step.approverUserId}
                      onChange={(e) => updateStep(idx, 'approverUserId', e.target.value)}
                      placeholder="Leave blank to use role-based assignment"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                    />
                  </div>
                </div>
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded mt-0.5"
                    title="Remove step"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard/settings/approvals')}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Create Chain
        </button>
      </div>
    </form>
  );
}
