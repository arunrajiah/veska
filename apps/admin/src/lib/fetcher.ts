import { apiRequest } from './api-client';

// SWR fetcher for API paths. Goes through the same-origin proxy, which attaches the
// session server-side. It previously read veska_session from document.cookie, which
// can never work: that cookie is HttpOnly, so the Authorization header was always
// omitted and every request came back 401.
export const fetcher = <T>(path: string): Promise<T> =>
  apiRequest(path).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json() as Promise<T>;
  });

// SWR fetcher with full URL (for external APIs)
export const externalFetcher = <T>(url: string): Promise<T> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Error ${r.status}`);
    return r.json() as Promise<T>;
  });
