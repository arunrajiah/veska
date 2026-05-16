import Link from 'next/link';
import { Plus, Pencil, Trash2, Sliders } from 'lucide-react';
import type { CustomFieldDef } from '@/components/custom-field-form.js';

const TYPE_COLORS: Record<string, string> = {
  text: 'bg-blue-100 text-blue-700',
  number: 'bg-purple-100 text-purple-700',
  date: 'bg-orange-100 text-orange-700',
  boolean: 'bg-green-100 text-green-700',
  select: 'bg-indigo-100 text-indigo-700',
  textarea: 'bg-gray-100 text-gray-600',
};

const ENTITY_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  expense: 'Expense',
  employee: 'Employee',
  purchase_order: 'Purchase Order',
  project: 'Project',
  deal: 'Deal',
  contact: 'Contact',
};

async function fetchDefs(): Promise<CustomFieldDef[]> {
  try {
    const res = await fetch(
      'http://localhost:3001/api/v1/custom-fields/defs?tenantId=demo',
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data ?? []);
  } catch {
    return [];
  }
}

export default async function CustomFieldsPage() {
  const defs = await fetchDefs();

  // Group by entityType
  const grouped = defs.reduce<Record<string, CustomFieldDef[]>>((acc, def) => {
    const key = def.entityType ?? 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(def);
    return acc;
  }, {});

  const entityTypes = Object.keys(grouped).sort();

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Sliders size={22} className="text-indigo-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Custom Fields</h1>
          </div>
          <p className="text-sm text-gray-500 ml-9">
            Add extra fields to invoices, expenses, employees, and other records.
          </p>
        </div>
        <Link
          href="/dashboard/settings/custom-fields/new"
          className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          Add Field
        </Link>
      </div>

      {defs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-20 text-center">
          <Sliders size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 font-medium mb-1">No custom fields yet</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mb-5">
            Create custom fields to capture additional information on your records.
          </p>
          <Link
            href="/dashboard/settings/custom-fields/new"
            className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} />
            Add your first field
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {entityTypes.map((entityType) => {
            const entityDefs = (grouped[entityType] ?? []).sort(
              (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
            );
            const label = ENTITY_LABELS[entityType] ?? entityType;

            return (
              <div key={entityType}>
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  {label}
                </h2>

                {entityDefs.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl px-6 py-8 text-center text-sm text-gray-400">
                    No fields for {label} yet.
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                            Label
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                            Name
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                            Type
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                            Required
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                            Order
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                            Enabled
                          </th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {entityDefs.map((def) => (
                          <tr
                            key={def.id}
                            className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">{def.label}</td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                {def.name}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[def.type] ?? 'bg-gray-100 text-gray-600'}`}
                              >
                                {def.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {def.required ? (
                                <span className="text-green-600 font-semibold">✓</span>
                              ) : (
                                <span className="text-gray-300">−</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              {def.sortOrder ?? 0}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-medium ${
                                  def.enabled !== false ? 'text-green-600' : 'text-gray-400'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${def.enabled !== false ? 'bg-green-500' : 'bg-gray-300'}`}
                                />
                                {def.enabled !== false ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/dashboard/settings/custom-fields/${def.id}/edit` as any}
                                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-2 py-1 rounded-lg transition-colors"
                                >
                                  <Pencil size={11} />
                                  Edit
                                </Link>
                                <button className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 border border-red-100 px-2 py-1 rounded-lg transition-colors">
                                  <Trash2 size={11} />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
