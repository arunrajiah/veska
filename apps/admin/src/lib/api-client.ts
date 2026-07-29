/**
 * Browser-side API client.
 *
 * Client components must not talk to the API host directly. The session token is in
 * an HttpOnly cookie, so browser code cannot read it to build an Authorization
 * header, and every such call comes back 401. Requests go through the same-origin
 * proxy at /api/veska/*, which attaches the session, identity and tenant server-side.
 *
 * Do not add tenant or identity headers here. They come from the session; a header
 * the client invents is at best ignored and at worst wrong.
 */

const PROXY_PREFIX = '/api/veska';

/** Accepts '/api/v1/contacts', 'api/v1/contacts' or 'contacts' and normalises them. */
export function apiUrl(path: string): string {
  const clean = path.replace(/^\/+/, '').replace(/^api\/v1\/?/, '');
  return `${PROXY_PREFIX}/${clean}`;
}

/** Fetch through the proxy, returning the raw Response so callers can read status. */
export function apiRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(apiUrl(path), { ...init, headers, credentials: 'same-origin' });
}

/**
 * The signed-in identity id, from the veska_identity cookie set at login. That cookie
 * is deliberately not HttpOnly so client code can identify the current user without
 * a round trip. Returns null when signed out; callers should skip the request rather
 * than substitute a placeholder id.
 */
export function currentIdentityId(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith('veska_identity='));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') || null : null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Fetch through the proxy and parse JSON, throwing ApiError on a non-2xx response. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiRequest(path, init);
  if (!res.ok) {
    throw new ApiError(res.status, `API error ${res.status}: ${await res.text()}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
