import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('../../shared.js', async () => {
  const { sharedModuleMock } = await import('./_harness.js');
  return sharedModuleMock(h.execute);
});

import { mountRouter, req, sqlOf, TENANT_ID } from './_harness.js';
import { taxRatesRouter } from '../tax-rates.js';

const app = mountRouter(taxRatesRouter);

// NOTE: sharedDb uses the drizzle-orm/postgres-js driver, whose `execute()`
// resolves to the rows ARRAY directly (a postgres RowList). The tax-rates
// route reads results via `result[0]`, so mocks resolve to plain arrays here
// rather than the harness `rows()` wrapper (which fits routes that read `.rows`).

beforeEach(() => {
  h.execute.mockReset();
});

describe('tax-rates router', () => {
  describe('GET /', () => {
    it('scopes the query to the tenant and returns the rows', async () => {
      h.execute.mockResolvedValueOnce([{ id: 't1', name: 'VAT' }]);

      const res = await req(app, 'GET', '/');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 't1', name: 'VAT' }]);
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });
  });

  describe('GET /default', () => {
    it('returns the default tax rate', async () => {
      h.execute.mockResolvedValueOnce([{ id: 't1', name: 'VAT', isDefault: true }]);

      const res = await req(app, 'GET', '/default');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 't1', isDefault: true });
    });

    it('returns 404 when no default is configured', async () => {
      h.execute.mockResolvedValueOnce([]);

      const res = await req(app, 'GET', '/default');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'No default tax rate configured' });
    });
  });

  describe('POST /calculate', () => {
    it('rejects a negative amount without touching the DB', async () => {
      const res = await req(app, 'POST', '/calculate', { amount: -5 });
      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('computes tax for a specific rate (rate lookup + settings)', async () => {
      h.execute
        .mockResolvedValueOnce([{ id: 't1', name: 'VAT', rate: '0.2' }]) // rate lookup
        .mockResolvedValueOnce([{ currency: 'EUR' }]); // tenant settings

      const res = await req(app, 'POST', '/calculate', { amount: 100, taxRateId: 't1' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        subtotal: 100,
        taxAmount: 20,
        taxRate: 0.2,
        total: 120,
        currency: 'EUR',
        taxRateId: 't1',
        taxRateName: 'VAT',
      });
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('returns 404 when the requested taxRateId is not found', async () => {
      h.execute.mockResolvedValueOnce([]); // rate lookup empty

      const res = await req(app, 'POST', '/calculate', { amount: 100, taxRateId: 'missing' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Tax rate not found' });
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('returns zero tax and default currency when no default rate exists', async () => {
      h.execute
        .mockResolvedValueOnce([]) // default rate lookup empty
        .mockResolvedValueOnce([]); // settings empty -> USD

      const res = await req(app, 'POST', '/calculate', { amount: 50 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        subtotal: 50,
        taxAmount: 0,
        taxRate: 0,
        total: 50,
        currency: 'USD',
      });
    });
  });

  describe('POST /', () => {
    it('rejects an out-of-range rate without touching the DB', async () => {
      const res = await req(app, 'POST', '/', { name: 'Bad', rate: 2 });
      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('creates a non-default rate with a single insert and returns 201', async () => {
      h.execute.mockResolvedValueOnce([{ id: 't9', name: 'GST', rate: '0.1' }]);

      const res = await req(app, 'POST', '/', { name: 'GST', rate: 0.1 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 't9', name: 'GST' });
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });

    it('unsets existing defaults before inserting a new default rate', async () => {
      h.execute
        .mockResolvedValueOnce([]) // UPDATE unset defaults
        .mockResolvedValueOnce([{ id: 't10', name: 'Def', isDefault: true }]); // insert

      const res = await req(app, 'POST', '/', { name: 'Def', rate: 0.15, isDefault: true });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 't10', isDefault: true });
      expect(h.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /:id', () => {
    it('returns the rate when it exists', async () => {
      h.execute.mockResolvedValueOnce([{ id: 't1', name: 'VAT' }]);

      const res = await req(app, 'GET', '/t1');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 't1', name: 'VAT' });
    });

    it('returns 404 when the rate does not exist', async () => {
      h.execute.mockResolvedValueOnce([]);

      const res = await req(app, 'GET', '/nope');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });
  });

  describe('PUT /:id', () => {
    it('updates an existing rate', async () => {
      h.execute.mockResolvedValueOnce([{ id: 't1', name: 'Renamed' }]); // single UPDATE

      const res = await req(app, 'PUT', '/t1', { name: 'Renamed' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 't1', name: 'Renamed' });
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when updating a missing rate', async () => {
      h.execute.mockResolvedValueOnce([]); // UPDATE returns nothing

      const res = await req(app, 'PUT', '/nope', { name: 'X' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('soft-deletes an existing rate', async () => {
      h.execute.mockResolvedValueOnce([{ id: 't1', status: 'inactive' }]);

      const res = await req(app, 'DELETE', '/t1');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 't1', status: 'inactive' });
    });

    it('returns 404 when deleting a missing rate', async () => {
      h.execute.mockResolvedValueOnce([]);

      const res = await req(app, 'DELETE', '/nope');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /:id/set-default', () => {
    it('unsets other defaults then marks the target default (two updates)', async () => {
      h.execute
        .mockResolvedValueOnce([]) // unset all defaults
        .mockResolvedValueOnce([{ id: 't1', isDefault: true }]); // set this one

      const res = await req(app, 'POST', '/t1/set-default');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 't1', isDefault: true });
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('returns 404 when the target rate does not exist', async () => {
      h.execute
        .mockResolvedValueOnce([]) // unset all defaults
        .mockResolvedValueOnce([]); // set returns nothing

      const res = await req(app, 'POST', '/nope/set-default');

      expect(res.status).toBe(404);
    });
  });
});
