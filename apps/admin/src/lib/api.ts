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
  try {
    const cookieStore = await cookies();
    token = cookieStore.get('veska_session')?.value ?? null;
    identityId =
      cookieStore.get('veska_identity')?.value ?? cookieStore.get('veska_user')?.value ?? 'system';
  } catch {
    token = null;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Veska-Tenant-Id': tenantId,
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
