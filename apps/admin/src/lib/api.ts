import { cookies } from 'next/headers';
import { apiRequest } from './api-client';

const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Isomorphic API fetch.
 *
 * On the server it reads the session cookie and calls the API directly. In the
 * browser it goes through the same-origin proxy, because the session cookie is
 * HttpOnly and unreadable from client code: the previous document.cookie lookup here
 * always came back empty, so the Authorization header was dropped and the request
 * 401'd.
 *
 * `tenantId` is kept for call-site compatibility but is only a hint. The API takes
 * the authoritative tenant from the session either way.
 */
export async function apiFetch<T>(path: string, tenantId: string, init?: RequestInit): Promise<T> {
  if (typeof window !== 'undefined') {
    const res = await apiRequest(path, { ...init, cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  let token: string | null = null;
  let identityId = 'system';
  let cookieTenantId: string | null = null;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get('veska_session')?.value ?? null;
    identityId =
      cookieStore.get('veska_identity')?.value ?? cookieStore.get('veska_user')?.value ?? 'system';
    cookieTenantId = cookieStore.get('veska_tenant')?.value ?? null;
  } catch {
    token = null;
  }

  // The API rejects a tenant header that contradicts the session with a 403 Tenant
  // mismatch. Callers pass a tenantId that is often the NEXT_PUBLIC_TENANT_ID ??
  // 'demo-tenant' placeholder, so prefer the session's own tenant cookie and send no
  // header at all rather than a value we know to be made up.
  const isUuid = (v: string | null): v is string =>
    !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const resolvedTenantId = cookieTenantId ?? (isUuid(tenantId) ? tenantId : null);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(resolvedTenantId ? { 'X-Veska-Tenant-Id': resolvedTenantId } : {}),
      'X-Veska-Identity-Id': identityId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}
