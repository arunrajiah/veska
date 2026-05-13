import type { VeskaPluginContext } from '@veska/sdk';

interface StripeConfig {
  secretKey: string;
}

// Called when a Stripe customer.created webhook fires
export async function onCustomerCreated(
  input: { customer: { id: string; email: string; name: string; phone?: string; metadata?: Record<string, string> } },
  ctx: VeskaPluginContext,
): Promise<void> {
  const { customer } = input;

  // Check if contact already exists
  const existing = await ctx.entities.find({
    entityType: 'Contact',
    filters: { email: customer.email },
    limit: 1,
  });

  if (existing.length > 0) {
    await ctx.audit.log('stripe.customer.already_exists', { stripeId: customer.id, email: customer.email });
    return;
  }

  // Create contact
  const nameParts = (customer.name ?? '').split(' ');
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ');

  await ctx.entities.create({
    entityType: 'Contact',
    data: {
      first_name: firstName,
      last_name: lastName,
      email: customer.email,
      phone: customer.phone,
      notes: `Imported from Stripe. ID: ${customer.id}`,
    },
  });

  await ctx.audit.log('stripe.customer.synced', { stripeId: customer.id, email: customer.email });
}

// Called when a Stripe invoice.paid webhook fires
export async function onInvoicePaid(
  input: {
    invoice: {
      id: string;
      customer_email: string;
      amount_paid: number;
      currency: string;
      number: string;
      period_start: number;
      period_end: number;
    };
  },
  ctx: VeskaPluginContext,
): Promise<void> {
  const { invoice } = input;

  // Find the contact by email
  const contacts = await ctx.entities.find({
    entityType: 'Contact',
    filters: { email: invoice.customer_email },
    limit: 1,
  });

  const contactId = (contacts[0] as { id: string } | undefined)?.id;

  await ctx.entities.create({
    entityType: 'Invoice',
    data: {
      number: invoice.number ?? invoice.id,
      status: 'paid',
      customer_id: contactId,
      issue_date: new Date(invoice.period_start * 1000).toISOString().split('T')[0],
      due_date: new Date(invoice.period_end * 1000).toISOString().split('T')[0],
      total: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      notes: `Imported from Stripe invoice ${invoice.id}`,
    },
  });

  await ctx.audit.log('stripe.invoice.synced', { stripeInvoiceId: invoice.id });
}
