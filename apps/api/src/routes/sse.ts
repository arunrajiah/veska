import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import type { SessionContext } from '../middleware/session.js';
import type { TenantContext } from '../middleware/tenant-context.js';

export const sseRouter = new Hono<{ Variables: TenantContext & SessionContext }>();

// In-memory subscriber map: tenantId → Set<(data: string) => void>
const subscribers = new Map<string, Set<(data: string) => void>>();

export function broadcast(tenantId: string, event: { type: string; payload: unknown }) {
  const subs = subscribers.get(tenantId);
  if (!subs) return;
  const data = JSON.stringify(event);
  for (const send of subs) {
    try {
      send(data);
    } catch {
      // ignore closed connections
    }
  }
}

/**
 * Broadcast an entity change event to all SSE subscribers of a tenant.
 * Alias of `broadcast` with a clearer name for use outside this module.
 */
export function broadcastToTenant(
  tenantId: string,
  event: { type: string; payload: unknown },
): void {
  broadcast(tenantId, event);
}

// GET /api/v1/events/stream
sseRouter.get('/stream', async (c) => {
  // Authoritative tenant comes from the session via tenantContext, never from a
  // client-supplied header, and there is no 'demo-tenant' fallback to leak into.
  const { tenantId } = c.get('tenantCtx');

  return stream(c, async (s) => {
    // SSE headers must be set before streaming starts
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    c.header('X-Accel-Buffering', 'no');

    // Register subscriber
    const send = (data: string) => {
      void s.write(`data: ${data}\n\n`);
    };

    if (!subscribers.has(tenantId)) subscribers.set(tenantId, new Set());
    subscribers.get(tenantId)!.add(send);

    // Send initial connected ping
    await s.write(`data: ${JSON.stringify({ type: 'connected', payload: { tenantId } })}\n\n`);

    // Keep-alive comment every 25 seconds
    const keepAlive = setInterval(() => {
      s.write(': keepalive\n\n').catch(() => {});
    }, 25_000);

    // Cleanup on disconnect
    s.onAbort(() => {
      clearInterval(keepAlive);
      subscribers.get(tenantId)?.delete(send);
    });

    // Hold the stream open until the client disconnects
    await new Promise<void>((resolve) => s.onAbort(resolve));
  });
});
