import { apiFetch } from '@/lib/api.js';
import { WebhooksClient } from './_components.js';

export interface Webhook {
  id: string;
  data: {
    name?: string;
    url?: string;
    events?: string[];
    status?: 'active' | 'inactive';
    secret?: string;
    lastTriggeredAt?: string;
    successCount?: number;
    failureCount?: number;
    createdAt?: string;
  };
}

export default async function WebhooksPage() {
  const tenantId = 'demo-tenant';

  let webhooks: Webhook[] = [];
  try {
    const res = await apiFetch<{ data: Webhook[] }>('/api/v1/webhooks?limit=50', tenantId);
    webhooks = Array.isArray(res) ? res : (res?.data ?? []);
  } catch {
    webhooks = [];
  }

  return <WebhooksClient webhooks={webhooks} />;
}
