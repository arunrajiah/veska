import type { VeskaPluginContext } from '@veska/sdk';

// ── Shopify webhook payload shapes (subset of the fields we consume) ──────────

interface ShopifyCustomer {
  id: number | string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

interface ShopifyLineItem {
  title: string;
  quantity: number;
  price: string; // Shopify sends money as strings, e.g. "19.99"
  sku?: string;
}

interface ShopifyOrder {
  id: number | string;
  name: string; // human order number, e.g. "#1001"
  email?: string;
  currency: string;
  total_price: string;
  subtotal_price?: string;
  total_tax?: string;
  financial_status?: string; // "paid" | "pending" | "refunded" | ...
  created_at?: string;
  customer?: ShopifyCustomer;
  line_items?: ShopifyLineItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitName(customer: ShopifyCustomer): { firstName: string; lastName: string } {
  const first = customer.first_name?.trim() ?? '';
  const last = customer.last_name?.trim() ?? '';
  return { firstName: first, lastName: last };
}

function isoDate(value?: string): string {
  const d = value != null ? new Date(value) : new Date();
  const iso = Number.isNaN(d.getTime()) ? new Date() : d;
  return iso.toISOString().split('T')[0] as string;
}

/**
 * Find an existing Contact by email, or create one. Returns the Contact id, or
 * undefined when the customer carries no email to key on.
 */
async function upsertContact(
  customer: ShopifyCustomer | undefined,
  ctx: VeskaPluginContext,
): Promise<string | undefined> {
  const email = customer?.email?.trim();
  if (!email) return undefined;

  const existing = await ctx.entities.find({
    entityType: 'Contact',
    filters: { email },
    limit: 1,
  });

  if (existing.length > 0) {
    return (existing[0] as { id: string }).id;
  }

  const { firstName, lastName } = splitName(customer as ShopifyCustomer);
  const created = await ctx.entities.create({
    entityType: 'Contact',
    data: {
      first_name: firstName,
      last_name: lastName,
      email,
      phone: customer?.phone,
      notes: `Imported from Shopify. Customer ID: ${customer?.id ?? 'unknown'}`,
    },
  });
  return created.id;
}

// ── Handlers ────────────────────────────────────────────────────────────────

/** Shopify `customers/create` webhook → create a Veska Contact (deduped by email). */
export async function onCustomerCreated(
  input: { customer: ShopifyCustomer },
  ctx: VeskaPluginContext,
): Promise<void> {
  const { customer } = input;
  const email = customer.email?.trim();

  if (!email) {
    await ctx.audit.log('shopify.customer.skipped_no_email', { shopifyId: customer.id });
    return;
  }

  const existing = await ctx.entities.find({
    entityType: 'Contact',
    filters: { email },
    limit: 1,
  });

  if (existing.length > 0) {
    await ctx.audit.log('shopify.customer.already_exists', { shopifyId: customer.id, email });
    return;
  }

  const { firstName, lastName } = splitName(customer);
  await ctx.entities.create({
    entityType: 'Contact',
    data: {
      first_name: firstName,
      last_name: lastName,
      email,
      phone: customer.phone,
      notes: `Imported from Shopify. Customer ID: ${customer.id}`,
    },
  });

  await ctx.audit.log('shopify.customer.synced', { shopifyId: customer.id, email });
}

/**
 * Shopify `orders/create` webhook → create a Veska Invoice, upserting the
 * ordering customer as a Contact first so the invoice is linked.
 */
export async function onOrderCreated(
  input: { order: ShopifyOrder },
  ctx: VeskaPluginContext,
): Promise<void> {
  const { order } = input;

  // Prefer the embedded customer; fall back to a bare email on the order.
  const customer: ShopifyCustomer | undefined =
    order.customer ?? (order.email ? { id: `order-${order.id}`, email: order.email } : undefined);

  const contactId = await upsertContact(customer, ctx);

  const lineItems = (order.line_items ?? []).map((li) => ({
    description: li.title,
    quantity: li.quantity,
    unit_price: Number(li.price),
    amount: Number(li.price) * li.quantity,
    sku: li.sku,
  }));

  const status = order.financial_status === 'paid' ? 'paid' : 'open';

  const created = await ctx.entities.create({
    entityType: 'Invoice',
    data: {
      number: order.name,
      status,
      customer_id: contactId,
      issue_date: isoDate(order.created_at),
      currency: order.currency.toUpperCase(),
      subtotal: order.subtotal_price != null ? Number(order.subtotal_price) : undefined,
      tax: order.total_tax != null ? Number(order.total_tax) : undefined,
      total: Number(order.total_price),
      line_items: lineItems,
      notes: `Imported from Shopify order ${order.name} (ID: ${order.id})`,
    },
  });

  await ctx.audit.log('shopify.order.synced', {
    shopifyOrderId: order.id,
    orderName: order.name,
    veskaInvoiceId: created.id,
    status,
  });
}

/**
 * Shopify `orders/paid` webhook → reconcile the matching Invoice to `paid`. If
 * the order was never synced (no matching invoice), create it as a paid invoice.
 */
export async function onOrderPaid(
  input: { order: ShopifyOrder },
  ctx: VeskaPluginContext,
): Promise<void> {
  const { order } = input;

  const matches = await ctx.entities.find({
    entityType: 'Invoice',
    filters: { number: order.name },
    limit: 1,
  });

  const existing = matches[0] as { id: string } | undefined;

  if (existing) {
    await ctx.entities.update('Invoice', existing.id, {
      status: 'paid',
      paid_date: isoDate(),
    });
    await ctx.audit.log('shopify.order.reconciled', {
      shopifyOrderId: order.id,
      orderName: order.name,
      veskaInvoiceId: existing.id,
    });
    return;
  }

  // Never synced — create it directly as paid.
  await onOrderCreated({ order: { ...order, financial_status: 'paid' } }, ctx);
}
