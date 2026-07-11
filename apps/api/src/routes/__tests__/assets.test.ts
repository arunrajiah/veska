import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('../../shared.js', async () => {
  const { sharedModuleMock } = await import('./_harness.js');
  return sharedModuleMock(h.execute);
});

import { mountRouter, req, rows, sqlOf, TENANT_ID } from './_harness.js';
import { assetsRouter } from '../assets.js';

// This router reads `db` off the tenant context (not the shared singleton), so
// inject the same execute mock there.
const app = mountRouter(assetsRouter, { db: { execute: h.execute } });

beforeEach(() => {
  h.execute.mockReset();
});

describe('assets router', () => {
  describe('GET /summary', () => {
    it('aggregates counts/value by status and category and scopes to tenant', async () => {
      h.execute
        // grouped aggregate query
        .mockResolvedValueOnce(
          rows([
            { totalAssets: '2', totalPurchaseValue: '3000', status: 'active', category: 'equipment' },
            { totalAssets: '1', totalPurchaseValue: '500', status: 'retired', category: 'software' },
          ]),
        )
        // per-asset depreciation query (method none → book value = purchase price)
        .mockResolvedValueOnce(
          rows([
            {
              id: 'a1',
              purchasePrice: '3000',
              salvageValue: '0',
              usefulLifeYears: '5',
              depreciationMethod: 'none',
              purchaseDate: null,
            },
          ]),
        );

      const res = await req(app, 'GET', '/summary');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        totalAssets: 3,
        totalPurchaseValue: 3500,
        totalCurrentBookValue: 3000,
        byCategory: { equipment: 2, software: 1 },
        byStatus: { active: 2, retired: 1 },
      });
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
      expect(h.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /', () => {
    it('returns all tenant assets when no filters are given', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'a1', name: 'Laptop' }]));

      const res = await req(app, 'GET', '/');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ assets: [{ id: 'a1', name: 'Laptop' }] });
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('applies status and category filters in a single query', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'a2' }]));

      const res = await req(app, 'GET', '/?status=active&category=vehicle');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ assets: [{ id: 'a2' }] });
      const sql = sqlOf(h.execute.mock.calls[0][0]);
      expect(sql).toContain('active');
      expect(sql).toContain('vehicle');
      expect(h.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /', () => {
    it('rejects a body missing the required name', async () => {
      const res = await req(app, 'POST', '/', { category: 'equipment' });
      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('rejects an invalid category enum value', async () => {
      const res = await req(app, 'POST', '/', { name: 'X', category: 'spaceship' });
      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('inserts a new asset and returns 201 with the created row', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'a9', name: 'Forklift' }]));

      const res = await req(app, 'POST', '/', { name: 'Forklift', category: 'vehicle' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 'a9', name: 'Forklift' });
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('returns 500 when the insert returns no row', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'POST', '/', { name: 'Forklift' });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to create asset' });
    });
  });

  describe('GET /:id/depreciation', () => {
    it('returns a straight-line depreciation schedule', async () => {
      h.execute.mockResolvedValueOnce(
        rows([
          {
            id: 'a1',
            depreciationMethod: 'straight-line',
            purchasePrice: '1000',
            salvageValue: '0',
            usefulLifeYears: '5',
            purchaseDate: null,
          },
        ]),
      );

      const res = await req(app, 'GET', '/a1/depreciation');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        assetId: 'a1',
        method: 'straight-line',
        annualDepreciation: 200,
      });
      expect((res.body as { schedule: unknown[] }).schedule).toHaveLength(5);
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when the asset does not exist', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'GET', '/missing/depreciation');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });
  });

  describe('GET /:id', () => {
    it('returns the asset scoped to the tenant', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'a1', name: 'Laptop' }]));

      const res = await req(app, 'GET', '/a1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'a1', name: 'Laptop' });
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });

    it('returns 404 when the asset is not found', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'GET', '/nope');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });
  });

  describe('PUT /:id', () => {
    it('returns 404 when updating a missing asset', async () => {
      h.execute.mockResolvedValueOnce(rows([])); // existence check
      const res = await req(app, 'PUT', '/nope', { name: 'X' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('updates an existing asset and returns the new row', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'a1', name: 'Old', category: 'equipment' }])) // existence
        .mockResolvedValueOnce(rows([{ id: 'a1', name: 'New' }])); // update returning

      const res = await req(app, 'PUT', '/a1', { name: 'New' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'a1', name: 'New' });
      expect(h.execute).toHaveBeenCalledTimes(2);
    });

    it('rejects an invalid status enum on update', async () => {
      const res = await req(app, 'PUT', '/a1', { status: 'exploded' });
      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /:id', () => {
    it('soft-deletes an existing asset', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'a1' }]));

      const res = await req(app, 'DELETE', '/a1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: true, id: 'a1', status: 'disposed' });
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });

    it('returns 404 when the asset does not exist', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'DELETE', '/missing');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });
  });
});
