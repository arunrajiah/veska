import type { Context } from 'hono';

export function apiError(c: Context, status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500, message: string, details?: unknown) {
  return c.json({ error: message, ...(details ? { details } : {}) }, status);
}

export function handleRouteError(c: Context, err: unknown, context?: string): Response {
  console.error(`[API Error]${context ? ` ${context}` : ''}:`, err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  return c.json({ error: message }, 500);
}
