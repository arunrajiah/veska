import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { SendInvoiceButton, MarkAsPaidForm } from './_components.js';
import { AttachmentsPanel } from '@/components/attachments.js';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface InvoiceRecord {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-indigo-100 text-indigo-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-400',
};

function formatCurrency(value: unknown, currency = 'USD'): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';
  const { id } = params;

  let record: InvoiceRecord | null = null;
  try {
    record = await apiFetch<InvoiceRecord>(`/api/v1/entities/Invoice/${id}`, tenantId);
  } catch {
    record = null;
  }

  if (!record) {
    return (
      <div className="px-8 py-8 max-w-4xl">
        <p className="text-gray-500 text-sm">Invoice not found.</p>
        <Link href="/dashboard/finance/invoices" className="mt-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to invoices
        </Link>
      </div>
    );
  }

  const d = record.data;
  const status = (d['status'] as string) ?? 'draft';
  const currency = (d['currency'] as string) ?? 'USD';
  const lineItems: LineItem[] = Array.isArray(d['line_items'])
    ? (d['line_items'] as LineItem[])
    : [];

  const metaFields: Array<{ label: string; value: string }> = [
    { label: 'Number', value: String(d['number'] ?? '') },
    { label: 'Customer', value: String(d['customer'] ?? d['customer_name'] ?? '') },
    { label: 'Issue date', value: typeof d['issue_date'] === 'string' ? d['issue_date'].slice(0, 10) : '' },
    { label: 'Due date', value: typeof d['due_date'] === 'string' ? d['due_date'].slice(0, 10) : '' },
    { label: 'Currency', value: currency },
  ];

  const canSend = ['draft', 'viewed'].includes(status);
  const canMarkPaid = ['sent', 'overdue', 'viewed'].includes(status);

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/finance/invoices" className="text-xs text-gray-400 hover:text-gray-700">
          ← Invoices
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {String(d['number'] ?? 'Invoice')}
          </h1>
          <span
            className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {status}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {canSend && <SendInvoiceButton invoiceId={id} tenantId={tenantId} />}
          {canMarkPaid && <MarkAsPaidForm invoiceId={id} tenantId={tenantId} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Meta */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h2>
          </div>
          <dl className="divide-y divide-gray-50">
            {metaFields.map(({ label, value }) => (
              <div key={label} className="px-5 py-3 flex items-baseline gap-2">
                <dt className="text-xs text-gray-500 w-20 shrink-0">{label}</dt>
                <dd className="text-sm text-gray-900">{value || <span className="text-gray-300">—</span>}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Totals */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Totals</h2>
          </div>
          <dl className="divide-y divide-gray-50">
            <div className="px-5 py-3 flex items-baseline justify-between">
              <dt className="text-xs text-gray-500">Subtotal</dt>
              <dd className="text-sm text-gray-900">{formatCurrency(d['subtotal'], currency)}</dd>
            </div>
            <div className="px-5 py-3 flex items-baseline justify-between">
              <dt className="text-xs text-gray-500">Tax</dt>
              <dd className="text-sm text-gray-900">{formatCurrency(d['tax'], currency)}</dd>
            </div>
            <div className="px-5 py-3 flex items-baseline justify-between">
              <dt className="text-sm font-semibold text-gray-900">Total</dt>
              <dd className="text-sm font-semibold text-gray-900">{formatCurrency(d['total'], currency)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Line items */}
      {lineItems.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line items</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Description</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">Qty</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">Unit price</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 text-gray-900">{item.description}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{item.quantity}</td>
                  <td className="px-5 py-3 text-right text-gray-600">
                    {formatCurrency(item.unit_price, currency)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(item.amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {d['notes'] && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h2>
          </div>
          <p className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">{String(d['notes'])}</p>
        </div>
      )}

      {/* Attachments */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Attachments</h2>
        <AttachmentsPanel entityType="invoice" entityId={record.id} />
      </section>
    </div>
  );
}
