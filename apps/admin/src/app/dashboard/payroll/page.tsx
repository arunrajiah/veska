'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  Play,
  Eye,
  FileText,
  Settings,
  ChevronRight,
} from 'lucide-react';

interface PayrollRun {
  id: string;
  data: {
    runNumber?: number;
    period?: string;
    status?: 'draft' | 'processing' | 'completed' | 'failed';
    totalGross?: number;
    totalNet?: number;
    totalTax?: number;
    employeeCount?: number;
    processedAt?: string;
    notes?: string;
  };
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PayrollPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/payroll/runs?limit=10', {
          headers: { 'x-tenant-id': 'demo-tenant' },
        });
        if (res.ok) {
          const json = await res.json() as { data?: PayrollRun[] } | PayrollRun[];
          const data = Array.isArray(json) ? json : (json.data ?? []);
          setRuns(data);
        }
      } catch {
        // leave empty
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const completedRuns = runs.filter((r) => r.data.status === 'completed');
  const lastRun = completedRuns[0] ?? runs[0];
  const totalHeadcount = lastRun?.data.employeeCount ?? 0;
  const totalCostThisMonth = completedRuns.reduce((s, r) => s + (r.data.totalNet ?? 0), 0);

  // Guess next payroll date: last day of current month
  const now = new Date();
  const nextPayroll = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage pay runs, payslips, and payroll settings</p>
        </div>
        <Link
          href="/dashboard/payroll/runs/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Play size={14} />
          Run Payroll
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Users size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Headcount</p>
            <p className="text-2xl font-semibold text-gray-900 mt-0.5">{totalHeadcount || '—'}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="p-2 bg-green-50 rounded-lg">
            <Calendar size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Payroll Run</p>
            <p className="text-lg font-semibold text-gray-900 mt-0.5">
              {lastRun ? fmtDate(lastRun.data.processedAt ?? lastRun.data.period) : '—'}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Next Payroll Date</p>
            <p className="text-lg font-semibold text-gray-900 mt-0.5">
              {nextPayroll.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="p-2 bg-amber-50 rounded-lg">
            <DollarSign size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Payroll Cost This Month</p>
            <p className="text-2xl font-semibold text-gray-900 mt-0.5">
              {totalCostThisMonth > 0 ? fmt(totalCostThisMonth) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent payroll runs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Payroll Runs</h2>
          <Link href="/dashboard/payroll/runs" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading payroll runs…</div>
        ) : runs.length === 0 ? (
          <div className="p-8 text-center">
            <DollarSign size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 font-medium">No payroll runs yet</p>
            <p className="text-xs text-gray-400 mt-1">Start your first pay run to see it here.</p>
            <Link
              href="/dashboard/payroll/runs/new"
              className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Play size={13} /> Run Payroll
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium">Period</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Employee Count</th>
                  <th className="text-right px-5 py-3 font-medium">Total Amount</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.slice(0, 8).map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {run.data.period ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[run.data.status ?? ''] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {run.data.status ?? 'unknown'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {run.data.employeeCount ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      {run.data.totalNet != null ? fmt(run.data.totalNet) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/dashboard/payroll/runs/${run.id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        <Eye size={13} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/dashboard/payroll/runs', icon: Play, label: 'Payroll Runs', desc: 'Manage and process pay runs' },
          { href: '/dashboard/payroll/payslips', icon: FileText, label: 'Payslips', desc: 'View and download payslips' },
          { href: '/dashboard/settings', icon: Settings, label: 'Settings', desc: 'Configure payroll settings' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href as any}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                <link.icon size={18} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{link.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
