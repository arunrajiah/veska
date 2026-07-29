import { SettingsClient, type TenantSettings } from './_components.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchSettings(): Promise<TenantSettings> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/tenant-settings`, {
      headers: {
        'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export default async function SettingsPage() {
  const settings = await fetchSettings();
  return <SettingsClient initialSettings={settings} />;
}
