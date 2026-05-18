import { apiFetch } from '@/lib/api.js';
import { ApiKeysClient } from './_components.js';

export interface ApiKey {
  id: string;
  data: {
    name?: string;
    keyPrefix?: string;
    scopes?: string[];
    status?: 'active' | 'revoked';
    lastUsedAt?: string;
    createdAt?: string;
    expiresAt?: string;
  };
}

export default async function ApiKeysPage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

  let keys: ApiKey[] = [];
  try {
    const res = await apiFetch<{ data: ApiKey[] }>('/api/v1/api-keys?limit=50', tenantId);
    keys = Array.isArray(res) ? res : (res?.data ?? []);
  } catch {
    keys = [];
  }

  return <ApiKeysClient apiKeys={keys} />;
}
