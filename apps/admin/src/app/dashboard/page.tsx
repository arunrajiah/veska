import { DashboardClientCurrency } from './_dashboard-client.js';
import { DashboardBody } from './_dashboard-body.js';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardOverviewPage() {
  const t = await getTranslations('dashboard');

  const cookieStore = await cookies();
  const tenantId = cookieStore.get('veska_tenant')?.value ?? 'demo';
  const sessionToken = cookieStore.get('veska_session')?.value;

  const identityId = cookieStore.get('veska_identity')?.value
    ?? cookieStore.get('veska_user')?.value
    ?? 'system';

  const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionToken) authHeaders['Authorization'] = `Bearer ${sessionToken}`;
  authHeaders['X-Veska-Identity-Id'] = identityId;

  // Parallel fetches with independent error handling
  let stats: DashboardStats | null = null;
  let statsError = false;
  let activity: ActivityItem[] = [];

  const [statsResult, activityResult] = await Promise.allSettled([
    fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + `/api/v1/dashboard/stats?tenantId=${tenantId}`, {
      cache: 'no-store',
      headers: authHeaders,
    }).then((r) => {
      if (!r.ok) throw new Error(`stats ${r.status}`);
      return r.json() as Promise<DashboardStats>;
    }),
    fetch((process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + `/api/v1/dashboard/activity?tenantId=${tenantId}&limit=15`, {
      cache: 'no-store',
      headers: authHeaders,
    }).then((r) => {
      if (!r.ok) throw new Error(`activity ${r.status}`);
      return r.json() as Promise<{ activities?: ActivityItem[] } | ActivityItem[]>;
    }).then((data) => {
      // API wraps activity in { activities: [...] }
      if (Array.isArray(data)) return data;
      return (data as { activities?: ActivityItem[] }).activities ?? [];
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

  // Extract monetary stats for currency conversion (assumed USD from API)
  const originalStats = {
    totalPaidThisMonth: stats?.finance.totalPaidThisMonth ?? 0,
    totalOutstandingInvoices: stats?.finance.totalOutstandingInvoices ?? 0,
    totalExpensesPending: stats?.finance.totalExpensesPending ?? 0,
    openDealsValue: stats?.sales.openDealsValue ?? 0,
    totalInventoryValue: stats?.inventory.totalInventoryValue ?? 0,
  };

  return (
    <DashboardClientCurrency originalStats={originalStats}>
      <DashboardBody
        stats={stats}
        statsError={statsError}
        activity={activity}
        todayLabel={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        welcomeText={t('welcome')}
        activeEmployeesLabel={t('activeEmployees')}
      />
    </DashboardClientCurrency>
  );
}
