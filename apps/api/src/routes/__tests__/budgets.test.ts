import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('../../shared.js', async () => {
  const { sharedModuleMock } = await import('./_harness.js');
  return sharedModuleMock(h.execute);
});

import { mountRouter, req, rows, sqlOf, TENANT_ID } from './_harness.js';
import { budgetsRouter } from '../budgets.js';

const app = mountRouter(budgetsRouter);

beforeEach(() => {
  h.execute.mockReset();
});

describe('budgets router', () => {
  describe('GET /summary', () => {
    it('aggregates budgeted totals and actuals (3 queries)', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'b1', name: 'Ops', currency: 'USD', totalPlanned: '1000' }]))
        .mockResolvedValueOnce(rows([{ total: '400' }]))
        .mockResolvedValueOnce(rows([{ total: '100' }]));

      const res = await req(app, 'GET', '/summary');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        totalBudgeted: 1000,
        totalActuals: 500,
        utilizationPct: 50,
        activeBudgetCount: 1,
        activeBudgetNames: ['Ops'],
      });
      expect(h.execute).toHaveBeenCalledTimes(3);
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });

    it('returns zeroed utilization when there are no budgets', async () => {
      h.execute
        .mockResolvedValueOnce(rows([]))
        .mockResolvedValueOnce(rows([{ total: '0' }]))
        .mockResolvedValueOnce(rows([{ total: '0' }]));

      const res = await req(app, 'GET', '/summary');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        totalBudgeted: 0,
        totalActuals: 0,
        utilizationPct: 0,
        activeBudgetCount: 0,
        activeBudgetNames: [],
      });
    });
  });

  describe('GET /', () => {
    it('scopes the list query to the tenant and returns rows', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'b1', name: 'Ops' }]));

      const res = await req(app, 'GET', '/');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 'b1', name: 'Ops' }]);
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });
  });

  describe('GET /:id', () => {
    it('returns the budget when found', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'b1', name: 'Ops', lineItems: [] }]));

      const res = await req(app, 'GET', '/b1');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 'b1', name: 'Ops' });
    });

    it('returns 404 when the budget does not exist', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'GET', '/missing');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });
  });

  describe('POST /', () => {
    it('rejects a body missing the required name', async () => {
      const res = await req(app, 'POST', '/', { fiscalYear: 2026 });

      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('creates a budget and returns 201', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'b9', name: 'New', fiscalYear: 2026 }]));

      const res = await req(app, 'POST', '/', { name: 'New', fiscalYear: 2026 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'b9', name: 'New' });
      expect(h.execute).toHaveBeenCalledTimes(1);
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });
  });

  describe('PUT /:id', () => {
    it('returns 404 when updating a missing budget (existence check only)', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'PUT', '/nope', { name: 'X' });

      expect(res.status).toBe(404);
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('updates an existing budget (check + update)', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'b1' }]))
        .mockResolvedValueOnce(rows([{ id: 'b1', name: 'Renamed' }]));

      const res = await req(app, 'PUT', '/b1', { name: 'Renamed' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 'b1', name: 'Renamed' });
      expect(h.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('DELETE /:id', () => {
    it('deletes an existing budget (check + delete)', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'b1' }]))
        .mockResolvedValueOnce(rows([]));

      const res = await req(app, 'DELETE', '/b1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('returns 404 when deleting a missing budget', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'DELETE', '/nope');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /:id/status', () => {
    it('rejects an invalid status value', async () => {
      const res = await req(app, 'PUT', '/b1/status', { status: 'bogus' });

      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('updates status on an existing budget (check + update)', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'b1' }]))
        .mockResolvedValueOnce(rows([{ id: 'b1', status: 'active' }]));

      const res = await req(app, 'PUT', '/b1/status', { status: 'active' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'active' });
      expect(h.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /:id/line-items', () => {
    it('returns 404 when the parent budget is missing', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'GET', '/nope/line-items');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Budget not found' });
    });

    it('lists line items for an existing budget (check + list)', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'b1' }]))
        .mockResolvedValueOnce(rows([{ id: 'li1', category: 'Ads' }]));

      const res = await req(app, 'GET', '/b1/line-items');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 'li1', category: 'Ads' }]);
      expect(h.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('POST /:id/line-items', () => {
    it('creates a line item and returns 201 (check + insert)', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'b1' }]))
        .mockResolvedValueOnce(rows([{ id: 'li9', category: 'Ads', plannedAmount: '50' }]));

      const res = await req(app, 'POST', '/b1/line-items', { category: 'Ads', plannedAmount: 50 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'li9', category: 'Ads' });
      expect(h.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /:id/actuals', () => {
    it('returns 404 when the budget is missing', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'GET', '/nope/actuals');

      expect(res.status).toBe(404);
    });

    it('computes variance, querying actuals only for line items with an entityType', async () => {
      h.execute
        // budget lookup
        .mockResolvedValueOnce(rows([{ id: 'b1', fiscalYear: 2026, period: 'annual', quarter: null, month: null }]))
        // line items: one with entityType, one without
        .mockResolvedValueOnce(
          rows([
            { id: 'li1', category: 'Ads', plannedAmount: '100', entityType: 'expense' },
            { id: 'li2', category: 'Misc', plannedAmount: '50', entityType: null },
          ]),
        )
        // actuals for li1 only
        .mockResolvedValueOnce(rows([{ total: '40' }]));

      const res = await req(app, 'GET', '/b1/actuals');

      expect(res.status).toBe(200);
      // 1 budget + 1 line-items + 1 actuals (only the entityType item) = 3
      expect(h.execute).toHaveBeenCalledTimes(3);
      expect(res.body).toMatchObject({
        totals: { planned: 150, actual: 40, variance: 110 },
      });
    });
  });
});
