import type { VeskaPluginContext } from '@veska/sdk';

// config: { accessToken: string, tenantId: string } — set by the tenant at install.
// `tenantId` here is the Xero organisation id (the Xero-tenant-id header), which
// is distinct from the Veska tenant on ctx.tenantId.
interface XeroConfig {
  accessToken: string;
  tenantId: string;
}

const XERO_BASE = 'https://api.xero.com/api.xro/2.0';

function readConfig(ctx: VeskaPluginContext): XeroConfig {
  return (ctx as unknown as { config: XeroConfig }).config;
}

function authHeaders(config: XeroConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${config.accessToken}`,
    'Xero-tenant-id': config.tenantId,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/** ISO date (YYYY-MM-DD) for a Xero Date field. */
function isoDate(value?: string): string {
  const d = value != null ? new Date(value) : new Date();
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  return safe.toISOString().split('T')[0] as string;
}

// ── Handlers ────────────────────────────────────────────────────────────────

/**
 * Called when a Veska invoice is marked paid — posts an accounts-receivable
 * invoice to Xero, resolving the contact name from the linked Veska Contact.
 */
export async function onInvoicePaid(
  input: {
    invoice: {
      id: string;
      number: string;
      contact_id?: string;
      total: number;
      currency: string;
      issue_date?: string;
      due_date?: string;
      line_items?: Array<{ description?: string; quantity?: number; unit_price?: number; amount?: number }>;
    };
  },
  ctx: VeskaPluginContext,
): Promise<void> {
  const { invoice } = input;
  const config = readConfig(ctx);

  // Resolve the contact for the Xero Contact.Name (required by Xero).
  let contactName = 'Unknown Customer';
  if (invoice.contact_id != null) {
    const contact = (await ctx.entities.findOne('Contact', invoice.contact_id)) as {
      data: { first_name?: string; last_name?: string; email?: string };
    } | null;
    if (contact != null) {
      const name = `${contact.data.first_name ?? ''} ${contact.data.last_name ?? ''}`.trim();
      contactName = name || contact.data.email || contactName;
    }
  }

  // Prefer the invoice's own line items; fall back to a single summary line.
  const lineItems =
    invoice.line_items != null && invoice.line_items.length > 0
      ? invoice.line_items.map((li) => ({
          Description: li.description ?? 'Item',
          Quantity: li.quantity ?? 1,
          UnitAmount: li.unit_price ?? li.amount ?? invoice.total,
          AccountCode: '200',
        }))
      : [{ Description: `Invoice ${invoice.number}`, Quantity: 1, UnitAmount: invoice.total, AccountCode: '200' }];

  const xeroInvoice = {
    Type: 'ACCREC',
    Contact: { Name: contactName },
    Date: isoDate(invoice.issue_date),
    DueDate: isoDate(invoice.due_date ?? invoice.issue_date),
    LineAmountTypes: 'Exclusive',
    CurrencyCode: invoice.currency.toUpperCase(),
    Reference: invoice.number,
    Status: 'AUTHORISED',
    LineItems: lineItems,
  };

  const response = await fetch(`${XERO_BASE}/Invoices`, {
    method: 'POST',
    headers: authHeaders(config),
    body: JSON.stringify({ Invoices: [xeroInvoice] }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Xero invoice POST failed (${response.status}): ${body}`);
  }

  const result = (await response.json()) as { Invoices: Array<{ InvoiceID: string }> };
  const xeroInvoiceId = result.Invoices[0]?.InvoiceID;

  await ctx.audit.log('xero.invoice.synced', {
    veskaInvoiceId: invoice.id,
    xeroInvoiceId,
    tenantId: config.tenantId,
  });
}

/** Called when a new Contact is created in Veska — syncs it to Xero as a Contact. */
export async function onContactCreated(
  input: {
    contact: {
      id: string;
      data: { first_name?: string; last_name?: string; email?: string; phone?: string };
    };
  },
  ctx: VeskaPluginContext,
): Promise<void> {
  const { contact } = input;
  const config = readConfig(ctx);

  const firstName = contact.data.first_name ?? '';
  const lastName = contact.data.last_name ?? '';
  const name = `${firstName} ${lastName}`.trim() || contact.data.email || 'Unknown';

  const xeroContact: Record<string, unknown> = {
    Name: name,
    FirstName: firstName,
    LastName: lastName,
  };

  if (contact.data.email != null) {
    xeroContact['EmailAddress'] = contact.data.email;
  }
  if (contact.data.phone != null) {
    xeroContact['Phones'] = [{ PhoneType: 'DEFAULT', PhoneNumber: contact.data.phone }];
  }

  const response = await fetch(`${XERO_BASE}/Contacts`, {
    method: 'POST',
    headers: authHeaders(config),
    body: JSON.stringify({ Contacts: [xeroContact] }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Xero contact POST failed (${response.status}): ${body}`);
  }

  const result = (await response.json()) as { Contacts: Array<{ ContactID: string }> };
  const xeroContactId = result.Contacts[0]?.ContactID;

  await ctx.audit.log('xero.contact.synced', {
    veskaContactId: contact.id,
    xeroContactId,
    tenantId: config.tenantId,
  });
}
