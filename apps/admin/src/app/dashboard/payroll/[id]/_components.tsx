'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Play, AlertTriangle, DollarSign, RefreshCw } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface PayrollRunItem {
  id: string;
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
  hoursWorked?: number;
  grossPay?: number;
  tax?: number;
  socialSecurity?: number;
  medicare?: number;
  totalDeductions?: number;
  netPay?: number;
}

interface PayrollRunDetail {
  id: string;
  name?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  currency?: string;
  employeeCount?: number;
  totalGross?: number;
  totalNet?: number;
  status?: string;
  notes?: string;
  items?: PayrollRunItem[];
  data?: Record<string, unknown>;
  payslips?: Array<{
    id: string;
    data?: {
      employee_name?: string;
      employee_email?: string;
      hours_worked?: number;
      gross_pay?: number;
      tax?: number;
      social_security?: number;
      medicare?: number;
      total_deductions?: number;
      net_pay?: number;
    };
  }>;
}

function fmt(amount?: number, currency = 'USD') {
  if (amount == null) return '—';
  return amount.toLocaleString('en-US', { style: 'currency', currency });
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    processing: 'bg-blue-50 text-blue-700',
    approved: 'bg-indigo-50 text-indigo-700',
    paid: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-600',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {label}
    </span>
  );
}

function normalizeItems(run: PayrollRunDetail): PayrollRunItem[] {
  if (run.items && run.items.length > 0) return run.items;
  if (run.payslips && run.payslips.length > 0) {
    return run.payslips.map(
      (ps): PayrollRunItem => ({
        id: ps.id,
        ...(ps.data?.employee_name !== undefined && { employeeName: ps.data.employee_name }),
        ...(ps.data?.employee_email !== undefined && { employeeEmail: ps.data.employee_email }),
        ...(ps.data?.hours_worked !== undefined && { hoursWorked: ps.data.hours_worked }),
        ...(ps.data?.gross_pay !== undefined && { grossPay: ps.data.gross_pay }),
        ...(ps.data?.tax !== undefined && { tax: ps.data.tax }),
        ...(ps.data?.social_security !== undefined && { socialSecurity: ps.data.social_security }),
        ...(ps.data?.medicare !== undefined && { medicare: ps.data.medicare }),
        ...(ps.data?.total_deductions !== undefined && {
          totalDeductions: ps.data.total_deductions,
        }),
        ...(ps.data?.net_pay !== undefined && { netPay: ps.data.net_pay }),
      }),
    );
  }
  return [];
}

function normalizeRun(run: PayrollRunDetail) {
  const d = run.data ?? {};
  const str = (k: string) =>
    run[k as keyof typeof run] ?? d[k] ?? d[k.replace(/([A-Z])/g, '_$1').toLowerCase()];
  return {
    name: (run.name ?? (d['name'] as string)) || '',
    period: (run.period ?? (d['period'] as string)) || 'monthly',
    periodStart:
      (run.periodStart ?? (d['periodStart'] as string) ?? (d['period_start'] as string)) || '',
    periodEnd: (run.periodEnd ?? (d['periodEnd'] as string) ?? (d['period_end'] as string)) || '',
    currency: (run.currency ?? (d['currency'] as string)) || 'USD',
    employeeCount: Number(run.employeeCount ?? d['employeeCount'] ?? d['employee_count'] ?? 0),
    totalGross: Number(run.totalGross ?? d['totalGross'] ?? d['total_gross'] ?? 0) || undefined,
    totalNet: Number(run.totalNet ?? d['totalNet'] ?? d['total_net'] ?? 0) || undefined,
    status: (run.status ?? (d['status'] as string)) || 'draft',
    notes: (run.notes ?? (d['notes'] as string)) || '',
  };
}

export function PayrollRunDetailClient({
  run,
  runId,
  tenantId,
}: {
  run: PayrollRunDetail;
  runId: string;
  tenantId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [notesSaving, setNotesSaving] = useState(false);

  const r = normalizeRun(run);
  const items = normalizeItems(run);
  const notesVal = notes !== '' ? notes : r.notes;

  async function transition(status: string) {
    setActionLoading(status);
    try {
      await fetch(`${API_BASE}/payroll-runs/${runId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ status }),
      });
      startTransition(() => router.refresh());
    } finally {
      setActionLoading(null);
    }
  }

  async function recalculate() {
    setActionLoading('recalculate');
    try {
      await fetch(`${API_BASE}/payroll-runs/${runId}/recalculate`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId },
      });
      startTransition(() => router.refresh());
    } finally {
      setActionLoading(null);
    }
  }

  async function viewPayslip(itemId: string) {
    try {
      const res = await fetch(`${API_BASE}/payroll-runs/${runId}/payslip/${itemId}`, {
        headers: { 'x-tenant-id': tenantId },
      });
      if (!res.ok) throw new Error('Failed to fetch payslip');
      const html = await res.text();
      const w = window.open('about:blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        w.print();
      }
    } catch {
      alert('Could not load payslip');
    }
  }

  async function saveNotes() {
    setNotesSaving(true);
    try {
      await fetch(`${API_BASE}/payroll-runs/${runId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ notes: notesVal }),
      });
    } finally {
      setNotesSaving(false);
    }
  }

  // Totals from items
  const totals = items.reduce(
    (acc, item) => ({
      hours: acc.hours + (item.hoursWorked ?? 0),
      gross: acc.gross + (item.grossPay ?? 0),
      tax: acc.tax + (item.tax ?? 0),
      ss: acc.ss + (item.socialSecurity ?? 0),
      medicare: acc.medicare + (item.medicare ?? 0),
      deductions: acc.deductions + (item.totalDeductions ?? 0),
      net: acc.net + (item.netPay ?? 0),
    }),
    { hours: 0, gross: 0, tax: 0, ss: 0, medicare: 0, deductions: 0, net: 0 },
  );

  return (
    <div className="px-8 py-8 max-w-7xl">
      <div className="mb-4">
        <a href="/dashboard/payroll" className="text-xs text-gray-400 hover:text-gray-700">
          ← Payroll
        </a>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{r.name || 'Payroll Run'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={r.status} />
            <span className="text-sm text-gray-400">{r.employeeCount} employees</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-0.5">Total Gross</p>
          <p className="text-3xl font-bold text-gray-900">{fmt(r.totalGross, r.currency)}</p>
          <p className="text-sm text-gray-500">Net: {fmt(r.totalNet, r.currency)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => void recalculate()}
          disabled={actionLoading !== null}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={actionLoading === 'recalculate' ? 'animate-spin' : ''} />
          Recalculate
        </button>
        {r.status === 'processing' && (
          <button
            onClick={() => void transition('approved')}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle size={14} />
            {actionLoading === 'approved' ? 'Approving…' : 'Approve'}
          </button>
        )}
        {r.status === 'approved' && (
          <button
            onClick={() => void transition('paid')}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <DollarSign size={14} />
            {actionLoading === 'paid' ? 'Processing…' : 'Mark as Paid'}
          </button>
        )}
        {r.status !== 'cancelled' && r.status !== 'paid' && (
          <button
            onClick={() => void transition('cancelled')}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <AlertTriangle size={14} />
            {actionLoading === 'cancelled' ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
      </div>

      {/* Employee breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Employee Breakdown ({items.length})
          </h2>
        </div>
        {items.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">
            No employee records for this run.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Employee
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Email</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Hours</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">
                    Gross Pay
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Tax</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">SS</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">
                    Medicare
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">
                    Deductions
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">
                    Net Pay
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.employeeName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.employeeEmail ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {item.hoursWorked ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {fmt(item.grossPay, r.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {fmt(item.tax, r.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {fmt(item.socialSecurity, r.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {fmt(item.medicare, r.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {fmt(item.totalDeductions, r.currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">
                      {fmt(item.netPay, r.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void viewPayslip(item.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 whitespace-nowrap"
                      >
                        View payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-sm text-gray-700" colSpan={2}>
                    Totals
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">
                    {totals.hours.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900">
                    {fmt(totals.gross, r.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">
                    {fmt(totals.tax, r.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">
                    {fmt(totals.ss, r.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">
                    {fmt(totals.medicare, r.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-red-600">
                    {fmt(totals.deductions, r.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-green-700">
                    {fmt(totals.net, r.currency)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h2>
          <button
            onClick={() => void saveNotes()}
            disabled={notesSaving}
            className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {notesSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
        <div className="p-4">
          <textarea
            value={notesVal}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add notes about this payroll run…"
            className="w-full text-sm text-gray-700 outline-none resize-none placeholder-gray-300"
          />
        </div>
      </div>
    </div>
  );
}
