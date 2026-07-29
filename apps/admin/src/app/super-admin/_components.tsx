'use client';

import { useState } from 'react';
import {
  Users,
  DollarSign,
  TrendingDown,
  Activity,
  Search,
  ChevronDown,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PlanId = 'free' | 'starter' | 'growth' | 'business' | 'enterprise';
type TenantStatus = 'active' | 'trialing' | 'suspended';

interface Tenant {
  id: string;
  company: string;
  plan: PlanId;
  seatsUsed: number;
  seatsMax: number | 'unlimited';
  mrr: number;
  status: TenantStatus;
  created: string;
}

interface SystemEvent {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_TENANTS: Tenant[] = [
  {
    id: 'acme-corp',
    company: 'Acme Corp',
    plan: 'business',
    seatsUsed: 48,
    seatsMax: 200,
    mrr: 399,
    status: 'active',
    created: '2024-03-12',
  },
  {
    id: 'globex',
    company: 'Globex Industries',
    plan: 'growth',
    seatsUsed: 22,
    seatsMax: 50,
    mrr: 149,
    status: 'active',
    created: '2024-05-01',
  },
  {
    id: 'initech',
    company: 'Initech LLC',
    plan: 'starter',
    seatsUsed: 7,
    seatsMax: 10,
    mrr: 49,
    status: 'active',
    created: '2024-06-15',
  },
  {
    id: 'umbrella',
    company: 'Umbrella Ltd',
    plan: 'enterprise',
    seatsUsed: 310,
    seatsMax: 'unlimited',
    mrr: 2500,
    status: 'active',
    created: '2023-11-20',
  },
  {
    id: 'wayne-ent',
    company: 'Wayne Enterprises',
    plan: 'business',
    seatsUsed: 95,
    seatsMax: 200,
    mrr: 399,
    status: 'trialing',
    created: '2025-04-28',
  },
  {
    id: 'stark-ind',
    company: 'Stark Industries',
    plan: 'enterprise',
    seatsUsed: 512,
    seatsMax: 'unlimited',
    mrr: 4800,
    status: 'active',
    created: '2023-09-03',
  },
  {
    id: 'oscorp',
    company: 'Oscorp',
    plan: 'growth',
    seatsUsed: 31,
    seatsMax: 50,
    mrr: 149,
    status: 'suspended',
    created: '2024-02-14',
  },
  {
    id: 'dunder-mifflin',
    company: 'Dunder Mifflin',
    plan: 'starter',
    seatsUsed: 9,
    seatsMax: 10,
    mrr: 49,
    status: 'active',
    created: '2024-08-22',
  },
  {
    id: 'pied-piper',
    company: 'Pied Piper',
    plan: 'growth',
    seatsUsed: 18,
    seatsMax: 50,
    mrr: 149,
    status: 'trialing',
    created: '2025-03-10',
  },
  {
    id: 'hooli',
    company: 'Hooli',
    plan: 'free',
    seatsUsed: 3,
    seatsMax: 3,
    mrr: 0,
    status: 'active',
    created: '2025-05-01',
  },
];

const MRR_BY_PLAN = [
  { plan: 'Free', customers: 49, mrr: 0, pct: 0 },
  { plan: 'Starter', customers: 87, mrr: 4263, pct: 8.8 },
  { plan: 'Growth', customers: 62, mrr: 9238, pct: 19.1 },
  { plan: 'Business', customers: 38, mrr: 15162, pct: 31.3 },
  { plan: 'Enterprise', customers: 11, mrr: 19837, pct: 40.9 },
];

const REVENUE_TREND = [
  { month: 'Dec 2025', mrr: 41200, growth: null },
  { month: 'Jan 2026', mrr: 43500, growth: 5.6 },
  { month: 'Feb 2026', mrr: 44800, growth: 3.0 },
  { month: 'Mar 2026', mrr: 46100, growth: 2.9 },
  { month: 'Apr 2026', mrr: 47300, growth: 2.6 },
  { month: 'May 2026', mrr: 48500, growth: 2.5 },
];

const TOP_CUSTOMERS = [
  { company: 'Stark Industries', plan: 'Enterprise', mrr: 4800, since: '2023-09-03' },
  { company: 'Umbrella Ltd', plan: 'Enterprise', mrr: 2500, since: '2023-11-20' },
  { company: 'Cyberdyne Systems', plan: 'Enterprise', mrr: 2100, since: '2024-01-15' },
  { company: 'Massive Dynamic', plan: 'Enterprise', mrr: 1800, since: '2024-04-07' },
  { company: 'Weyland Corp', plan: 'Business', mrr: 799, since: '2024-02-28' },
];

const SYSTEM_EVENTS: SystemEvent[] = [
  {
    id: '1',
    message: 'Acme Corp upgraded from Growth → Business',
    type: 'success',
    timestamp: '2026-05-15T09:42:00Z',
  },
  {
    id: '2',
    message: 'New signup: Hooli (Free plan)',
    type: 'info',
    timestamp: '2026-05-15T08:17:00Z',
  },
  {
    id: '3',
    message: 'Payment failed for Oscorp — card declined',
    type: 'error',
    timestamp: '2026-05-14T23:55:00Z',
  },
  {
    id: '4',
    message: 'Pied Piper trial started (Growth, 14-day)',
    type: 'info',
    timestamp: '2026-05-14T15:30:00Z',
  },
  {
    id: '5',
    message: 'Stark Industries API usage nearing rate limit',
    type: 'warning',
    timestamp: '2026-05-14T12:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PLAN_COLORS: Record<PlanId, string> = {
  free: 'bg-gray-700 text-gray-300',
  starter: 'bg-blue-900/60 text-blue-300',
  growth: 'bg-indigo-900/60 text-indigo-300',
  business: 'bg-purple-900/60 text-purple-300',
  enterprise: 'bg-amber-900/60 text-amber-300',
};

const STATUS_CONFIG: Record<TenantStatus, { label: string; class: string; icon: React.ReactNode }> =
  {
    active: {
      label: 'Active',
      class: 'bg-green-900/40 text-green-300',
      icon: <CheckCircle2 size={12} />,
    },
    trialing: { label: 'Trial', class: 'bg-blue-900/40 text-blue-300', icon: <Clock size={12} /> },
    suspended: {
      label: 'Suspended',
      class: 'bg-red-900/40 text-red-300',
      icon: <XCircle size={12} />,
    },
  };

const EVENT_CONFIG = {
  success: { class: 'bg-green-900/40 text-green-300', icon: <CheckCircle2 size={12} /> },
  info: { class: 'bg-blue-900/40 text-blue-300', icon: <Activity size={12} /> },
  warning: { class: 'bg-amber-900/40 text-amber-300', icon: <AlertTriangle size={12} /> },
  error: { class: 'bg-red-900/40 text-red-300', icon: <XCircle size={12} /> },
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtMrr(n: number) {
  return `$${fmt(n)}`;
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${accent}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change Plan Modal
// ---------------------------------------------------------------------------
function ChangePlanModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [selected, setSelected] = useState<PlanId>(tenant.plan);
  const plans: PlanId[] = ['free', 'starter', 'growth', 'business', 'enterprise'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">Change Plan — {tenant.company}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Current plan: <span className="text-white font-medium capitalize">{tenant.plan}</span>
        </p>

        <div className="space-y-2 mb-6">
          {plans.map((p) => (
            <button
              key={p}
              onClick={() => setSelected(p)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                selected === p
                  ? 'border-indigo-500 bg-indigo-900/30'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-700/40'
              }`}
            >
              <span className="text-sm text-white capitalize">{p}</span>
              {selected === p && <CheckCircle2 size={16} className="text-indigo-400" />}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium transition-colors"
          >
            Confirm Change
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suspend Modal
// ---------------------------------------------------------------------------
function SuspendModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-red-700/40 rounded-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-900/40 border border-red-700/40">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Suspend Tenant</h3>
            <p className="text-xs text-slate-400">{tenant.company}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bg-red-900/20 border border-red-700/30 rounded-lg px-4 py-3 mb-5">
          <p className="text-sm text-red-300">
            Suspending this tenant will immediately lock all users out. Their data is preserved but
            access will be denied until the suspension is lifted. This action is logged.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm text-white font-medium transition-colors"
          >
            Suspend Tenant
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tenants Tab
// ---------------------------------------------------------------------------
function TenantsTab() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanId | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'all'>('all');
  const [changePlanTenant, setChangePlanTenant] = useState<Tenant | null>(null);
  const [suspendTenant, setSuspendTenant] = useState<Tenant | null>(null);

  const filtered = MOCK_TENANTS.filter((t) => {
    const matchesSearch =
      t.company.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === 'all' || t.plan === planFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <>
      {changePlanTenant && (
        <ChangePlanModal tenant={changePlanTenant} onClose={() => setChangePlanTenant(null)} />
      )}
      {suspendTenant && (
        <SuspendModal tenant={suspendTenant} onClose={() => setSuspendTenant(null)} />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="relative">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as PlanId | 'all')}
            className="pl-3 pr-8 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none transition-colors"
          >
            <option value="all">All Plans</option>
            {(['free', 'starter', 'growth', 'business', 'enterprise'] as PlanId[]).map((p) => (
              <option key={p} value={p} className="capitalize">
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TenantStatus | 'all')}
            className="pl-3 pr-8 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="suspended">Suspended</option>
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Tenant
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Plan
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Seats
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                MRR
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Created
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tenant, i) => {
              const statusCfg = STATUS_CONFIG[tenant.status];
              return (
                <tr
                  key={tenant.id}
                  className={`border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 transition-colors ${
                    i % 2 === 0 ? '' : 'bg-slate-800/40'
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{tenant.company}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{tenant.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${PLAN_COLORS[tenant.plan]}`}
                    >
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {tenant.seatsUsed} / {tenant.seatsMax === 'unlimited' ? '∞' : tenant.seatsMax}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {tenant.mrr === 0 ? (
                      <span className="text-slate-500">—</span>
                    ) : (
                      fmtMrr(tenant.mrr)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.class}`}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{tenant.created}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button className="px-2.5 py-1 rounded text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors">
                        View
                      </button>
                      <button
                        onClick={() => setChangePlanTenant(tenant)}
                        className="px-2.5 py-1 rounded text-xs font-medium text-indigo-300 bg-indigo-900/40 hover:bg-indigo-900/60 transition-colors"
                      >
                        Change Plan
                      </button>
                      <button
                        onClick={() => setSuspendTenant(tenant)}
                        className="px-2.5 py-1 rounded text-xs font-medium text-red-300 bg-red-900/30 hover:bg-red-900/50 transition-colors"
                      >
                        Suspend
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
        <span>Showing 1–{filtered.length} of 247 tenants</span>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:bg-slate-700 transition-colors disabled:opacity-40">
            Previous
          </button>
          <button className="px-3 py-1.5 rounded border border-slate-700 bg-indigo-600/30 text-indigo-300">
            1
          </button>
          <button className="px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:bg-slate-700 transition-colors">
            2
          </button>
          <button className="px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:bg-slate-700 transition-colors">
            3
          </button>
          <button className="px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:bg-slate-700 transition-colors">
            Next
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Revenue Tab
// ---------------------------------------------------------------------------
function RevenueTab() {
  const maxMrr = Math.max(...MRR_BY_PLAN.map((r) => r.mrr));

  return (
    <div className="space-y-6">
      {/* MRR by Plan */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">MRR by Plan</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Plan
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Customers
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                MRR
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                % of Total
              </th>
              <th className="px-4 py-3 w-40"></th>
            </tr>
          </thead>
          <tbody>
            {MRR_BY_PLAN.map((row) => (
              <tr
                key={row.plan}
                className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20"
              >
                <td className="px-4 py-3 font-medium text-white">{row.plan}</td>
                <td className="px-4 py-3 text-right text-slate-300">{row.customers}</td>
                <td className="px-4 py-3 text-right font-medium text-white">
                  {row.mrr === 0 ? '—' : fmtMrr(row.mrr)}
                </td>
                <td className="px-4 py-3 text-right text-slate-400">
                  {row.pct > 0 ? `${row.pct}%` : '—'}
                </td>
                <td className="px-4 py-3">
                  {row.mrr > 0 && (
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${(row.mrr / maxMrr) * 100}%` }}
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">Monthly Revenue Trend</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Month
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                MRR
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Growth
              </th>
            </tr>
          </thead>
          <tbody>
            {REVENUE_TREND.map((row) => (
              <tr
                key={row.month}
                className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20"
              >
                <td className="px-4 py-3 text-slate-300">{row.month}</td>
                <td className="px-4 py-3 text-right font-medium text-white">{fmtMrr(row.mrr)}</td>
                <td className="px-4 py-3 text-right">
                  {row.growth != null ? (
                    <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                      +{row.growth}%
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top 5 Customers */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">Top 5 Customers by MRR</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                #
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Company
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Plan
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                MRR
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">
                Since
              </th>
            </tr>
          </thead>
          <tbody>
            {TOP_CUSTOMERS.map((c, i) => (
              <tr
                key={c.company}
                className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20"
              >
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-white">{c.company}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{c.plan}</td>
                <td className="px-4 py-3 text-right font-semibold text-white">{fmtMrr(c.mrr)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{c.since}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// System Tab
// ---------------------------------------------------------------------------
function SystemTab() {
  const health = [
    { name: 'API', uptime: 99.97, ok: true },
    { name: 'Database', uptime: 99.99, ok: true },
    { name: 'Redis', uptime: 99.95, ok: true },
    { name: 'Email Delivery', uptime: 98.2, ok: true },
  ];

  return (
    <div className="space-y-6">
      {/* Health Grid */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Platform Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {health.map((svc) => (
            <div
              key={svc.name}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-400">{svc.name}</p>
                <span
                  className={`w-2 h-2 rounded-full ${svc.uptime >= 99.5 ? 'bg-green-400' : 'bg-amber-400'}`}
                />
              </div>
              <p
                className={`text-xl font-semibold ${svc.uptime >= 99.5 ? 'text-green-400' : 'text-amber-400'}`}
              >
                {svc.uptime}%
              </p>
              <p className="text-xs text-slate-500 mt-0.5">uptime (30d)</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">Recent System Events</h3>
        </div>
        <div className="divide-y divide-slate-700/50">
          {SYSTEM_EVENTS.map((ev) => {
            const cfg = EVENT_CONFIG[ev.type];
            return (
              <div
                key={ev.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-700/20 transition-colors"
              >
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${cfg.class}`}
                >
                  {cfg.icon}
                  {ev.type}
                </span>
                <p className="text-sm text-slate-300 flex-1">{ev.message}</p>
                <p className="text-xs text-slate-500 flex-shrink-0">
                  {new Date(ev.timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Status Link */}
      <div className="flex">
        <a
          href="/dashboard/status"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
        >
          <ExternalLink size={14} />
          View full system status
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------
type Tab = 'tenants' | 'revenue' | 'system';

export function SuperAdminDashboard() {
  const [tab, setTab] = useState<Tab>('tenants');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'tenants', label: 'Tenants' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div>
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Tenants"
          value="247"
          sub="All plans"
          icon={<Users size={16} className="text-blue-400" />}
          accent="bg-blue-900/40"
        />
        <StatCard
          label="Active Subscriptions"
          value="198"
          sub="Paid + trialing"
          icon={<CheckCircle2 size={16} className="text-green-400" />}
          accent="bg-green-900/40"
        />
        <StatCard
          label="MRR"
          value="$48,500"
          sub="May 2026"
          icon={<DollarSign size={16} className="text-amber-400" />}
          accent="bg-amber-900/40"
        />
        <StatCard
          label="Churn Rate"
          value="2.1%"
          sub="Last 30 days"
          icon={<TrendingDown size={16} className="text-red-400" />}
          accent="bg-red-900/40"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700 mb-6">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'tenants' && <TenantsTab />}
      {tab === 'revenue' && <RevenueTab />}
      {tab === 'system' && <SystemTab />}
    </div>
  );
}
