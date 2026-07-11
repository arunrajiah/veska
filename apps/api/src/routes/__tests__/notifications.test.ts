import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('../../shared.js', async () => {
  const { sharedModuleMock } = await import('./_harness.js');
  return sharedModuleMock(h.execute);
});

import { mountRouter, req, sqlOf, TENANT_ID } from './_harness.js';
import { notificationsRouter } from '../notifications.js';

// The notifications router uses the postgres-js driver, whose `execute()`
// resolves to a plain rows array (the router indexes `result[0]` directly),
// so mocks return arrays rather than the `{ rows }` wrapper.
const app = mountRouter(notificationsRouter);

beforeEach(() => {
  h.execute.mockReset();
});

describe('notifications router', () => {
  describe('GET /unread-count', () => {
    it('returns 400 when userId query param is missing', async () => {
      const res = await req(app, 'GET', '/unread-count');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'userId query param required' });
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('returns the unread count scoped to the tenant', async () => {
      h.execute.mockResolvedValueOnce([{ cnt: '5' }]);

      const res = await req(app, 'GET', '/unread-count?userId=u1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 5 });
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });
  });

  describe('POST /read-all', () => {
    it('returns 400 when userId query param is missing', async () => {
      const res = await req(app, 'POST', '/read-all');
      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('marks all notifications read for the user', async () => {
      h.execute.mockResolvedValueOnce([]);

      const res = await req(app, 'POST', '/read-all?userId=u1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(h.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /', () => {
    it('returns 400 when userId query param is missing', async () => {
      const res = await req(app, 'GET', '/');
      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('returns the notifications list for the user', async () => {
      h.execute.mockResolvedValueOnce([{ id: 'n1', title: 'Hello' }]);

      const res = await req(app, 'GET', '/?userId=u1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 'n1', title: 'Hello' }]);
    });
  });

  describe('POST /', () => {
    it('rejects a body missing the required title', async () => {
      const res = await req(app, 'POST', '/', { userId: 'u1' });
      expect(res.status).toBe(400);
      expect(h.execute).not.toHaveBeenCalled();
    });

    it('creates a notification and returns 201', async () => {
      h.execute.mockResolvedValueOnce([{ id: 'n9', title: 'Ping', userId: 'u1' }]);

      const res = await req(app, 'POST', '/', { userId: 'u1', title: 'Ping' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'n9', title: 'Ping' });
      expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
    });
  });

  describe('POST /:id/read', () => {
    it('returns 404 when the notification does not exist', async () => {
      h.execute.mockResolvedValueOnce([]);
      const res = await req(app, 'POST', '/does-not-exist/read');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Notification not found' });
    });

    it('marks a single notification as read', async () => {
      h.execute.mockResolvedValueOnce([{ id: 'n1', isRead: true }]);
      const res = await req(app, 'POST', '/n1/read');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 'n1', isRead: true });
    });
  });

  describe('DELETE /:id', () => {
    it('returns 404 when the notification does not exist', async () => {
      h.execute.mockResolvedValueOnce([]);
      const res = await req(app, 'DELETE', '/nope');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Notification not found' });
    });

    it('deletes an existing notification', async () => {
      h.execute.mockResolvedValueOnce([{ id: 'n1' }]);
      const res = await req(app, 'DELETE', '/n1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: true });
    });
  });
});
