import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import { Users, UserCheck, TrendingUp, DollarSign } from 'lucide-react';

const TENANT_ID = 'demo-tenant';

function formatCurrency(value: unknown): string {
  if (value == null || value === '') return '$0';
  const num = Number(value);
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-600',
  unqualified: 'bg-gray-100 text-gray-500',
};

const STAGE_BADGE: Record<string, string> = {
  prospecting: 'bg-gray-100 text-gray-600',
  qualification: 'bg-blue-100 text-blue-700',
  proposal: 'bg-indigo-100 text-indigo-700',
  negotiation: 'bg-yellow-100 text-yellow-700',
  closed_won: 'bg-green-100 text-green-700',
  closed_lost: 'bg-red-100 text-red-600',
};

const STAGE_LABEL: Record<string, string> = {
  prospecting: 'Prospecting',
  qualification: 'Qualification',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Won',
  closed_lost: 'Lost',
};

interface EntityRecord {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export default async function CRMDashboardPage() {
  const [leads, contacts, deals] = await Promise.all([
    apiFetch<{ data: EntityRecord[] } | EntityRecord[]>('/api/v1/crm/leads?limit=50', TENANT_ID)
      .then((r) => (Array.isArray(r) ? r : (r as { data: EntityRecord[] }).data ?? []))
      .catch(() => [] as EntityRecord[]),
    apiFetch<{ data: EntityRecord[] } | EntityRecord[]>('/api/v1/crm/contacts?limit=50', TENANT_ID)
      .then((r) => (Array.isArray(r) ? r : (r as { data: EntityRecord[] }).data ?? []))
      .catch(() => [] as EntityRecord[]),
    apiFetch<{ data: EntityRecord[] } | EntityRecord[]>('/api/v1/crm/deals?limit=50', TENANT_ID)
      .then((r) => (Array.isArray(r) ? r : (r as { data: EntityRecord[] }).data ?? []))
      .catch(() => [] as EntityRecord[]),
  ]);

  const openDeals = deals.filter((d) => {
    const stage = String(d.data['stage'] ?? '');
    return stage !== 'closed_won' && stage !== 'closed_lost';
  });

  const pipelineValue = openDeals.reduce((sum, d) => sum + (Number(d.data['value']) || 0), 0);

  const recentLeads = leads.slice(0, 5);
  const recentDeals = deals.slice(0, 5);

  return (
    <div className="px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">CRM</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of your pipeline and customer relationships</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/dashboard/crm/leads" className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Total Leads</p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp size={15} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{leads.length.toLocaleString()}</p>
        </Link>
        <Link href="/dashboard/crm/contacts" className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Contacts</p>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Users size={15} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{contacts.length.toLocaleString()}</p>
        </Link>
        <Link href="/dashboard/crm/deals" className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Open Deals</p>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <UserCheck size={15} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{openDeals.length.toLocaleString()}</p>
        </Link>
        <Link href="/dashboard/crm/deals" className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Pipeline Value</p>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <DollarSign size={15} className="text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{formatCurrency(pipelineValue)}</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400">Recent Leads</h2>
            <Link href="/dashboard/crm/leads" className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
              View all →
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-400">No leads yet</p>
              <Link href="/dashboard/crm/leads" className="mt-2 inline-block text-xs text-indigo-600 hover:underline">Create a lead</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentLeads.map((lead) => {
                const d = lead.data;
                const status = String(d['status'] ?? 'new');
                return (
                  <Link
                    key={lead.id}
                    href={`/dashboard/crm/leads/${lead.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/60 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{String(d['name'] ?? '—')}</p>
                      <p className="text-xs text-gray-400">{String(d['company'] ?? d['email'] ?? '')}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {status}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Deals */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400">Recent Deals</h2>
            <Link href="/dashboard/crm/deals" className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
              View all →
            </Link>
          </div>
          {recentDeals.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-400">No deals yet</p>
              <Link href="/dashboard/crm/deals" className="mt-2 inline-block text-xs text-indigo-600 hover:underline">Create a deal</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentDeals.map((deal) => {
                const d = deal.data;
                const stage = String(d['stage'] ?? d['stageId'] ?? '');
                return (
                  <Link
                    key={deal.id}
                    href={`/dashboard/crm/deals/${deal.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/60 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{String(d['name'] ?? '(Unnamed)')}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STAGE_BADGE[stage] ?? 'bg-gray-100 text-gray-600'}`}>
                        {(STAGE_LABEL[stage] ?? stage) || 'Unknown'}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(d['value'])}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/crm/contacts" className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors">
          Contacts
        </Link>
        <Link href="/dashboard/crm/companies" className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors">
          Companies
        </Link>
        <Link href="/dashboard/crm/stages" className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors">
          Pipeline Stages
        </Link>
      </div>
    </div>
  );
}
