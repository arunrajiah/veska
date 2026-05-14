import type { CustomFieldDef } from './custom-field-form.js';

interface CustomFieldDisplayProps {
  defs: CustomFieldDef[];
  values: Record<string, unknown>;
}

function formatDate(val: string): string {
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatValue(def: CustomFieldDef, val: unknown): string | null {
  if (val === undefined || val === null || val === '') return null;

  if (def.type === 'boolean') {
    return val ? 'Yes' : 'No';
  }

  if (def.type === 'date' && typeof val === 'string') {
    return formatDate(val);
  }

  return String(val);
}

export default function CustomFieldDisplay({ defs, values }: CustomFieldDisplayProps) {
  const activeDefs = defs.filter((d) => d.enabled !== false);
  const pairs = activeDefs
    .map((def) => ({ def, formatted: formatValue(def, values[def.name]) }))
    .filter((p) => p.formatted !== null);

  if (pairs.length === 0) return null;

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {pairs.map(({ def, formatted }) => (
        <div key={def.id} className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium text-gray-500">{def.label}</dt>
          <dd className="text-sm text-gray-900">{formatted}</dd>
        </div>
      ))}
    </dl>
  );
}
