import { apiFetch } from '@/lib/api.js';
import { WebhookSettingsClient, type WebhookEndpoint } from './_components.js';

export default async function WebhookSettingsPage() {
  const tenantId = process.env.VESKA_TENANT_ID ?? 'demo-tenant';

  let endpoints: WebhookEndpoint[] = [];
  try {
    const res = await apiFetch<{ endpoints: WebhookEndpoint[] }>(
      '/api/v1/webhooks/endpoints',
      tenantId,
    );
    endpoints = res.endpoints ?? [];
  } catch {
    endpoints = [];
  }

  return <WebhookSettingsClient endpoints={endpoints} />;
}
