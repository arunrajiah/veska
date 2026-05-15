import { apiFetch } from '@/lib/api.js';
import { PrintButton } from './_print-button.js';

// ── Types ─────────────────────────────────────────────────────
interface PayrollData {
  employeeId?: string;
  employeeName?: string;
  employeeTitle?: string;
  department?: string;
  runId?: string;
  period?: string;
  payDate?: string;
  grossPay?: number;
  netPay?: number;
  tax?: number;
  deductions?: Array<{ name: string; amount: number }>;
  allowances?: Array<{ name: string; amount: number }>;
  status?: 'draft' | 'paid';
  currency?: string;
}

interface PayrollRecord {
  id: string;
  data: PayrollData;
  createdAt: string;
  updatedAt?: string;
}

// ── Helpers ───────────────────────────────────────────────────
function fmt(value: number | undefined | null, currency = 'USD'): string {
  if (value == null || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

function buildDeductions(d: PayrollData): Array<{ name: string; amount: number }> {
  const deductions: Array<{ name: string; amount: number }> = [];

  // Use explicit deductions array if available
  if (d.deductions && d.deductions.length > 0) {
    deductions.push(...d.deductions);
  } else {
    // Fall back to derived deductions
    const gross = d.grossPay ?? 0;
    const net = d.netPay ?? 0;
    const tax = d.tax ?? gross * 0.22; // estimate if not provided
    const remaining = gross - net - tax;

    if (tax > 0) deductions.push({ name: 'Federal Income Tax', amount: tax });
    if (remaining > 0) {
      const ss = gross * 0.062;
      const medicare = gross * 0.0145;
      deductions.push({ name: 'Social Security', amount: Math.min(ss, remaining * 0.7) });
      deductions.push({ name: 'Medicare', amount: Math.min(medicare, remaining * 0.3) });
    }
  }

  return deductions;
}

// ── Page ──────────────────────────────────────────────────────
export default async function PayslipPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let payslip: PayrollRecord | null = null;
  try {
    payslip = await apiFetch<PayrollRecord>(`/api/v1/payroll/${id}`, tenantId);
  } catch {
    payslip = null;
  }

  if (!payslip) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#374151' }}>
        Payslip not found.
      </div>
    );
  }

  const d = payslip.data;
  const currency = d.currency ?? 'USD';
  const deductions = buildDeductions(d);
  const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);
  const allowances = d.allowances ?? [];
  const period = d.period ?? payslip.createdAt.slice(0, 7);
  const payDate = d.payDate ?? payslip.updatedAt?.slice(0, 10) ?? payslip.createdAt.slice(0, 10);
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
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 48px;
        }
        .slip-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .logo {
          width: 48px; height: 48px;
          background: #111827; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 20px; line-height: 1;
        }
        .company-name { font-size: 16px; font-weight: 700; margin-top: 8px; }
        .company-sub { font-size: 12px; color: #6b7280; }
        .slip-meta { text-align: right; }
        .slip-meta h1 { font-size: 24px; font-weight: 800; color: #111827; }
        .slip-meta .slip-period { font-size: 14px; color: #6b7280; margin-top: 4px; }
        .status-badge {
          display: inline-block; margin-top: 8px;
          padding: 2px 10px; border-radius: 999px;
          font-size: 11px; font-weight: 600;
          background: #f3f4f6; color: #374151;
        }
        .employee-section {
          background: #f9fafb; border-radius: 8px;
          padding: 20px 24px; margin-bottom: 28px;
          display: flex; justify-content: space-between; align-items: flex-start;
        }
        .emp-block .e-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 4px; }
        .emp-block .e-value { font-size: 15px; font-weight: 600; }
        .emp-block .e-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
        .summary-card { padding: 16px 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; }
        .summary-card .s-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 4px; }
        .summary-card .s-value { font-size: 20px; font-weight: 700; color: #111827; }
        .summary-card.highlight { background: #111827; border-color: #111827; }
        .summary-card.highlight .s-label { color: #9ca3af; }
        .summary-card.highlight .s-value { color: #fff; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
        thead tr { border-bottom: 2px solid #111827; }
        th { padding: 8px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; text-align: left; }
        th:last-child { text-align: right; }
        tbody tr { border-bottom: 1px solid #f3f4f6; }
        td { padding: 10px 12px; font-size: 14px; color: #374151; }
        td:last-child { text-align: right; font-weight: 500; }
        tfoot td { padding: 10px 12px; font-weight: 700; font-size: 14px; border-top: 2px solid #111827; }
        tfoot td:last-child { text-align: right; }
        .net-pay-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 24px; background: #111827; border-radius: 10px;
          margin-bottom: 28px;
        }
        .net-pay-row .np-label { font-size: 14px; font-weight: 600; color: #9ca3af; }
        .net-pay-row .np-value { font-size: 24px; font-weight: 800; color: #fff; }
        .slip-footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
        .slip-footer span { font-size: 12px; color: #9ca3af; }
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
        <div className="slip-header">
          <div>
            <div className="logo">V</div>
            <div className="company-name">Veska Inc.</div>
            <div className="company-sub">payroll@veska.io</div>
          </div>
          <div className="slip-meta">
            <h1>PAYSLIP</h1>
            <div className="slip-period">Period: {period}</div>
            <span className="status-badge">{status}</span>
          </div>
        </div>

        {/* Employee info */}
        <div className="employee-section">
          <div className="emp-block">
            <div className="e-label">Employee</div>
            <div className="e-value">{d.employeeName ?? 'Unknown Employee'}</div>
            {d.employeeTitle && <div className="e-sub">{d.employeeTitle}</div>}
            {d.department && <div className="e-sub">{d.department}</div>}
          </div>
          <div className="emp-block" style={{ textAlign: 'right' }}>
            <div className="e-label">Pay Date</div>
            <div className="e-value">{payDate}</div>
            {d.employeeId && <div className="e-sub">ID: {d.employeeId}</div>}
          </div>
        </div>

        {/* Summary cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="s-label">Gross Pay</div>
            <div className="s-value">{fmt(d.grossPay, currency)}</div>
          </div>
          <div className="summary-card">
            <div className="s-label">Total Deductions</div>
            <div className="s-value">{fmt(totalDeductions, currency)}</div>
          </div>
          <div className="summary-card highlight">
            <div className="s-label">Net Pay</div>
            <div className="s-value">{fmt(d.netPay, currency)}</div>
          </div>
        </div>

        {/* Allowances / Earnings */}
        {allowances.length > 0 && (
          <>
            <div className="section-title">Earnings &amp; Allowances</div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Salary</td>
                  <td>{fmt(d.grossPay, currency)}</td>
                </tr>
                {allowances.map((a, i) => (
                  <tr key={i}>
                    <td>{a.name}</td>
                    <td>{fmt(a.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total Earnings</td>
                  <td>{fmt(d.grossPay, currency)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {/* Deductions */}
        <div className="section-title">Deductions</div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {deductions.length > 0 ? (
              deductions.map((item, i) => (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td>{fmt(item.amount, currency)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                  No deductions recorded
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td>Total Deductions</td>
              <td>{fmt(totalDeductions, currency)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Net pay highlight */}
        <div className="net-pay-row">
          <span className="np-label">Net Pay — {period}</span>
          <span className="np-value">{fmt(d.netPay, currency)}</span>
        </div>

        {/* Footer */}
        <div className="slip-footer">
          <span>This is a computer-generated payslip and does not require a signature.</span>
          <span>Payslip ID: {payslip.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>
    </>
  );
}
