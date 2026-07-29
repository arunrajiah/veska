'use client';

import Link from 'next/link';
import {
  DollarSign,
  Users,
  ShoppingCart,
  CheckSquare,
  TrendingUp,
  Package,
  Clock,
} from 'lucide-react';
import { AIInsightsWidget } from './_components.js';
import { DashboardRealtimeRefresh } from './_realtime-refresh.js';
import { useDashboardCurrency } from './_dashboard-client.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  finance: {
    totalPaidThisMonth: number;
    totalOutstandingInvoices: number;
    totalExpensesPending: number;
    overdueInvoicesCount: number;
  };
  hr: {
    activeEmployees: number;
    pendingLeaveRequests: number;
    payrollRunsThisMonth: number;
  };
  sales: {
    openOrdersCount: number;
    openDealsValue: number;
  };
  purchasing: {
    pendingApprovals: number;
  };
  inventory: {
    totalProducts: number;
    lowStockItems: number;
    totalInventoryValue: number;
  };
  time: {
    hoursLoggedThisWeek: number;
  };
}

interface ActivityItem {
  id: string;
  verb: string;
  label: string;
  entityType: string;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

const ENTITY_DOT: Record<string, string> = {
  invoice: 'bg-green-500',
  expense: 'bg-amber-500',
  employee: 'bg-blue-500',
  order: 'bg-purple-500',
  project: 'bg-indigo-500',
  deal: 'bg-emerald-500',
  leave: 'bg-orange-500',
  payroll: 'bg-teal-500',
  product: 'bg-rose-500',
};

function entityDot(entityType: string): string {
  return ENTITY_DOT[entityType?.toLowerCase()] ?? 'bg-gray-400';
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string | undefined;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-4">
      <p className={`text-2xl font-semibold ${valueColor ?? 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Dashboard body (client component, consumes currency context) ─────────────

export function DashboardBody({
  stats,
  statsError,
  activity,
  todayLabel,
  welcomeText,
  activeEmployeesLabel,
}: {
  stats: DashboardStats | null;
  statsError: boolean;
  activity: ActivityItem[];
  todayLabel: string;
  welcomeText: string;
  activeEmployeesLabel: string;
}) {
  const { currency, converted, currencySelector } = useDashboardCurrency();

  const s = stats;
  const dash = '—';

  const fmt = (usd: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact' }).format(
      usd,
    );

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-screen-xl mx-auto space-y-6">
      {/* Realtime SSE listener */}
      <DashboardRealtimeRefresh />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {welcomeText}, Veska Admin
          </h1>
          <span className="text-sm text-gray-400 hidden sm:inline">&middot; {todayLabel}</span>
        </div>
        {currencySelector}
      </div>

      {statsError && (
        <p className="text-xs text-red-500 -mt-4">
          Could not load stats — showing placeholder values.
        </p>
      )}

      {/* Top stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <DollarSign size={18} className="text-orange-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {s ? fmt(converted.totalOutstandingInvoices) : dash}
            </p>
            <p className="text-xs text-gray-500">Outstanding</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {s ? s.hr.activeEmployees : dash}
            </p>
            <p className="text-xs text-gray-500">{activeEmployeesLabel}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <ShoppingCart size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {s ? s.sales.openOrdersCount : dash}
            </p>
            <p className="text-xs text-gray-500">Open Orders</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <CheckSquare size={18} className="text-indigo-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {s ? s.purchasing.pendingApprovals : dash}
              </p>
              {s && s.purchasing.pendingApprovals > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-500">Pending Approvals</p>
          </div>
        </div>
      </div>

      {/* Main: KPIs + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Finance */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Finance
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <KpiCard
                label="Paid This Month"
                value={s ? fmt(converted.totalPaidThisMonth) : dash}
                valueColor="text-green-600"
              />
              <KpiCard
                label="Outstanding"
                value={s ? fmt(converted.totalOutstandingInvoices) : dash}
                valueColor={
                  s && s.finance.totalOutstandingInvoices > 0 ? 'text-amber-600' : undefined
                }
              />
              <KpiCard
                label="Pending Expenses"
                value={s ? fmt(converted.totalExpensesPending) : dash}
              />
              <KpiCard
                label="Overdue Invoices"
                value={s ? String(s.finance.overdueInvoicesCount) : dash}
                valueColor={s && s.finance.overdueInvoicesCount > 0 ? 'text-red-600' : undefined}
              />
            </div>
          </section>

          {/* HR */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                HR &amp; People
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <KpiCard label="Active Employees" value={s ? String(s.hr.activeEmployees) : dash} />
              <KpiCard
                label="Pending Leave"
                value={s ? String(s.hr.pendingLeaveRequests) : dash}
                valueColor={s && s.hr.pendingLeaveRequests > 0 ? 'text-amber-600' : undefined}
              />
              <KpiCard
                label="Payroll Runs (Mo)"
                value={s ? String(s.hr.payrollRunsThisMonth) : dash}
              />
              <KpiCard label="Open Deals Value" value={s ? fmt(converted.openDealsValue) : dash} />
            </div>
          </section>

          {/* Inventory */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Package size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Inventory &amp; Ops
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <KpiCard
                label="Total Products"
                value={s ? String(s.inventory.totalProducts) : dash}
              />
              <KpiCard
                label="Low Stock Items"
                value={s ? String(s.inventory.lowStockItems) : dash}
                valueColor={
                  s
                    ? s.inventory.lowStockItems > 0
                      ? 'text-red-600'
                      : 'text-green-600'
                    : undefined
                }
              />
              <KpiCard
                label="Inventory Value"
                value={s ? fmt(converted.totalInventoryValue) : dash}
              />
              <KpiCard
                label="Hours This Week"
                value={s ? `${s.time.hoursLoggedThisWeek}h` : dash}
              />
            </div>
          </section>
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 h-full">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-gray-400">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-2.5">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${entityDot(item.entityType)}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {item.verb}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                        {relativeTime(item.createdAt)}
                      </span>
                    </div>
                    {item.label && <p className="text-xs text-gray-500 truncate">{item.label}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: '+ New Invoice', href: '/dashboard/finance/invoices/new' },
          { label: '+ New Expense', href: '/dashboard/expenses/new' },
          { label: '+ New Sales Order', href: '/dashboard/sales/orders/new' },
          { label: '+ New Employee', href: '/dashboard/hr/employees/new' },
          { label: '+ Log Time', href: '/dashboard/time/new' },
          { label: 'View Reports', href: '/dashboard/reports' },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href as Parameters<typeof Link>[0]['href']}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            {action.label}
          </Link>
        ))}
      </div>

      {/* AI Insights */}
      <AIInsightsWidget />
    </div>
  );
}
