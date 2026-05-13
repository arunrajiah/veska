import type { VeskaPluginContext } from '@veska/sdk';

// config: { accessToken: string, realmId: string }
interface QuickBooksConfig {
  accessToken: string;
  realmId: string;
}

const QB_SANDBOX_BASE = 'https://sandbox-quickbooks.api.intuit.com';

// Called when a Veska invoice is marked paid — mirrors it into QuickBooks Online
export async function onInvoicePaid(
  input: {
    invoice: {
      id: string;
      number: string;
      contact_id: string;
      total: number;
      currency: string;
      due_date: string;
    };
  },
  ctx: VeskaPluginContext,
): Promise<void> {
  const { invoice } = input;

  // Retrieve plugin config (accessToken and realmId are set by the tenant at install time)
  const config = (ctx as unknown as { config: QuickBooksConfig }).config;

  // Fetch the associated contact to get name / email for the CustomerRef
  const contact = (await ctx.entities.findOne('Contact', invoice.contact_id)) as {
    id: string;
    data: { first_name?: string; last_name?: string; email?: string };
  } | null;

  const displayName =
    contact != null
      ? `${contact.data.first_name ?? ''} ${contact.data.last_name ?? ''}`.trim()
      : 'Unknown Customer';

  // Build the QuickBooks Invoice payload
  const qbInvoice = {
    DocNumber: invoice.number,
    DueDate: invoice.due_date,
    CurrencyRef: { value: invoice.currency },
    CustomerRef: { name: displayName },
    Line: [
      {
        Amount: invoice.total,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: { ItemRef: { value: '1', name: 'Services' } },
      },
    ],
  };

  const url = `${QB_SANDBOX_BASE}/v3/company/${config.realmId}/invoice`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(qbInvoice),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`QuickBooks invoice POST failed (${response.status}): ${body}`);
  }

  const result = (await response.json()) as { Invoice: { Id: string } };

  await ctx.audit.log('quickbooks.invoice.synced', {
    veskaInvoiceId: invoice.id,
    qbInvoiceId: result.Invoice.Id,
    realmId: config.realmId,
  });
}

// Called when a new Contact is created in Veska — syncs it to QuickBooks as a Customer
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

  const config = (ctx as unknown as { config: QuickBooksConfig }).config;

  const firstName = contact.data.first_name ?? '';
  const lastName = contact.data.last_name ?? '';
  const displayName = `${firstName} ${lastName}`.trim() || contact.data.email ?? 'Unknown';

  const qbCustomer: Record<string, unknown> = {
    DisplayName: displayName,
    GivenName: firstName,
    FamilyName: lastName,
  };

  if (contact.data.email != null) {
    qbCustomer['PrimaryEmailAddr'] = { Address: contact.data.email };
  }

  if (contact.data.phone != null) {
    qbCustomer['PrimaryPhone'] = { FreeFormNumber: contact.data.phone };
  }

  const url = `${QB_SANDBOX_BASE}/v3/company/${config.realmId}/customer`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(qbCustomer),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`QuickBooks customer POST failed (${response.status}): ${body}`);
  }

  const result = (await response.json()) as { Customer: { Id: string } };

  await ctx.audit.log('quickbooks.customer.synced', {
    veskaContactId: contact.id,
    qbCustomerId: result.Customer.Id,
    realmId: config.realmId,
  });
}
