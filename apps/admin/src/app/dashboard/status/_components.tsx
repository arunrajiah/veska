'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Activity } from 'lucide-react';
import type { HealthData, MetricsData } from './page.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function overallStatus(health: HealthData): 'operational' | 'degraded' | 'disruption' {
  const s = (health.status ?? '').toLowerCase();
  if (s === 'ok' || s === 'healthy' || s === 'up') return 'operational';
  if (s === 'degraded' || s === 'partial') return 'degraded';
  if (s === 'error' || s === 'down' || s === 'unknown') return 'disruption';

  // infer from services
  const svcs = health.services ?? {};
  const statuses = Object.values(svcs).map((v) => (v?.status ?? '').toLowerCase());
  if (statuses.every((s) => s === 'ok' || s === 'up' || s === 'healthy')) return 'operational';
  if (statuses.some((s) => s === 'error' || s === 'down')) return 'disruption';
  if (statuses.some((s) => s === 'degraded')) return 'degraded';
  return 'operational';
}

function serviceStatus(svc?: { status: string; latencyMs?: number }) {
  if (!svc) return { ok: false, label: 'Unknown', latency: null };
  const s = (svc.status ?? '').toLowerCase();
  const ok = s === 'ok' || s === 'up' || s === 'healthy';
  return { ok, label: ok ? 'Up' : 'Down', latency: svc.latencyMs ?? null };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function OverallBanner({ health }: { health: HealthData }) {
  const status = overallStatus(health);
  const config = {
    operational: {
      bg: 'bg-green-50 border-green-200',
      icon: <CheckCircle2 size={28} className="text-green-600" />,
      text: 'All Systems Operational',
      sub: 'All services are running normally.',
      badge: 'bg-green-100 text-green-800',
    },
    degraded: {
      bg: 'bg-yellow-50 border-yellow-200',
      icon: <AlertCircle size={28} className="text-yellow-500" />,
      text: 'Degraded Performance',
      sub: 'Some services may be experiencing issues.',
      badge: 'bg-yellow-100 text-yellow-800',
    },
    disruption: {
      bg: 'bg-red-50 border-red-200',
      icon: <XCircle size={28} className="text-red-600" />,
      text: 'Service Disruption',
      sub: 'One or more services are down.',
      badge: 'bg-red-100 text-red-800',
    },
  }[status];

  return (
    <div className={`border rounded-xl px-6 py-5 flex items-center gap-4 mb-6 ${config.bg}`}>
      {config.icon}
      <div>
        <p className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${config.badge}`}>
          {config.text}
        </p>
        <p className="text-sm text-gray-600 mt-1">{config.sub}</p>
      </div>
      {health.timestamp && (
        <p className="ml-auto text-xs text-gray-400">
          Last checked: {new Date(health.timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

function ServiceCard({
  name,
  svc,
}: {
  name: string;
  svc?: { status: string; latencyMs?: number } | undefined;
}) {
  const { ok, label, latency } = serviceStatus(svc);
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ok ? 'bg-green-500' : 'bg-red-500'}`}
        />
      </div>
      <p className={`text-lg font-semibold ${ok ? 'text-green-700' : 'text-red-600'}`}>{label}</p>
      {latency != null && (
        <p className="text-xs text-gray-400 mt-0.5">{latency} ms latency</p>
      )}
      {latency == null && (
        <p className="text-xs text-gray-400 mt-0.5">Latency unavailable</p>
      )}
    </div>
  );
}

function EntityMetricsTable({ entities }: { entities: Record<string, number> }) {
  const sorted = Object.entries(entities).sort((a, b) => b[1] - a[1]);
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Entity Metrics</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Entity Type</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Count</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-40">Distribution</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(([entity, count]) => {
            const maxVal = sorted[0]?.[1] ?? 1;
            const pct = maxVal > 0 ? (count / maxVal) * 100 : 0;
            return (
              <tr key={entity} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900 capitalize">{entity.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-right text-gray-700">{count.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------
export function StatusClient({
  initialHealth,
  initialMetrics,
}: {
  initialHealth: HealthData;
  initialMetrics: MetricsData;
}) {
  const [health, setHealth] = useState(initialHealth);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refresh = async () => {
    try {
      const [h, m] = await Promise.all([
        fetch(`${API_BASE}/health`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {})),
        fetch(`${API_BASE}/metrics`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {})),
      ]);
      setHealth(h as HealthData);
      setMetrics(m as MetricsData);
      setLastRefresh(new Date());
    } catch {
      // silently keep current data
    }
  };

  useEffect(() => {
    const id = setInterval(() => { void refresh(); }, 30_000);
    return () => clearInterval(id);
  }, []);

  const svcs = health.services ?? {};
  const entities = metrics.entities ?? {};
  const activity = metrics.activity ?? {};
  const hasEntities = Object.keys(entities).length > 0;

  return (
    <div>
      {/* Overall banner */}
      <OverallBanner health={health} />

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Activity size={13} className="text-green-500 animate-pulse" />
          Auto-refreshes every 30 seconds · Last: {lastRefresh.toLocaleTimeString()}
        </div>
        <button
          onClick={() => void refresh()}
          className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Refresh now
        </button>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <ServiceCard name="Database" svc={svcs.database} />
        <ServiceCard name="Redis" svc={svcs.redis} />
        <ServiceCard
          name="API"
          svc={svcs.api ?? { status: health.status ?? 'ok' }}
        />
      </div>

      {/* Tenant & Uptime */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {health.tenantCount != null && (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">Tenants</p>
            <p className="text-2xl font-semibold text-gray-900">{health.tenantCount}</p>
          </div>
        )}
        {health.uptime && (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">Uptime</p>
            <p className="text-2xl font-semibold text-gray-900">{health.uptime}</p>
          </div>
        )}
      </div>

      {/* Activity stats */}
      {(activity.last24h != null || activity.last7d != null || activity.last30d != null) && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Activity — Entity Creation</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Last 24 hours', value: activity.last24h },
              { label: 'Last 7 days', value: activity.last7d },
              { label: 'Last 30 days', value: activity.last30d },
            ].map(({ label, value }) =>
              value != null ? (
                <div key={label} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">entities created</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Entity metrics table */}
      {hasEntities && <EntityMetricsTable entities={entities} />}

      {!hasEntities && (
        <div className="bg-white border border-gray-200 rounded-xl px-8 py-12 text-center">
          <p className="text-sm text-gray-400">No metrics data available.</p>
        </div>
      )}
    </div>
  );
}
