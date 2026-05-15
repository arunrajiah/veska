'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface PayrollItem {
  id: string;
  data: {
    employeeId?: string;
    employeeName?: string;
    runId?: string;
    period?: string;
    grossPay?: number;
    netPay?: number;
    tax?: number;
    deductions?: Array<{ name: string; amount: number }>;
    allowances?: Array<{ name: string; amount: number }>;
    status?: 'draft' | 'paid';
  };
}

function usd(v?: number) {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

export function PayslipsClient({ payslips }: { payslips: PayrollItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  // Collect unique periods
  const periods = Array.from(new Set(payslips.map((p) => p.data?.period).filter(Boolean) as string[])).sort();

  const filtered = periodFilter === 'all' ? payslips : payslips.filter((p) => p.data?.period === periodFilter);

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payslips</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} payslip{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {periods.length > 0 && (
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          >
            <option value="all">All Periods</option>
            {periods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-16 text-center">
          <p className="text-gray-400 text-sm">No payslips found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-8 px-4 py-3" />
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Period</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Gross</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Deductions</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tax</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Net</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((slip) => {
                const sd = slip.data;
                const isExpanded = expandedId === slip.id;
                const totalDeductions = (sd?.deductions ?? []).reduce((s, d) => s + (d.amount ?? 0), 0);
                const hasBreakdown = (sd?.deductions?.length ?? 0) > 0 || (sd?.allowances?.length ?? 0) > 0;

                return (
                  <>
                    <tr
                      key={slip.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : slip.id)}
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {hasBreakdown ? (
                          isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{sd?.employeeName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{sd?.period ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{usd(sd?.grossPay)}</td>
                      <td className="px-4 py-3 text-gray-600">{totalDeductions > 0 ? usd(totalDeductions) : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{usd(sd?.tax)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{usd(sd?.netPay)}</td>
                      <td className="px-4 py-3">
                        {sd?.status === 'paid' ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">Paid</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">Draft</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && hasBreakdown && (
                      <tr key={`${slip.id}-expanded`} className="border-b border-gray-100 bg-gray-50/50">
                        <td colSpan={8} className="px-8 py-4">
                          <div className="grid grid-cols-2 gap-6">
                            {(sd?.deductions?.length ?? 0) > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Deductions</p>
                                <table className="w-full text-xs">
                                  <tbody>
                                    {(sd?.deductions ?? []).map((d, i) => (
                                      <tr key={i} className="border-b border-gray-100 last:border-0">
                                        <td className="py-1 text-gray-600">{d.name}</td>
                                        <td className="py-1 text-right text-gray-900 font-medium">{usd(d.amount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {(sd?.allowances?.length ?? 0) > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Allowances</p>
                                <table className="w-full text-xs">
                                  <tbody>
                                    {(sd?.allowances ?? []).map((a, i) => (
                                      <tr key={i} className="border-b border-gray-100 last:border-0">
                                        <td className="py-1 text-gray-600">{a.name}</td>
                                        <td className="py-1 text-right text-gray-900 font-medium">{usd(a.amount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
