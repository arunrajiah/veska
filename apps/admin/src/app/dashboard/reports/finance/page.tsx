import { apiFetch } from '@/lib/api.js';

interface MonthEntry {
  month: string;
  invoiced: number;
  paid: number;
}

interface FinanceReport {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
  byMonth: MonthEntry[];
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default async function FinanceReportPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  let report: FinanceReport = {
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    overdueCount: 0,
    byMonth: [],
  };

  try {
    report = await apiFetch<FinanceReport>('/api/v1/reports/finance', tenantId);
  } catch {
    // fall through to empty state
  }

  const stats = [
    { label: 'Total invoiced', value: fmt(report.totalInvoiced), color: 'text-gray-900' },
    { label: 'Total paid', value: fmt(report.totalPaid), color: 'text-green-700' },
    { label: 'Outstanding', value: fmt(report.totalOutstanding), color: 'text-blue-700' },
    { label: 'Overdue invoices', value: report.overdueCount.toString(), color: 'text-red-600' },
  ];

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Finance Summary</h1>
        <p className="text-sm text-gray-500 mt-1">Invoice totals, payments, and monthly trends.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white border border-gray-200 rounded-xl p-5"
          >
            <p className="text-xs text-gray-500 mb-2">{s.label}</p>
            <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly trend */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Monthly trend (last 6 months)</h2>
        </div>
        {report.byMonth.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No invoice data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Month</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Invoiced</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Paid</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {report.byMonth.map((row) => (
                <tr key={row.month} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{row.month}</td>
                  <td className="px-5 py-3 text-right text-gray-900">{fmt(row.invoiced)}</td>
                  <td className="px-5 py-3 text-right text-green-700">{fmt(row.paid)}</td>
                  <td className="px-5 py-3 text-right text-blue-700">
                    {fmt(row.invoiced - row.paid)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
