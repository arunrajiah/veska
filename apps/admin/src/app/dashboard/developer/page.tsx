import { Key, Webhook, Cpu, ScrollText, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api.js';
import type { ApiKey } from './api-keys/page.js';
import type { Webhook as WebhookType } from './webhooks/page.js';

const TENANT_ID =
  process.env.VESKA_TENANT_ID ??
  process.env.NEXT_PUBLIC_TENANT_ID ??
  'demo-tenant';

interface JobQueue {
  name?: string;
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
}

interface AuditEntry {
  id: string;
}

async function safeApiFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiFetch<T>(path, TENANT_ID);
  } catch {
    return fallback;
  }
}

export default async function DeveloperOverviewPage() {
  const [keysRes, webhooksRes, jobsRes, auditRes] = await Promise.all([
    safeApiFetch<ApiKey[] | { data: ApiKey[] } | null>('/api/v1/api-keys?limit=100', null),
    safeApiFetch<WebhookType[] | { data: WebhookType[] } | null>('/api/v1/webhooks?limit=100', null),
    safeApiFetch<JobQueue[] | { data: JobQueue[] } | null>('/api/v1/developer/job-queues', null),
    safeApiFetch<AuditEntry[] | { data: AuditEntry[] } | null>('/api/v1/audit?limit=100', null),
  ]);

  // Count active API keys
  const allKeys: ApiKey[] = keysRes
    ? Array.isArray(keysRes)
      ? keysRes
      : (keysRes as { data: ApiKey[] }).data ?? []
    : [];
  const activeKeyCount =
    keysRes === null
      ? null
      : allKeys.filter((k) => (k.data?.status ?? 'active') === 'active').length;

  // Count enabled webhooks
  const allWebhooks: WebhookType[] = webhooksRes
    ? Array.isArray(webhooksRes)
      ? webhooksRes
      : (webhooksRes as { data: WebhookType[] }).data ?? []
    : [];
  const enabledWebhookCount =
    webhooksRes === null
      ? null
      : allWebhooks.filter((w) => (w.data?.status ?? 'active') === 'active').length;

  // Sum job queue waiting + active
  const allQueues: JobQueue[] = jobsRes
    ? Array.isArray(jobsRes)
      ? jobsRes
      : (jobsRes as { data: JobQueue[] }).data ?? []
    : [];
  const jobCount =
    jobsRes === null
      ? null
      : allQueues.reduce((sum, q) => sum + (q.waiting ?? 0) + (q.active ?? 0), 0);

  // Count audit entries
  const allAudit: AuditEntry[] = auditRes
    ? Array.isArray(auditRes)
      ? auditRes
      : (auditRes as { data: AuditEntry[] }).data ?? []
    : [];
  const auditCount = auditRes === null ? null : allAudit.length;

  const stats = [
    {
      label: 'Total API Keys',
      value: activeKeyCount,
      icon: Key,
      href: '/dashboard/developer/api-keys',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Active Webhooks',
      value: enabledWebhookCount,
      icon: Webhook,
      href: '/dashboard/developer/webhooks',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Jobs (last 24h)',
      value: jobCount,
      icon: Cpu,
      href: '/dashboard/developer/jobs',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Audit Events (last 24h)',
      value: auditCount,
      icon: ScrollText,
      href: '/dashboard/developer/audit',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  const recentKeys = allKeys.slice(0, 5);

  const quickLinks = [
    {
      title: 'API Reference',
      description: 'Explore endpoints, authentication, and request/response schemas.',
      href: 'https://github.com/arunrajiah/veska/blob/main/apps/api/src/routes/docs.ts',
      label: 'Open Docs',
    },
    {
      title: 'Webhook Setup Guide',
      description: 'Learn how to configure outbound webhooks and verify payloads.',
      href: 'https://github.com/arunrajiah/veska/blob/main/SELF_HOSTING.md',
      label: 'View Guide',
    },
    {
      title: 'Plugin SDK',
      description: 'Build custom integrations and extensions using the Veska SDK.',
      href: 'https://github.com/arunrajiah/veska/tree/main/packages/sdk',
      label: 'SDK Docs',
    },
  ];

  return (
    <div className="px-8 py-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Developer Overview</h1>
      <p className="text-sm text-gray-500 mb-8">API keys, webhooks, job queues, and audit logs.</p>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, href, color, bg }) => (
          <Link
            key={label}
            href={href as any}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors group"
          >
            <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon size={16} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {value === null ? '—' : value.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 group-hover:text-gray-700 transition-colors">
              {label}
            </p>
          </Link>
        ))}
      </div>

      {/* Recent API Keys */}
      <div className="bg-white border border-gray-200 rounded-xl mb-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Recent API Keys</h2>
          <Link
            href={'/dashboard/developer/api-keys' as any}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            View all
          </Link>
        </div>

        {recentKeys.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-400">No API keys found.</p>
            <Link
              href={'/dashboard/developer/api-keys' as any}
              className="inline-block mt-2 text-sm text-gray-900 underline"
            >
              Create your first key
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Prefix</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Last Used</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentKeys.map((key) => {
                const status = key.data?.status ?? 'active';
                const lastUsed = key.data?.lastUsedAt;
                return (
                  <tr key={key.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-800 font-medium">
                      {key.data?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {key.data?.keyPrefix ?? '—'}
                      </code>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {lastUsed
                        ? new Date(lastUsed).toLocaleDateString()
                        : <span className="text-gray-300">Never</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Links */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Links</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickLinks.map(({ title, description, href, label }) => (
          <a
            key={title}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors group"
          >
            <div className="flex items-start justify-between mb-2">
              <p className="font-medium text-gray-900 text-sm">{title}</p>
              <ExternalLink size={13} className="text-gray-400 group-hover:text-gray-600 flex-shrink-0 mt-0.5" />
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">{description}</p>
            <span className="text-xs text-gray-900 font-medium underline group-hover:text-gray-600">
              {label}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
