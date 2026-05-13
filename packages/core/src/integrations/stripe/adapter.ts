import type { IntegrationAdapter } from '../../primitives/integration.js';

// ──────────────────────────────────────────────────────────────
// Stripe config / credential types
// ──────────────────────────────────────────────────────────────

export interface StripeConfig {
  secretKey: string;
}

// ──────────────────────────────────────────────────────────────
// Normalized return types
// ──────────────────────────────────────────────────────────────

export interface StripeCustomer {
  stripeId: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  created: number;
  metadata: Record<string, string>;
}

export interface StripeInvoice {
  stripeId: string;
  customerId: string;
  amountPaid: number;
  currency: string;
  status: string;
  periodStart: number;
  periodEnd: number;
}

// Raw Stripe API list response shape
interface StripeListResponse<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
}

interface RawStripeCustomer {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  created: number;
  metadata: Record<string, string>;
}

interface RawStripeInvoice {
  id: string;
  customer: string;
  amount_paid: number;
  currency: string;
  status: string;
  lines: {
    data: Array<{
      period: { start: number; end: number };
    }>;
  };
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

const STRIPE_BASE = 'https://api.stripe.com/v1';

async function stripeGet<T>(
  path: string,
  secretKey: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${STRIPE_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stripe GET ${path} failed (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

async function stripePost<T>(
  path: string,
  secretKey: string,
  body: Record<string, string>,
): Promise<T> {
  const response = await fetch(`${STRIPE_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stripe POST ${path} failed (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// ──────────────────────────────────────────────────────────────
// StripeIntegrationAdapter
// ──────────────────────────────────────────────────────────────

export class StripeIntegrationAdapter implements IntegrationAdapter {
  readonly integrationId = 'stripe';
  readonly name = 'stripe';
  readonly displayName = 'Stripe';
  readonly description =
    'Sync Stripe customers, subscriptions, and invoices with Veska CRM.';
  readonly version = '1.0.0';
  readonly requiredCredentials = ['secretKey'];

  // ── connect / disconnect ─────────────────────────────────────

  async connect(_credentials: unknown): Promise<void> {
    // Stripe is stateless HTTP — no persistent connection needed.
    // Credentials are passed per-call via config.
  }

  async disconnect(): Promise<void> {
    // No persistent connection to tear down.
  }

  // ── validateCredentials ──────────────────────────────────────

  async validateCredentials(
    config: StripeConfig,
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      await stripeGet('/balance', config.secretKey);
      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ── syncCustomers ────────────────────────────────────────────

  async syncCustomers(
    config: StripeConfig,
    params?: { startingAfter?: string },
  ): Promise<StripeCustomer[]> {
    const queryParams: Record<string, string> = { limit: '100' };
    if (params?.startingAfter) {
      queryParams['starting_after'] = params.startingAfter;
    }

    const list = await stripeGet<StripeListResponse<RawStripeCustomer>>(
      '/customers',
      config.secretKey,
      queryParams,
    );

    return list.data.map((c) => ({
      stripeId: c.id,
      email: c.email,
      name: c.name,
      phone: c.phone,
      created: c.created,
      metadata: c.metadata ?? {},
    }));
  }

  // ── syncInvoices ─────────────────────────────────────────────

  async syncInvoices(
    config: StripeConfig,
    params?: { startingAfter?: string },
  ): Promise<StripeInvoice[]> {
    const queryParams: Record<string, string> = { limit: '100', status: 'paid' };
    if (params?.startingAfter) {
      queryParams['starting_after'] = params.startingAfter;
    }

    const list = await stripeGet<StripeListResponse<RawStripeInvoice>>(
      '/invoices',
      config.secretKey,
      queryParams,
    );

    return list.data.map((inv) => {
      const period = inv.lines.data[0]?.period ?? { start: 0, end: 0 };
      return {
        stripeId: inv.id,
        customerId: inv.customer,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        periodStart: period.start,
        periodEnd: period.end,
      };
    });
  }

  // ── createCustomer ───────────────────────────────────────────

  async createCustomer(
    config: StripeConfig,
    params: { name: string; email: string; phone?: string; metadata?: Record<string, string> },
  ): Promise<{ stripeId: string }> {
    const body: Record<string, string> = {
      name: params.name,
      email: params.email,
    };

    if (params.phone) {
      body['phone'] = params.phone;
    }

    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        body[`metadata[${key}]`] = value;
      }
    }

    const customer = await stripePost<RawStripeCustomer>(
      '/customers',
      config.secretKey,
      body,
    );

    return { stripeId: customer.id };
  }

  // ── call (dispatch) ──────────────────────────────────────────

  async call(
    method: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const config = params['config'] as StripeConfig;

    switch (method) {
      case 'sync.customers':
        return this.syncCustomers(config, params as { startingAfter?: string });
      case 'sync.invoices':
        return this.syncInvoices(config, params as { startingAfter?: string });
      case 'create.customer':
        return this.createCustomer(
          config,
          params as { name: string; email: string; phone?: string; metadata?: Record<string, string> },
        );
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  // ── healthCheck ──────────────────────────────────────────────

  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number }> {
    // Health check requires credentials; returns healthy by default (credentials checked via validateCredentials)
    return { healthy: true };
  }
}
