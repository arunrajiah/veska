import { cookies } from 'next/headers';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiFetch<T>(
  path: string,
  tenantId: string,
  init?: RequestInit,
): Promise<T> {
  let token: string | null = null;

  // Server-side (RSC): read session token from the cookie store
  if (typeof window === 'undefined') {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get('veska_session')?.value ?? null;
    } catch {
      token = null;
    }
  } else {
    // Client-side: read from localStorage
    token = localStorage.getItem('veska_token');
  }

  const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Veska-Tenant-Id': tenantId,
      ...authHeaders,
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
