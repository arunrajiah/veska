import { StatusClient } from './_components.js';

const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface HealthData {
  status: string;
  services?: {
    database?: { status: string; latencyMs?: number };
    redis?: { status: string; latencyMs?: number };
    api?: { status: string; latencyMs?: number };
  };
  uptime?: string;
  tenantCount?: number;
  timestamp?: string;
}

export interface MetricsData {
  entities?: Record<string, number>;
  activity?: {
    last24h?: number;
    last7d?: number;
    last30d?: number;
  };
  [key: string]: unknown;
}

async function fetchHealth(): Promise<HealthData> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
    if (!res.ok) return { status: 'unknown' };
    return res.json() as Promise<HealthData>;
  } catch {
    return { status: 'error' };
  }
}

async function fetchMetrics(): Promise<MetricsData> {
  try {
    const res = await fetch(`${API_BASE}/metrics`, { cache: 'no-store' });
    if (!res.ok) return {};
    return res.json() as Promise<MetricsData>;
  } catch {
    return {};
  }
}

export default async function StatusPage() {
  const [health, metrics] = await Promise.all([fetchHealth(), fetchMetrics()]);

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">System Status</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Real-time health and metrics for Veska services
        </p>
      </div>

      <StatusClient initialHealth={health} initialMetrics={metrics} />
    </div>
  );
}
