import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('../../shared.js', async () => {
  const { sharedModuleMock } = await import('./_harness.js');
  return sharedModuleMock(h.execute);
});

import { mountRouter, req, rows, sqlOf, TENANT_ID } from './_harness.js';
import { vendorsRouter } from '../vendors.js';

const app = mountRouter(vendorsRouter);

beforeEach(() => {
  h.execute.mockReset();
});

describe('vendors router', () => {
  describe('GET /summary', () => {
    it('aggregates totals and outstanding invoices', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ total: '3', active: '2', avgRating: '4.25' }]))
        .mockResolvedValueOnce(rows([{ outstandingAmount: '1500.50' }]));

      const res = await req(app, 'GET', '/summary');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        total: 3,
        active: 2,
        avgRating: 4.25,
        totalOutstandingInvoices: 1500.5,
      });
    });

    it('returns zeroed defaults when there are no vendors', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ total: '0', active: '0', avgRating: null }]))
        .mockResolvedValueOnce(rows([{ outstandingAmount: '0' }]));

      const res = await req(app, 'GET', '/summary');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 0, active: 0, avgRating: null });
    });
  });

  describe('GET /', () => {
    it('scopes the query to the tenant and returns the rows', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'v1', name: 'Acme' }]));

      const res = await req(app, 'GET', '/');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 'v1', name: 'Acme' }]);
      // tenantId must be interpolated into the SQL
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });
  });

  describe('POST /', () => {
    it('rejects a body missing the required name', async () => {
      const res = await req(app, 'POST', '/', { category: 'supplier' });
      expect(res.status).toBe(400);
      // no DB call should have happened
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('auto-generates a padded code and returns 201', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ cnt: '4' }])) // count for code
        .mockResolvedValueOnce(rows([{ id: 'v5', code: 'VEN-0005', name: 'New Co' }])); // insert

      const res = await req(app, 'POST', '/', { name: 'New Co' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ code: 'VEN-0005' });
      // the generated code VEN-0005 must be interpolated into the INSERT
      expect(sqlOf(h.execute.mock.calls[1][0])).toContain('VEN-0005');
    });

    it('returns 500 when the insert returns no row', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ cnt: '0' }]))
        .mockResolvedValueOnce(rows([])); // insert returned nothing

      const res = await req(app, 'POST', '/', { name: 'New Co' });
      expect(res.status).toBe(500);
    });
  });

  describe('GET /:id', () => {
    it('returns 404 when the vendor does not exist', async () => {
      h.execute
        .mockResolvedValueOnce(rows([])) // vendor lookup
        .mockResolvedValueOnce(rows([])) // contacts
        .mockResolvedValueOnce(rows([])); // ratings

      const res = await req(app, 'GET', '/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Vendor not found' });
    });

    it('returns the vendor with contacts and ratings', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'v1', name: 'Acme' }]))
        .mockResolvedValueOnce(rows([{ id: 'c1', name: 'Jane' }]))
        .mockResolvedValueOnce(rows([{ category: 'quality', avgScore: '4.5', count: '2' }]));

      const res = await req(app, 'GET', '/v1');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 'v1',
        name: 'Acme',
        contacts: [{ id: 'c1', name: 'Jane' }],
        ratingsByCategory: [{ category: 'quality', avgScore: '4.5', count: '2' }],
      });
    });
  });

  describe('PUT /:id', () => {
    it('returns 404 when updating a missing vendor', async () => {
      h.execute.mockResolvedValueOnce(rows([])); // existence check
      const res = await req(app, 'PUT', '/nope', { name: 'X' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('soft-deletes an existing vendor', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'v1' }])) // existence check
        .mockResolvedValueOnce(rows([])); // update
      const res = await req(app, 'DELETE', '/v1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });
  });

  describe('POST /:id/ratings', () => {
    it('validates the score range', async () => {
      const res = await req(app, 'POST', '/v1/ratings', { category: 'quality', score: 9 });
      expect(res.status).toBe(400);
    });
  });
});
