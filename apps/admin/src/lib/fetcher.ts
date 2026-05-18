const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'demo-tenant';

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : null;
}

function clientHeaders(): HeadersInit {
  // The session token lives in the veska_session cookie (set HttpOnly by the
  // server).  In practice the browser attaches it automatically; we only read
  // it here for the Authorization header on same-origin fetch calls.  We
  // intentionally do NOT use localStorage — that would be XSS-accessible.
  const token = getCookieValue('veska_session');
  return {
    'Content-Type': 'application/json',
    'X-Veska-Tenant-Id': TENANT_ID,
    'X-Veska-Identity-Id': process.env.NEXT_PUBLIC_ADMIN_IDENTITY_ID ?? 'admin',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// SWR fetcher for API routes (prefixes API_BASE automatically)
export const fetcher = <T>(path: string): Promise<T> =>
  fetch(`${API_BASE}${path}`, { headers: clientHeaders() }).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json() as Promise<T>;
  });

// SWR fetcher with full URL (for external APIs)
export const externalFetcher = <T>(url: string): Promise<T> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Error ${r.status}`);
    return r.json() as Promise<T>;
  });
