import { apiFetch } from '@/lib/api.js';
import { PrintButton } from './_print-button.js';

// ── Types ─────────────────────────────────────────────────────
interface InvoiceData {
  invoiceNumber?: string;
  number?: string;
  clientName?: string;
  customer?: string;
  customer_name?: string;
  clientEmail?: string;
  clientAddress?: string;
  status?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  dueDate?: string;
  due_date?: string;
  issuedAt?: string;
  issue_date?: string;
  lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  line_items?: Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
  notes?: string;
  currency?: string;
  paymentTerms?: string;
  bankDetails?: string;
}

interface InvoiceRecord {
  id: string;
  data: InvoiceData;
  createdAt: string;
  updatedAt?: string;
}

// ── Helpers ───────────────────────────────────────────────────
function fmt(value: unknown, currency = 'USD'): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

function getInvoiceNumber(record: InvoiceRecord): string {
  return record.data.invoiceNumber ?? record.data.number ?? record.id.slice(0, 8).toUpperCase();
}

function getClientName(record: InvoiceRecord): string {
  return (
    record.data.clientName ??
    record.data.customer ??
    record.data.customer_name ??
    '—'
  );
}

function getLineItems(record: InvoiceRecord) {
  if (record.data.lineItems && record.data.lineItems.length > 0) {
    return record.data.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      total: li.total,
    }));
  }
  if (record.data.line_items && record.data.line_items.length > 0) {
    return record.data.line_items.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unit_price,
      total: li.amount,
    }));
  }
  return [];
}

// ── Page ──────────────────────────────────────────────────────
export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let invoice: InvoiceRecord | null = null;
  try {
    invoice = await apiFetch<InvoiceRecord>(
      `/api/v1/finance/invoices/${id}`,
      tenantId,
    );
  } catch {
    invoice = null;
  }

  if (!invoice) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#374151' }}>
        Invoice not found.
      </div>
    );
  }

  const d = invoice.data;
  const currency = d.currency ?? 'USD';
  const lineItems = getLineItems(invoice);
  const invoiceNumber = getInvoiceNumber(invoice);
  const clientName = getClientName(invoice);
  const issueDate = (d.issuedAt ?? d.issue_date ?? invoice.createdAt ?? '').slice(0, 10);
  const dueDate = (d.dueDate ?? d.due_date ?? '').slice(0, 10);
  const status = (d.status ?? 'draft').toUpperCase();

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          color: #111827;
          background: #f9fafb;
          padding: 2rem;
        }
        .page {
          max-width: 800px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 48px;
        }
        .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .logo {
          width: 48px; height: 48px;
          background: #111827; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 20px;
          line-height: 1;
        }
        .company-name { font-size: 16px; font-weight: 700; margin-top: 8px; }
        .company-sub { font-size: 12px; color: #6b7280; }
        .invoice-meta { text-align: right; }
        .invoice-meta h1 { font-size: 28px; font-weight: 800; color: #111827; }
        .invoice-meta .inv-num { font-size: 14px; color: #6b7280; margin-top: 4px; }
        .status-badge {
          display: inline-block;
          margin-top: 8px;
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          background: #f3f4f6;
          color: #374151;
        }
        .parties { display: flex; justify-content: space-between; margin-bottom: 32px; }
        .party-block { flex: 1; }
        .party-block.right { text-align: right; }
        .party-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 4px; }
        .party-name { font-size: 15px; font-weight: 600; }
        .party-detail { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .dates-row { display: flex; gap: 40px; margin-bottom: 32px; padding: 16px 20px; background: #f9fafb; border-radius: 8px; }
        .date-item .d-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
        .date-item .d-value { font-size: 14px; font-weight: 600; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        thead tr { border-bottom: 2px solid #111827; }
        th { padding: 8px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; text-align: left; }
        th:not(:first-child) { text-align: right; }
        tbody tr { border-bottom: 1px solid #f3f4f6; }
        td { padding: 12px; font-size: 14px; color: #374151; vertical-align: top; }
        td:not(:first-child) { text-align: right; }
        .totals { margin-left: auto; width: 280px; }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #6b7280; }
        .totals-row.grand { border-top: 2px solid #111827; margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: 700; color: #111827; }
        .notes-block { margin-top: 32px; padding: 16px 20px; background: #f9fafb; border-radius: 8px; }
        .notes-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 6px; }
        .notes-text { font-size: 13px; color: #374151; white-space: pre-wrap; }
        .inv-footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
        .inv-footer span { font-size: 12px; color: #9ca3af; }
        .print-actions { max-width: 800px; margin: 0 auto 16px; display: flex; justify-content: flex-end; gap: 12px; }

        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0; }
          .page { border: none; border-radius: 0; padding: 32px; max-width: 100%; }
          @page { margin: 1cm; }
        }
      `}</style>

      <div className="no-print print-actions">
        <PrintButton />
      </div>

      <div className="page">
        {/* Header */}
        <div className="inv-header">
          <div>
            <div className="logo">V</div>
            <div className="company-name">Your Company</div>
            <div className="company-sub">billing@example.com</div>
          </div>
          <div className="invoice-meta">
            <h1>INVOICE</h1>
            <div className="inv-num">#{invoiceNumber}</div>
            <span className="status-badge">{status}</span>
          </div>
        </div>

        {/* Bill to / From */}
        <div className="parties">
          <div className="party-block">
            <div className="party-label">From</div>
            <div className="party-name">Your Company</div>
            <div className="party-detail">billing@example.com</div>
          </div>
          <div className="party-block right">
            <div className="party-label">Bill To</div>
            <div className="party-name">{clientName}</div>
            {d.clientEmail && <div className="party-detail">{d.clientEmail}</div>}
            {d.clientAddress && <div className="party-detail">{d.clientAddress}</div>}
          </div>
        </div>

        {/* Dates */}
        <div className="dates-row">
          <div className="date-item">
            <div className="d-label">Issue Date</div>
            <div className="d-value">{issueDate || '—'}</div>
          </div>
          <div className="date-item">
            <div className="d-label">Due Date</div>
            <div className="d-value">{dueDate || '—'}</div>
          </div>
          <div className="date-item">
            <div className="d-label">Currency</div>
            <div className="d-value">{currency}</div>
          </div>
          {d.paymentTerms && (
            <div className="date-item">
              <div className="d-label">Payment Terms</div>
              <div className="d-value">{d.paymentTerms}</div>
            </div>
          )}
        </div>

        {/* Line items */}
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length > 0 ? (
              lineItems.map((item, i) => (
                <tr key={i}>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{fmt(item.unitPrice, currency)}</td>
                  <td>{fmt(item.total, currency)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                  No line items
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="totals">
          <div className="totals-row">
            <span>Subtotal</span>
            <span>{fmt(d.subtotal, currency)}</span>
          </div>
          <div className="totals-row">
            <span>Tax</span>
            <span>{fmt(d.tax, currency)}</span>
          </div>
          <div className="totals-row grand">
            <span>Total Due</span>
            <span>{fmt(d.total, currency)}</span>
          </div>
        </div>

        {/* Notes */}
        {d.notes && (
          <div className="notes-block">
            <div className="notes-label">Notes</div>
            <div className="notes-text">{d.notes}</div>
          </div>
        )}

        {/* Payment details */}
        {d.bankDetails && (
          <div className="notes-block" style={{ marginTop: '16px' }}>
            <div className="notes-label">Payment Details</div>
            <div className="notes-text">{d.bankDetails}</div>
          </div>
        )}

        {/* Footer */}
        <div className="inv-footer">
          <span>Thank you for your business.</span>
          <span>Invoice #{invoiceNumber}</span>
        </div>
      </div>
    </>
  );
}
