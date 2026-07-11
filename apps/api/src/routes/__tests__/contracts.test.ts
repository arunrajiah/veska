import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('../../shared.js', async () => {
  const { sharedModuleMock } = await import('./_harness.js');
  return sharedModuleMock(h.execute);
});

import { mountRouter, req, rows, sqlOf, TENANT_ID } from './_harness.js';
import { contractsRouter } from '../contracts.js';

const app = mountRouter(contractsRouter);

beforeEach(() => {
  h.execute.mockReset();
});

describe('contracts router', () => {
  describe('GET /', () => {
    it('scopes the query to the tenant and returns the rows', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'c1', title: 'MSA' }]));

      const res = await req(app, 'GET', '/');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 'c1', title: 'MSA' }]);
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });
  });

  describe('GET /expiring-soon', () => {
    it('returns the expiring rows', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'c1', daysRemaining: 5 }]));

      const res = await req(app, 'GET', '/expiring-soon');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 'c1', daysRemaining: 5 }]);
    });
  });

  describe('GET /summary', () => {
    it('aggregates status, value, and expiring counts', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ status: 'active', count: '2' }, { status: 'draft', count: '1' }]))
        .mockResolvedValueOnce(rows([{ type: 'service', totalValue: '5000', count: '3' }]))
        .mockResolvedValueOnce(rows([{ count: '4' }]));

      const res = await req(app, 'GET', '/summary');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        byStatus: { active: 2, draft: 1 },
        byType: [{ type: 'service', totalValue: 5000, count: 3 }],
        expiringInNext30Days: 4,
      });
    });
  });

  describe('GET /:id', () => {
    it('returns the contract with its events', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'c1', title: 'MSA' }]))
        .mockResolvedValueOnce(rows([{ id: 'e1', eventType: 'created' }]));

      const res = await req(app, 'GET', '/c1');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 'c1',
        title: 'MSA',
        events: [{ id: 'e1', eventType: 'created' }],
      });
    });

    it('returns 404 when the contract does not exist', async () => {
      h.execute
        .mockResolvedValueOnce(rows([]))
        .mockResolvedValueOnce(rows([]));

      const res = await req(app, 'GET', '/nope');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });
  });

  describe('POST /', () => {
    it('rejects a body missing the required title', async () => {
      const res = await req(app, 'POST', '/', { partyA: 'A', partyB: 'B' });
      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('creates a contract and returns 201', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'c9', title: 'New Deal' }])) // insert
        .mockResolvedValueOnce(rows([])); // addContractEvent

      const res = await req(app, 'POST', '/', {
        title: 'New Deal',
        partyA: 'Acme',
        partyB: 'Globex',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'c9', title: 'New Deal' });
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });

    it('returns 500 when the insert returns no row', async () => {
      h.execute.mockResolvedValueOnce(rows([])); // insert returned nothing

      const res = await req(app, 'POST', '/', {
        title: 'New Deal',
        partyA: 'Acme',
        partyB: 'Globex',
      });

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /:id', () => {
    it('returns 404 when updating a missing contract', async () => {
      h.execute.mockResolvedValueOnce(rows([])); // existence check
      const res = await req(app, 'PUT', '/nope', { title: 'X' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });

    it('updates an existing contract', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'c1' }])) // existence check
        .mockResolvedValueOnce(rows([{ id: 'c1', title: 'Updated' }])); // update
      const res = await req(app, 'PUT', '/c1', { title: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 'c1', title: 'Updated' });
    });
  });

  describe('DELETE /:id', () => {
    it('deletes a draft contract', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'c1', status: 'draft' }])) // check
        .mockResolvedValueOnce(rows([])); // delete
      const res = await req(app, 'DELETE', '/c1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it('refuses to delete a non-draft contract', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'c1', status: 'active' }])); // check only
      const res = await req(app, 'DELETE', '/c1');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Only draft contracts can be deleted' });
    });
  });

  describe('PUT /:id/status', () => {
    it('rejects an invalid status transition', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'c1', status: 'draft' }])); // check only
      const res = await req(app, 'PUT', '/c1/status', { status: 'active' });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: expect.stringContaining('Cannot transition') });
    });

    it('applies a valid status transition and records an event', async () => {
      h.execute
        .mockResolvedValueOnce(rows([{ id: 'c1', status: 'draft' }])) // check
        .mockResolvedValueOnce(rows([{ id: 'c1', status: 'review' }])) // update
        .mockResolvedValueOnce(rows([])); // addContractEvent
      const res = await req(app, 'PUT', '/c1/status', { status: 'review' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 'c1', status: 'review' });
    });
  });

  describe('POST /:id/sign', () => {
    it('validates the party enum', async () => {
      const res = await req(app, 'POST', '/c1/sign', { signatureName: 'Jane', party: 'c' });
      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('returns 404 when signing a missing contract', async () => {
      h.execute.mockResolvedValueOnce(rows([])); // check
      const res = await req(app, 'POST', '/nope/sign', { signatureName: 'Jane', party: 'a' });
      expect(res.status).toBe(404);
    });
  });
});
