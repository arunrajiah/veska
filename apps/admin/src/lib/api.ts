import { cookies } from 'next/headers';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiFetch<T>(
  path: string,
  tenantId: string,
  init?: RequestInit,
): Promise<T> {
  let token: string | null = null;
  let identityId: string | null = null;

  // Server-side (RSC): read session + identity from the cookie store
  if (typeof window === 'undefined') {
    try {
      const cookieStore = await cookies();
      token      = cookieStore.get('veska_session')?.value  ?? null;
      identityId = cookieStore.get('veska_identity')?.value
                ?? cookieStore.get('veska_user')?.value
                ?? 'system';
    } catch {
      token = null;
      identityId = 'system';
    }
  } else {
    // Client-side: read from cookie
    const getCookie = (name: string) => {
      const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
      return match ? decodeURIComponent(match.split('=')[1] ?? '') : null;
    };
    token      = getCookie('veska_session');
    identityId = getCookie('veska_identity') ?? getCookie('veska_user') ?? 'system';
  }

  const authHeaders: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'X-Veska-Identity-Id': identityId ?? 'system',
  };

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
