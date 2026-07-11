import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { VeskaPluginContext } from '@veska/sdk';
import { onInvoicePaid, onContactCreated } from '../index.js';

const CONFIG = { accessToken: 'tok-123', tenantId: 'org-xyz' };

function makeCtx(overrides: Partial<VeskaPluginContext['entities']> = {}) {
  const entities = {
    find: vi.fn(async () => [] as unknown[]),
    findOne: vi.fn(async () => null),
    create: vi.fn(async () => ({ id: 'new-id' })),
    update: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    ...overrides,
  };
  const audit = { log: vi.fn(async () => undefined) };
  const ctx = {
    tenantId: 't1',
    pluginId: 'com.veska.xero',
    config: CONFIG,
    entities,
    audit,
    workflows: { trigger: vi.fn() },
    channels: { send: vi.fn() },
    ai: { run: vi.fn() },
  } as unknown as VeskaPluginContext;
  return { ctx, entities, audit };
}

function mockFetchOk(body: unknown) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof fetch;
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock as unknown as ReturnType<typeof vi.fn>;
}

function lastFetch(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: url as string, init: init as RequestInit, body: JSON.parse(init.body as string) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('onInvoicePaid', () => {
  const invoice = {
    id: 'inv-1',
    number: 'INV-1001',
    contact_id: 'c1',
    total: 90,
    currency: 'usd',
    issue_date: '2026-05-01',
    due_date: '2026-05-31',
    line_items: [
      { description: 'Widget', quantity: 2, unit_price: 20, amount: 40 },
      { description: 'Gadget', quantity: 1, unit_price: 50, amount: 50 },
    ],
  };

  let h: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    h = makeCtx({
      findOne: vi.fn(async () => ({ data: { first_name: 'Sam', last_name: 'Buyer', email: 's@x.com' } })),
    });
  });

  it('posts an ACCREC invoice to Xero with mapped line items and headers', async () => {
    const fetchMock = mockFetchOk({ Invoices: [{ InvoiceID: 'xero-inv-9' }] });

    await onInvoicePaid({ invoice }, h.ctx);

    const { url, init, body } = lastFetch(fetchMock);
    expect(url).toBe('https://api.xero.com/api.xro/2.0/Invoices');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer tok-123');
    expect(headers['Xero-tenant-id']).toBe('org-xyz');

    const xInv = body.Invoices[0];
    expect(xInv).toMatchObject({
      Type: 'ACCREC',
      Contact: { Name: 'Sam Buyer' },
      CurrencyCode: 'USD',
      Reference: 'INV-1001',
      Status: 'AUTHORISED',
      Date: '2026-05-01',
      DueDate: '2026-05-31',
    });
    expect(xInv.LineItems).toEqual([
      { Description: 'Widget', Quantity: 2, UnitAmount: 20, AccountCode: '200' },
      { Description: 'Gadget', Quantity: 1, UnitAmount: 50, AccountCode: '200' },
    ]);
    expect(h.audit.log).toHaveBeenCalledWith(
      'xero.invoice.synced',
      expect.objectContaining({ veskaInvoiceId: 'inv-1', xeroInvoiceId: 'xero-inv-9' }),
    );
  });

  it('falls back to a single summary line when the invoice has no line items', async () => {
    const fetchMock = mockFetchOk({ Invoices: [{ InvoiceID: 'x' }] });
    const { line_items, ...noLines } = invoice;

    await onInvoicePaid({ invoice: noLines }, h.ctx);

    const { body } = lastFetch(fetchMock);
    expect(body.Invoices[0].LineItems).toEqual([
      { Description: 'Invoice INV-1001', Quantity: 1, UnitAmount: 90, AccountCode: '200' },
    ]);
  });

  it('uses a fallback contact name when the contact is missing', async () => {
    const fetchMock = mockFetchOk({ Invoices: [{ InvoiceID: 'x' }] });
    const h2 = makeCtx({ findOne: vi.fn(async () => null) });

    await onInvoicePaid({ invoice }, h2.ctx);

    expect(lastFetch(fetchMock).body.Invoices[0].Contact.Name).toBe('Unknown Customer');
  });

  it('throws when Xero returns a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 401, text: async () => 'unauthorized' })) as unknown as typeof fetch,
    );

    await expect(onInvoicePaid({ invoice }, h.ctx)).rejects.toThrow(/Xero invoice POST failed \(401\)/);
    expect(h.audit.log).not.toHaveBeenCalled();
  });
});

describe('onContactCreated', () => {
  const contact = {
    id: 'c1',
    data: { first_name: 'Jane', last_name: 'Doe', email: 'jane@x.com', phone: '555-1000' },
  };

  it('posts a Xero contact with email and phone', async () => {
    const h = makeCtx();
    const fetchMock = mockFetchOk({ Contacts: [{ ContactID: 'xero-c-7' }] });

    await onContactCreated({ contact }, h.ctx);

    const { url, body } = lastFetch(fetchMock);
    expect(url).toBe('https://api.xero.com/api.xro/2.0/Contacts');
    expect(body.Contacts[0]).toMatchObject({
      Name: 'Jane Doe',
      FirstName: 'Jane',
      LastName: 'Doe',
      EmailAddress: 'jane@x.com',
      Phones: [{ PhoneType: 'DEFAULT', PhoneNumber: '555-1000' }],
    });
    expect(h.audit.log).toHaveBeenCalledWith(
      'xero.contact.synced',
      expect.objectContaining({ veskaContactId: 'c1', xeroContactId: 'xero-c-7' }),
    );
  });

  it('omits Phones when no phone is present and falls back to email for Name', async () => {
    const h = makeCtx();
    const fetchMock = mockFetchOk({ Contacts: [{ ContactID: 'x' }] });

    await onContactCreated({ contact: { id: 'c2', data: { email: 'only@x.com' } } }, h.ctx);

    const body = lastFetch(fetchMock).body;
    expect(body.Contacts[0].Name).toBe('only@x.com');
    expect(body.Contacts[0].Phones).toBeUndefined();
  });
});
