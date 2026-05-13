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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (!amount || isNaN(amount)) return '$0';
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

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

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

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

// ─── Entity-type color mapping ────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardOverviewPage() {
  // Parallel fetches with independent error handling
  let stats: DashboardStats | null = null;
  let statsError = false;
  let activity: ActivityItem[] = [];

  const [statsResult, activityResult] = await Promise.allSettled([
    fetch('http://localhost:3001/api/v1/dashboard/stats?tenantId=demo', {
      cache: 'no-store',
    }).then((r) => {
      if (!r.ok) throw new Error(`stats ${r.status}`);
      return r.json() as Promise<DashboardStats>;
    }),
    fetch('http://localhost:3001/api/v1/dashboard/activity?tenantId=demo&limit=15', {
      cache: 'no-store',
    }).then((r) => {
      if (!r.ok) throw new Error(`activity ${r.status}`);
      return r.json() as Promise<ActivityItem[]>;
    }),
  ]);

  if (statsResult.status === 'fulfilled') {
    stats = statsResult.value;
  } else {
    statsError = true;
  }

  if (activityResult.status === 'fulfilled' && Array.isArray(activityResult.value)) {
    activity = activityResult.value;
  }

  // Safe accessor helpers that fall back to '—' display values
  const s = stats;
  const dash = '—';

  return (
    <div className="px-6 py-8 max-w-screen-xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-baseline gap-2">
        <h1 className="text-2xl font-semibold text-gray-900">Good morning, Veska Admin</h1>
        <span className="text-sm text-gray-400">&middot; {todayLabel()}</span>
      </div>

      {statsError && (
        <p className="text-xs text-red-500 -mt-4">
          Could not load stats — showing placeholder values.
        </p>
      )}

      {/* ── Top stat chips ──────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        {/* Outstanding invoices */}
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <DollarSign size={18} className="text-orange-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {s ? formatCurrency(s.finance.totalOutstandingInvoices) : dash}
            </p>
            <p className="text-xs text-gray-500">Outstanding</p>
          </div>
        </div>

        {/* Active employees */}
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {s ? s.hr.activeEmployees : dash}
            </p>
            <p className="text-xs text-gray-500">Employees</p>
          </div>
        </div>

        {/* Open orders */}
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <ShoppingCart size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {s ? s.sales.openOrdersCount : dash}
            </p>
            <p className="text-xs text-gray-500">Open Orders</p>
          </div>
        </div>

        {/* Pending approvals */}
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <CheckSquare size={18} className="text-indigo-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-gray-900">
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

      {/* ── Main content: KPIs (left) + Activity (right) ─────────────────────── */}
      <div className="grid grid-cols-3 gap-6 items-start">
        {/* Left column — KPI sections */}
        <div className="col-span-2 space-y-6">
          {/* Finance */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Finance
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                label="Paid This Month"
                value={s ? formatCurrency(s.finance.totalPaidThisMonth) : dash}
                valueColor="text-green-600"
              />
              <KpiCard
                label="Outstanding"
                value={s ? formatCurrency(s.finance.totalOutstandingInvoices) : dash}
                valueColor={s && s.finance.totalOutstandingInvoices > 0 ? 'text-amber-600' : undefined}
              />
              <KpiCard
                label="Pending Expenses"
                value={s ? formatCurrency(s.finance.totalExpensesPending) : dash}
              />
              <KpiCard
                label="Overdue Invoices"
                value={s ? String(s.finance.overdueInvoicesCount) : dash}
                valueColor={s && s.finance.overdueInvoicesCount > 0 ? 'text-red-600' : undefined}
              />
            </div>
          </section>

          {/* HR & People */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                HR &amp; People
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                label="Active Employees"
                value={s ? String(s.hr.activeEmployees) : dash}
              />
              <KpiCard
                label="Pending Leave"
                value={s ? String(s.hr.pendingLeaveRequests) : dash}
                valueColor={s && s.hr.pendingLeaveRequests > 0 ? 'text-amber-600' : undefined}
              />
              <KpiCard
                label="Payroll Runs (Month)"
                value={s ? String(s.hr.payrollRunsThisMonth) : dash}
              />
              <KpiCard
                label="Open Deals Value"
                value={s ? formatCurrency(s.sales.openDealsValue) : dash}
              />
            </div>
          </section>

          {/* Inventory & Operations */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Package size={15} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Inventory &amp; Operations
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                value={s ? formatCurrency(s.inventory.totalInventoryValue) : dash}
              />
              <KpiCard
                label="Hours This Week"
                value={s ? `${s.time.hoursLoggedThisWeek}h` : dash}
              />
            </div>
          </section>
        </div>

        {/* Right column — Activity Feed */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 h-full">
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
                    {item.label && (
                      <p className="text-xs text-gray-500 truncate">{item.label}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions strip ─────────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: '+ New Invoice', href: '/dashboard/finance/invoices/new' },
          { label: '+ New Expense', href: '/dashboard/finance/expenses/new' },
          { label: '+ New Sales Order', href: '/dashboard/sales/orders/new' },
          { label: '+ New Employee', href: '/dashboard/hr/employees/new' },
          { label: '+ Log Time', href: '/dashboard/time/new' },
          { label: 'View Reports', href: '/dashboard/reports' },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-4">
      <p className={`text-2xl font-semibold ${valueColor ?? 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
