import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VeskaPluginContext } from '@veska/sdk';
import { onCustomerCreated, onOrderCreated, onOrderPaid } from '../index.js';

// A minimal mock of the plugin context. Each data method is a spy so tests can
// assert on the exact entity mutations a handler performs.
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
    pluginId: 'com.veska.shopify',
    entities,
    audit,
    workflows: { trigger: vi.fn() },
    channels: { send: vi.fn() },
    ai: { run: vi.fn() },
  } as unknown as VeskaPluginContext;
  return { ctx, entities, audit };
}

describe('onCustomerCreated', () => {
  let h: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    h = makeCtx();
  });

  it('creates a Contact from a new Shopify customer', async () => {
    await onCustomerCreated(
      { customer: { id: 42, email: 'jane@shop.com', first_name: 'Jane', last_name: 'Doe', phone: '555' } },
      h.ctx,
    );

    expect(h.entities.create).toHaveBeenCalledTimes(1);
    expect(h.entities.create).toHaveBeenCalledWith({
      entityType: 'Contact',
      data: expect.objectContaining({
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@shop.com',
        phone: '555',
      }),
    });
    expect(h.audit.log).toHaveBeenCalledWith('shopify.customer.synced', expect.any(Object));
  });

  it('does not duplicate an existing Contact', async () => {
    h = makeCtx({ find: vi.fn(async () => [{ id: 'c1' }]) });
    await onCustomerCreated({ customer: { id: 42, email: 'jane@shop.com' } }, h.ctx);

    expect(h.entities.create).not.toHaveBeenCalled();
    expect(h.audit.log).toHaveBeenCalledWith('shopify.customer.already_exists', expect.any(Object));
  });

  it('skips customers without an email', async () => {
    await onCustomerCreated({ customer: { id: 42, first_name: 'NoEmail' } }, h.ctx);

    expect(h.entities.find).not.toHaveBeenCalled();
    expect(h.entities.create).not.toHaveBeenCalled();
    expect(h.audit.log).toHaveBeenCalledWith('shopify.customer.skipped_no_email', expect.any(Object));
  });
});

describe('onOrderCreated', () => {
  const order = {
    id: 1001,
    name: '#1001',
    currency: 'usd',
    total_price: '119.98',
    subtotal_price: '109.98',
    total_tax: '10.00',
    financial_status: 'pending',
    created_at: '2026-05-01T12:00:00Z',
    customer: { id: 7, email: 'buyer@shop.com', first_name: 'Sam', last_name: 'Buyer' },
    line_items: [
      { title: 'Widget', quantity: 2, price: '19.99' },
      { title: 'Gadget', quantity: 1, price: '70.00' },
    ],
  };

  it('upserts the customer then creates a linked Invoice with mapped line items', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: 'contact-9' }) // Contact
      .mockResolvedValueOnce({ id: 'invoice-9' }); // Invoice
    const h = makeCtx({ create });

    await onOrderCreated({ order }, h.ctx);

    expect(create).toHaveBeenCalledTimes(2);
    const invoiceCall = create.mock.calls[1][0];
    expect(invoiceCall.entityType).toBe('Invoice');
    expect(invoiceCall.data).toMatchObject({
      number: '#1001',
      status: 'open', // pending -> open
      customer_id: 'contact-9',
      currency: 'USD',
      total: 119.98,
      subtotal: 109.98,
      tax: 10,
      issue_date: '2026-05-01',
    });
    expect(invoiceCall.data.line_items).toEqual([
      { description: 'Widget', quantity: 2, unit_price: 19.99, amount: 39.98, sku: undefined },
      { description: 'Gadget', quantity: 1, unit_price: 70, amount: 70, sku: undefined },
    ]);
  });

  it('marks the invoice paid when the order is already paid', async () => {
    const h = makeCtx();
    await onOrderCreated({ order: { ...order, financial_status: 'paid' } }, h.ctx);
    const invoiceCall = h.entities.create.mock.calls.at(-1)![0];
    expect(invoiceCall.data.status).toBe('paid');
  });

  it('reuses an existing contact instead of creating one', async () => {
    const h = makeCtx({ find: vi.fn(async () => [{ id: 'existing-contact' }]) });
    await onOrderCreated({ order }, h.ctx);
    // only the Invoice is created, not the Contact
    expect(h.entities.create).toHaveBeenCalledTimes(1);
    expect(h.entities.create.mock.calls[0][0].entityType).toBe('Invoice');
    expect(h.entities.create.mock.calls[0][0].data.customer_id).toBe('existing-contact');
  });

  it('creates an invoice with no customer_id when the order has no customer or email', async () => {
    const h = makeCtx();
    const anonymous = {
      id: 2002,
      name: '#2002',
      currency: 'USD',
      total_price: '25.00',
      line_items: [{ title: 'Sticker', quantity: 1, price: '25.00' }],
    };
    await onOrderCreated({ order: anonymous }, h.ctx);
    expect(h.entities.create).toHaveBeenCalledTimes(1);
    expect(h.entities.create.mock.calls[0][0].data.customer_id).toBeUndefined();
  });
});

describe('onOrderPaid', () => {
  const order = { id: 1001, name: '#1001', currency: 'USD', total_price: '50.00' };

  it('reconciles an existing invoice to paid', async () => {
    const h = makeCtx({ find: vi.fn(async () => [{ id: 'invoice-5' }]) });
    await onOrderPaid({ order }, h.ctx);

    expect(h.entities.update).toHaveBeenCalledWith(
      'Invoice',
      'invoice-5',
      expect.objectContaining({ status: 'paid' }),
    );
    expect(h.entities.create).not.toHaveBeenCalled();
    expect(h.audit.log).toHaveBeenCalledWith('shopify.order.reconciled', expect.any(Object));
  });

  it('creates a paid invoice when the order was never synced', async () => {
    const h = makeCtx({ find: vi.fn(async () => []) });
    await onOrderPaid({ order }, h.ctx);

    expect(h.entities.update).not.toHaveBeenCalled();
    const invoiceCall = h.entities.create.mock.calls.at(-1)![0];
    expect(invoiceCall.entityType).toBe('Invoice');
    expect(invoiceCall.data.status).toBe('paid');
  });
});
