'use client';

export interface CustomFieldDef {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
  sortOrder?: number;
  enabled?: boolean;
  entityType?: string;
}

interface CustomFieldFormProps {
  defs: CustomFieldDef[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900';

export default function CustomFieldForm({ defs, values, onChange }: CustomFieldFormProps) {
  const activeDefs = defs.filter((d) => d.enabled !== false);

  if (activeDefs.length === 0) return null;

  function update(name: string, value: unknown) {
    onChange({ ...values, [name]: value });
  }

  return (
    <div className="space-y-4">
      {activeDefs.map((def) => {
        const val = values[def.name];

        return (
          <div key={def.id}>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {def.label}
              {def.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {def.type === 'text' && (
              <input
                type="text"
                value={typeof val === 'string' ? val : ''}
                onChange={(e) => update(def.name, e.target.value)}
                required={def.required}
                className={inputClass}
              />
            )}

            {def.type === 'number' && (
              <input
                type="number"
                value={typeof val === 'number' ? val : typeof val === 'string' ? val : ''}
                onChange={(e) =>
                  update(def.name, e.target.value === '' ? '' : Number(e.target.value))
                }
                required={def.required}
                className={inputClass}
              />
            )}

            {def.type === 'date' && (
              <input
                type="date"
                value={typeof val === 'string' ? val.slice(0, 10) : ''}
                onChange={(e) => update(def.name, e.target.value)}
                required={def.required}
                className={inputClass}
              />
            )}

            {def.type === 'boolean' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`cf-${def.name}`}
                  checked={Boolean(val)}
                  onChange={(e) => update(def.name, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <label htmlFor={`cf-${def.name}`} className="text-sm text-gray-700">
                  {def.label}
                </label>
              </div>
            )}

            {def.type === 'select' && (
              <select
                value={typeof val === 'string' ? val : ''}
                onChange={(e) => update(def.name, e.target.value)}
                required={def.required}
                className={inputClass}
              >
                <option value="">Select…</option>
                {(def.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {def.type === 'textarea' && (
              <textarea
                value={typeof val === 'string' ? val : ''}
                onChange={(e) => update(def.name, e.target.value)}
                required={def.required}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
