import Link from 'next/link';
import { Bot, User, Settings } from 'lucide-react';
import { apiFetch } from '@/lib/api.js';

interface AuditEvent {
  id: string;
  actorType: string;
  action: string;
  resourceType: string | null;
  createdAt: string;
}

interface AuditResponse {
  events: AuditEvent[];
}

interface PipelineStage {
  count: number;
  total_value: number;
}

const ACTOR_ICONS = {
  ai: Bot,
  user: User,
  system: Settings,
  plugin: Settings,
  employee: User,
};

const ACTOR_COLORS = {
  ai: 'bg-indigo-100 text-indigo-600',
  user: 'bg-blue-100 text-blue-600',
  employee: 'bg-blue-100 text-blue-600',
  system: 'bg-gray-100 text-gray-500',
  plugin: 'bg-gray-100 text-gray-500',
};

export default async function DashboardOverviewPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? '';

  const [ticketsResult, pipelineResult, invoicesResult, leadsResult, auditResult] =
    await Promise.allSettled([
      apiFetch<unknown[]>('/api/v1/support/tickets?status=open', tenantId),
      apiFetch<Record<string, PipelineStage>>('/api/v1/crm/pipeline', tenantId),
      apiFetch<unknown[]>('/api/v1/finance/invoices?status=sent', tenantId),
      apiFetch<unknown[]>('/api/v1/crm/leads?status=new', tenantId),
      apiFetch<AuditResponse>('/api/v1/audit?limit=5', tenantId),
    ]);

  const openTickets =
    ticketsResult.status === 'fulfilled' && Array.isArray(ticketsResult.value)
      ? ticketsResult.value.length
      : 0;

  const openDeals =
    pipelineResult.status === 'fulfilled' && pipelineResult.value
      ? Object.values(pipelineResult.value).reduce((sum, stage) => sum + (stage.count ?? 0), 0)
      : 0;

  const unpaidInvoices =
    invoicesResult.status === 'fulfilled' && Array.isArray(invoicesResult.value)
      ? invoicesResult.value.length
      : 0;

  const newLeads =
    leadsResult.status === 'fulfilled' && Array.isArray(leadsResult.value)
      ? leadsResult.value.length
      : 0;

  const recentEvents: AuditEvent[] =
    auditResult.status === 'fulfilled' && Array.isArray(auditResult.value?.events)
      ? auditResult.value.events
      : [];

  const quickStats = [
    { label: 'Open tickets', value: openTickets, href: '/dashboard/support/tickets?status=open' },
    { label: 'Open deals', value: openDeals, href: '/dashboard/crm/deals?stage=negotiation' },
    { label: 'Unpaid invoices', value: unpaidInvoices, href: '/dashboard/finance/invoices?status=sent' },
    { label: 'New leads', value: newLeads, href: '/dashboard/crm/leads?status=new' },
  ];

  return (
    <div className="px-8 py-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {quickStats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
          >
            <p className="text-xs text-gray-500 mb-2">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 col-span-2">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Recent activity</h2>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-gray-400">
              No recent activity. Connect your channels to start seeing events here.
            </p>
          ) : (
            <div className="space-y-0">
              {recentEvents.map((event, i) => {
                const IconComponent =
                  ACTOR_ICONS[event.actorType as keyof typeof ACTOR_ICONS] ?? User;
                const colorClass =
                  ACTOR_COLORS[event.actorType as keyof typeof ACTOR_COLORS] ??
                  'bg-gray-100 text-gray-500';
                return (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}
                      >
                        <IconComponent size={13} />
                      </div>
                      {i < recentEvents.length - 1 && (
                        <div className="w-px flex-1 bg-gray-100 my-1" />
                      )}
                    </div>
                    <div className="pb-4 flex-1 flex items-start justify-between gap-4">
                      <span className="font-mono text-xs text-gray-600">{event.action}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {typeof event.createdAt === 'string'
                          ? event.createdAt.replace('T', ' ').slice(0, 16)
                          : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Quick actions</h2>
          <div className="space-y-2">
            {[
              { label: 'New lead', href: '/dashboard/crm/leads/new' },
              { label: 'New ticket', href: '/dashboard/support/tickets/new' },
              { label: 'New invoice', href: '/dashboard/finance/invoices/new' },
              { label: 'Configure channels', href: '/dashboard/channels' },
            ].map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="block text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                + {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
