import { ExportButton, ImportButton } from './_actions.js';

const EXPORTS = [
  { type: 'invoices' as const, title: 'Invoices', description: 'Download all invoices as CSV' },
  { type: 'employees' as const, title: 'Employees', description: 'Download all employee records as CSV' },
  { type: 'inventory' as const, title: 'Inventory', description: 'Download all inventory items as CSV' },
  { type: 'expenses' as const, title: 'Expenses', description: 'Download all expense records as CSV' },
];

const IMPORTS = [
  { type: 'employees' as const, title: 'Employees', description: 'Upload a CSV to bulk-import employees' },
  { type: 'inventory' as const, title: 'Inventory', description: 'Upload a CSV to bulk-import inventory items' },
];

export default function ImportExportPage() {
  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Import &amp; Export</h1>
        <p className="mt-1 text-sm text-gray-500">Bulk import data or export records as CSV.</p>
      </div>

      {/* Export section */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Export</h2>
        <div className="space-y-3">
          {EXPORTS.map(({ type, title, description }) => (
            <div
              key={type}
              className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
              <ExportButton type={type} label={title} />
            </div>
          ))}
        </div>
      </section>

      {/* Import section */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Import</h2>
        <div className="space-y-3">
          {IMPORTS.map(({ type, title, description }) => (
            <div
              key={type}
              className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
              <ImportButton type={type} label={title} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
