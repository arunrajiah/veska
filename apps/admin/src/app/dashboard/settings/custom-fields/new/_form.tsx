'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

const ENTITY_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'expense', label: 'Expense' },
  { value: 'employee', label: 'Employee' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'project', label: 'Project' },
  { value: 'deal', label: 'Deal' },
  { value: 'contact', label: 'Contact' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select' },
  { value: 'textarea', label: 'Textarea' },
];

function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900';

export default function NewCustomFieldForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [entityType, setEntityType] = useState('invoice');
  const [label, setLabel] = useState('');
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [type, setType] = useState('text');
  const [required, setRequired] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState('');

  function handleLabelChange(val: string) {
    setLabel(val);
    if (!nameEdited) {
      setName(toSnakeCase(val));
    }
  }

  function handleNameChange(val: string) {
    setName(val);
    setNameEdited(true);
  }

  function addOption() {
    const trimmed = optionInput.trim();
    if (!trimmed || options.includes(trimmed)) return;
    setOptions((prev) => [...prev, trimmed]);
    setOptionInput('');
  }

  function removeOption(opt: string) {
    setOptions((prev) => prev.filter((o) => o !== opt));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const body: Record<string, unknown> = {
      tenantId: 'demo',
      entityType,
      label,
      name,
      type,
      required,
      sortOrder,
      enabled: true,
    };

    if (type === 'select') {
      body['options'] = options;
    }

    try {
      const res = await fetch('http://localhost:3001/api/v1/custom-fields/defs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/dashboard/settings/custom-fields');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create custom field');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        {/* Entity Type */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Entity Type <span className="text-red-500">*</span>
          </label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            required
            className={inputClass}
          >
            {ENTITY_TYPES.map((et) => (
              <option key={et.value} value={et.value}>
                {et.label}
              </option>
            ))}
          </select>
        </div>

        {/* Label */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            required
            placeholder="e.g. Project Code"
            className={inputClass}
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Name (snake_case) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            placeholder="e.g. project_code"
            className={`${inputClass} font-mono`}
          />
          <p className="text-xs text-gray-400 mt-1">
            Used as the field key. Auto-filled from label, but editable.
          </p>
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            className={inputClass}
          >
            {FIELD_TYPES.map((ft) => (
              <option key={ft.value} value={ft.value}>
                {ft.label}
              </option>
            ))}
          </select>
        </div>

        {/* Options — shown only when type=select */}
        {type === 'select' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Options</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addOption();
                  }
                }}
                placeholder="Add an option…"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Plus size={13} />
                Add
              </button>
            </div>
            {options.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {options.map((opt) => (
                  <span
                    key={opt}
                    className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full"
                  >
                    {opt}
                    <button
                      type="button"
                      onClick={() => removeOption(opt)}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Required */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="cf-required"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
          />
          <label htmlFor="cf-required" className="text-sm text-gray-700">
            Required
          </label>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Sort Order</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            min={0}
            className={`${inputClass} w-28`}
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Create Field'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-200 text-gray-600 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
