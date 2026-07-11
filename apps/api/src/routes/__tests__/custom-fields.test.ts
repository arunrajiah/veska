import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('../../shared.js', async () => {
  const { sharedModuleMock } = await import('./_harness.js');
  return sharedModuleMock(h.execute);
});

import { mountRouter, req, rows, sqlOf, TENANT_ID } from './_harness.js';
import { customFieldsRouter } from '../custom-fields.js';

// This router reads `db` from the tenant context, so wire the execute mock in.
const app = mountRouter(customFieldsRouter, { db: { execute: h.execute } });

beforeEach(() => {
  h.execute.mockReset();
});

describe('custom-fields router', () => {
  describe('GET /defs', () => {
    it('returns the defs and scopes the query to the tenant', async () => {
      h.execute.mockResolvedValueOnce(
        rows([{ id: 'd1', name: 'priority', entityType: 'ticket' }]),
      );

      const res = await req(app, 'GET', `/defs?tenantId=${TENANT_ID}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 'd1', name: 'priority', entityType: 'ticket' }]);
      expect(h.execute).toHaveBeenCalledTimes(1);
      // tenantId must be interpolated into the SQL
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });

    it('filters by entityType when provided', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'd1', entityType: 'contact' }]));

      const res = await req(app, 'GET', `/defs?tenantId=${TENANT_ID}&entityType=contact`);

      expect(res.status).toBe(200);
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain('contact');
    });

    it('returns 400 and hits no DB when tenantId is missing', async () => {
      const res = await req(app, 'GET', '/defs');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'tenantId is required' });
      expect(h.execute).not.toHaveBeenCalled();
    });
  });

  describe('POST /defs', () => {
    it('inserts a def and returns 201', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'd9', name: 'priority', label: 'Priority' }]));

      const res = await req(app, 'POST', '/defs', {
        tenantId: TENANT_ID,
        entityType: 'ticket',
        name: 'priority',
        label: 'Priority',
        type: 'select',
        options: ['low', 'high'],
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'd9', name: 'priority' });
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('returns 500 when the insert returns no row', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'POST', '/defs', {
        tenantId: TENANT_ID,
        entityType: 'ticket',
        name: 'priority',
        label: 'Priority',
        type: 'text',
      });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Insert failed' });
    });

    it('rejects a non-snake_case name with 400 and no DB call', async () => {
      const res = await req(app, 'POST', '/defs', {
        tenantId: TENANT_ID,
        entityType: 'ticket',
        name: 'Priority Level',
        label: 'Priority',
        type: 'text',
      });

      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });
  });

  describe('GET /defs/:id', () => {
    it('returns the def when it exists', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'd1', name: 'priority' }]));

      const res = await req(app, 'GET', '/defs/d1');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 'd1' });
    });

    it('returns 404 when the def does not exist', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'GET', '/defs/nope');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });
  });

  describe('PATCH /defs/:id', () => {
    it('updates provided fields and returns the row', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'd1', label: 'Updated' }]));

      const res = await req(app, 'PATCH', '/defs/d1', { label: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ label: 'Updated' });
      expect(h.execute).toHaveBeenCalledTimes(1);
    });

    it('returns 400 and hits no DB when the body has no updatable fields', async () => {
      const res = await req(app, 'PATCH', '/defs/d1', {});

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'No fields to update' });
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('returns 404 when updating a missing def', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'PATCH', '/defs/nope', { enabled: false });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /defs/:id', () => {
    it('deletes an existing def', async () => {
      h.execute.mockResolvedValueOnce(rows([{ id: 'd1' }]));

      const res = await req(app, 'DELETE', '/defs/d1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: true });
    });

    it('returns 404 when deleting a missing def', async () => {
      h.execute.mockResolvedValueOnce(rows([]));

      const res = await req(app, 'DELETE', '/defs/nope');

      expect(res.status).toBe(404);
    });
  });
});
