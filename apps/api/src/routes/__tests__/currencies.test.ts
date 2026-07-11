import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('../../shared.js', async () => {
  const { sharedModuleMock } = await import('./_harness.js');
  return sharedModuleMock(h.execute);
});

// The currencies router reads/writes exchange rates via a service that hits the
// network (`fetch`). Mock it so tests stay deterministic and offline.
const svc = vi.hoisted(() => ({
  getExchangeRates: vi.fn(async () => ({ USD: 1, EUR: 0.9, GBP: 0.8 })),
  convertAmount: vi.fn(
    (amount: number, from: string, to: string, rates: Record<string, number>) =>
      (amount / (rates[from] ?? 1)) * (rates[to] ?? 1),
  ),
  getCacheTimestamp: vi.fn(() => 0),
}));
vi.mock('../../services/exchange-rates.service.js', () => svc);

import { mountRouter, req, rows, sqlOf, TENANT_ID } from './_harness.js';
import { currenciesRouter } from '../currencies.js';

// This router reads `db` from the tenant context (not the shared singleton), so
// wire the execute mock in via the context override.
const app = mountRouter(currenciesRouter, { db: { execute: h.execute } });

beforeEach(() => {
  h.execute.mockReset();
});

describe('currencies router', () => {
  describe('GET /', () => {
    it('returns the static currency catalogue without touching the DB', async () => {
      const res = await req(app, 'GET', '/');
      expect(res.status).toBe(200);
      expect(Array.isArray((res.body as { currencies: unknown[] }).currencies)).toBe(true);
      expect((res.body as { currencies: { code: string }[] }).currencies).toContainEqual(
        expect.objectContaining({ code: 'USD', symbol: '$' }),
      );
      expect(h.execute).not.toHaveBeenCalled();
    });
  });

  describe('GET /supported', () => {
    it('mirrors the currency catalogue', async () => {
      const res = await req(app, 'GET', '/supported');
      expect(res.status).toBe(200);
      expect((res.body as { currencies: unknown[] }).currencies.length).toBeGreaterThan(0);
      expect(h.execute).not.toHaveBeenCalled();
    });
  });

  describe('GET /settings', () => {
    it('returns the stored row and scopes the query to the tenant', async () => {
      h.execute.mockResolvedValueOnce(rows([{ tenantId: TENANT_ID, baseCurrency: 'EUR' }]));

      const res = await req(app, 'GET', '/settings');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ tenantId: TENANT_ID, baseCurrency: 'EUR' });
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });

    it('falls back to default settings when no row exists', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'GET', '/settings');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        baseCurrency: 'USD',
        tenantId: TENANT_ID,
        supportedCurrencies: expect.arrayContaining(['USD', 'EUR']),
      });
    });
  });

  describe('PATCH /settings', () => {
    it('upserts and returns the persisted row', async () => {
      h.execute.mockResolvedValueOnce(
        rows([{ tenantId: TENANT_ID, baseCurrency: 'GBP', supportedCurrencies: ['GBP'] }]),
      );

      const res = await req(app, 'PATCH', '/settings', {
        baseCurrency: 'GBP',
        supportedCurrencies: ['GBP'],
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ baseCurrency: 'GBP' });
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain('GBP');
    });
  });

  describe('GET /rates', () => {
    it('returns live rates by default without a DB call', async () => {
      const res = await req(app, 'GET', '/rates?base=USD');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ base: 'USD', source: 'live', rates: { EUR: 0.9 } });
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('returns tenant-scoped manual rates when live=false', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'r1', baseCurrency: 'USD', targetCurrency: 'EUR' }]));

      const res = await req(app, 'GET', '/rates?base=USD&live=false');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        base: 'USD',
        source: 'manual',
        rates: [{ id: 'r1' }],
      });
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });
  });

  describe('POST /rates', () => {
    it('upserts a rate and returns 201 with the tenant + values in the SQL', async () => {
      h.execute.mockResolvedValueOnce(
        rows([{ id: 'r9', baseCurrency: 'USD', targetCurrency: 'EUR', rate: 0.9 }]),
      );

      const res = await req(app, 'POST', '/rates', {
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        rate: 0.9,
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'r9', targetCurrency: 'EUR' });
      const insertSql = sqlOf(h.execute.mock.calls[0][0]);
      expect(insertSql).toContain(TENANT_ID);
      expect(insertSql).toContain('EUR');
    });

    it('rejects a body with a non-positive rate and never touches the DB', async () => {
      const res = await req(app, 'POST', '/rates', {
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        rate: -5,
      });

      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('rejects a body missing targetCurrency without a DB call', async () => {
      const res = await req(app, 'POST', '/rates', { baseCurrency: 'USD', rate: 1 });

      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('returns 500 when the upsert yields no row', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'POST', '/rates', {
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        rate: 0.9,
      });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to save exchange rate' });
    });
  });

  describe('DELETE /rates/:id', () => {
    it('deletes a tenant-scoped rate and reports success', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'DELETE', '/rates/11111111-1111-1111-1111-111111111111');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: true });
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });
  });

  describe('GET /convert', () => {
    it('converts via live rates without a DB call', async () => {
      const res = await req(app, 'GET', '/convert?from=USD&to=EUR&amount=100');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
      });
      expect(typeof (res.body as { converted: number }).converted).toBe('number');
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('returns 400 for a non-numeric amount', async () => {
      const res = await req(app, 'GET', '/convert?from=USD&to=EUR&amount=notanumber');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid amount' });
    });
  });

  describe('POST /convert', () => {
    it('short-circuits identical currencies without a DB call', async () => {
      const res = await req(app, 'POST', '/convert', {
        amount: 50,
        fromCurrency: 'USD',
        toCurrency: 'USD',
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ converted: 50, rate: 1, fromCurrency: 'USD', toCurrency: 'USD' });
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('uses a stored direct rate when one exists', async () => {
      h.execute.mockResolvedValueOnce(rows([{ rate: '2' }]));

      const res = await req(app, 'POST', '/convert', {
        amount: 10,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ converted: 20, rate: 2, fromCurrency: 'USD', toCurrency: 'EUR' });
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });

    it('rejects a body missing the amount without a DB call', async () => {
      const res = await req(app, 'POST', '/convert', { fromCurrency: 'USD', toCurrency: 'EUR' });

      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });
  });
});
