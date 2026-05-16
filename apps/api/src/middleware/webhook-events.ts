// ──────────────────────────────────────────────────────────────
// Webhook event dispatcher helper
// Fire-and-forget — never throws, never blocks a response.
// ──────────────────────────────────────────────────────────────

import { WebhookDispatcherService } from '@veska/core';
import type { Database } from '@veska/core';
import { broadcastToTenant } from '../routes/sse.js';

export interface WebhookEventOpts {
  tenantId: string;
  db: Database;
  event: string;       // e.g. 'invoice.created', 'expense.submitted'
  resourceId: string;
  data: unknown;
}

/**
 * Fire-and-forget webhook dispatch after a route handler succeeds.
 * Errors are swallowed and logged — outbound webhooks must never
 * break the primary request/response cycle.
 */
export function dispatchWebhookEvent(opts: WebhookEventOpts): void {
  const svc = new WebhookDispatcherService(opts.db);
  // Broadcast immediately to any connected SSE subscribers for this tenant
  broadcastToTenant(opts.tenantId, {
    type: opts.event,
    payload: {
      resourceId: opts.resourceId,
      data: opts.data,
    },
  });

  void svc
    .dispatch({
      event: opts.event,
      tenantId: opts.tenantId,
      payload: {
        resourceId: opts.resourceId,
        data: opts.data,
      },
      timestamp: new Date().toISOString(),
    })
    .catch((err: unknown) => {
      console.error(`[webhook] dispatch failed for event="${opts.event}"`, err);
    });
}
