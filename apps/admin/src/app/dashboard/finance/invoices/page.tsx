import Link from 'next/link';
import { Plus } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-indigo-100 text-indigo-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-400',
};

const STUB_INVOICES = [
  { id: 'INV-001', number: 'INV-001', customer: 'Nexus Labs', total: '$8,000', status: 'paid', issueDate: '2026-04-01', dueDate: '2026-04-30' },
  { id: 'INV-002', number: 'INV-002', customer: 'BrightPath', total: '$2,400', status: 'sent', issueDate: '2026-05-01', dueDate: '2026-05-31' },
  { id: 'INV-003', number: 'INV-003', customer: 'TechVault', total: '$12,500', status: 'overdue', issueDate: '2026-04-15', dueDate: '2026-05-15' },
  { id: 'INV-004', number: 'INV-004', customer: 'GreenLeaf Co', total: '$3,500', status: 'draft', issueDate: '2026-05-10', dueDate: '2026-06-10' },
];

const totalOutstanding = STUB_INVOICES
  .filter((i) => ['sent', 'overdue'].includes(i.status))
  .reduce((s, i) => s + parseFloat(i.total.replace(/[$,]/g, '')), 0);

export default function InvoicesPage() {
  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            ${totalOutstanding.toLocaleString()} outstanding
          </p>
        </div>
        <Link
          href="/dashboard/finance/invoices/new"
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus size={15} />
          New invoice
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-5">
        {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map((s) => (
          <button
            key={s}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 capitalize transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Number</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Issue date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Due date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {STUB_INVOICES.map((inv) => (
              <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{inv.number}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{inv.customer}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{inv.issueDate}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{inv.dueDate}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{inv.total}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/dashboard/finance/invoices/${inv.id}`} className="text-xs text-gray-500 hover:text-gray-900">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
