import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('../../shared.js', async () => {
  const { sharedModuleMock } = await import('./_harness.js');
  return sharedModuleMock(h.execute);
});

import { mountRouter, req, rows, TENANT_ID } from './_harness.js';
import { expensesRouter } from '../expenses.js';

// The expenses router builds its `where` with drizzle helpers (`and`/`eq`), whose
// column objects hold circular table references — so the harness `sqlOf` (a plain
// JSON.stringify) can't serialize them. Deep-search the expression tree for the
// interpolated tenantId instead, guarding against the cycles with a WeakSet.
function deepContains(obj: unknown, target: string, seen = new WeakSet()): boolean {
  if (obj === target) return true;
  if (obj && typeof obj === 'object') {
    if (seen.has(obj)) return false;
    seen.add(obj);
    for (const v of Object.values(obj as Record<string, unknown>)) {
      if (deepContains(v, target, seen)) return true;
    }
  }
  return false;
}

// Unlike the `vendors` router (which calls `sharedDb.execute(sql`…`)` directly),
// the expenses router drives the drizzle query builder on `tenantCtx.db`
// (`db.query.entityRecords.findMany` / `.findFirst`, `db.insert().values().returning()`,
// `db.update().set().where().returning()`). So we inject a mock `db` through the
// harness ctx override and drive the handlers through that. The `sharedDb` mock is
// still required so the module import doesn't hit a real DB and so the fire-and-forget
// `logAudit(sharedDb, …)` calls have something to run against.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = any;

function makeDb() {
  const findMany = vi.fn(async () => [] as unknown[]);
  const findFirst = vi.fn(async () => undefined as unknown);
  const insertReturning = vi.fn(async () => [] as unknown[]);
  const updateReturning = vi.fn(async () => [] as unknown[]);
  const where = vi.fn(() => {
    // Must be awaitable directly (bulk update) AND expose `.returning()`
    // (submit / patch update).
    const thenable = Promise.resolve(undefined) as AnyMock;
    thenable.returning = updateReturning;
    return thenable;
  });
  const set = vi.fn(() => ({ where }));
  const values = vi.fn(() => ({ returning: insertReturning }));
  const db: AnyMock = {
    query: { entityRecords: { findMany, findFirst } },
    insert: vi.fn(() => ({ values })),
    update: vi.fn(() => ({ set })),
  };
  db._ = { findMany, findFirst, insertReturning, updateReturning, where, values, set };
  return db;
}

let db: ReturnType<typeof makeDb>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;

beforeEach(() => {
  h.execute.mockReset();
  h.execute.mockResolvedValue(rows([])); // benign default for fire-and-forget logAudit
  db = makeDb();
  app = mountRouter(expensesRouter, { db });
});

describe('expenses router', () => {
  describe('GET /summary', () => {
    it('aggregates totals, pending count and per-category breakdown', async () => {
      db._.findMany.mockResolvedValueOnce([
        { data: { status: 'submitted', amount: 100, category: 'travel' } },
        { data: { status: 'submitted', amount: 50, category: 'meals' } },
        { data: { status: 'approved', amount: 200, category: 'travel' } },
        { data: { status: 'paid', amount: 25, category: 'office' } },
      ]);

      const res = await req(app, 'GET', '/summary');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        totalSubmitted: 150,
        totalApproved: 200,
        totalPaid: 25,
        pendingCount: 2,
      });
      const byCategory = (res.body as { byCategory: unknown[] }).byCategory;
      expect(byCategory).toContainEqual({ category: 'travel', count: 2, total: 300 });
    });

    it('returns zeroed defaults when there are no expenses', async () => {
      db._.findMany.mockResolvedValueOnce([]);

      const res = await req(app, 'GET', '/summary');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        totalSubmitted: 0,
        totalApproved: 0,
        totalPaid: 0,
        byCategory: [],
        pendingCount: 0,
      });
    });
  });

  describe('GET /', () => {
    it('scopes the query to the tenant and returns the records', async () => {
      db._.findMany.mockResolvedValueOnce([{ id: 'e1', data: { amount: 10 } }]);

      const res = await req(app, 'GET', '/');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 'e1', data: { amount: 10 } }]);
      // tenantId must be interpolated into the drizzle where clause
      expect(deepContains(db._.findMany.mock.calls[0][0].where, TENANT_ID)).toBe(true);
    });
  });

  describe('GET /:id', () => {
    it('returns 404 when the expense does not exist', async () => {
      db._.findFirst.mockResolvedValueOnce(undefined);

      const res = await req(app, 'GET', '/does-not-exist');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });

    it('returns the record when found', async () => {
      db._.findFirst.mockResolvedValueOnce({ id: 'e1', data: { amount: 42 } });

      const res = await req(app, 'GET', '/e1');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 'e1', data: { amount: 42 } });
    });
  });

  describe('POST /', () => {
    it('rejects a body missing required fields without touching the DB', async () => {
      const res = await req(app, 'POST', '/', { amount: 100 }); // missing date + description

      expect(res.status).toBe(400);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('creates a draft expense and returns 201', async () => {
      db._.insertReturning.mockResolvedValueOnce([
        { id: 'e9', data: { amount: 100, status: 'draft' } },
      ]);

      const res = await req(app, 'POST', '/', {
        amount: 100,
        date: '2026-01-01',
        description: 'Team lunch',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'e9' });
      expect(db.insert).toHaveBeenCalledTimes(1);
    });

    it('returns 500 when the insert returns no row', async () => {
      db._.insertReturning.mockResolvedValueOnce([]);

      const res = await req(app, 'POST', '/', {
        amount: 100,
        date: '2026-01-01',
        description: 'Team lunch',
      });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to create expense' });
    });
  });

  describe('POST /bulk', () => {
    it('rejects an empty ids array without touching the DB', async () => {
      const res = await req(app, 'POST', '/bulk', { ids: [], action: 'approve' });

      expect(res.status).toBe(400);
      expect(db._.findFirst).not.toHaveBeenCalled();
    });

    it('processes found expenses and reports missing ones', async () => {
      db._.findFirst
        .mockResolvedValueOnce({ id: 'e1', data: { status: 'submitted', amount: 10 } })
        .mockResolvedValueOnce(undefined); // second id not found

      const res = await req(app, 'POST', '/bulk', {
        ids: ['e1', 'missing'],
        action: 'approve',
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        processed: 1,
        failed: [{ id: 'missing', error: 'Expense not found' }],
      });
      expect(db.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /:id/submit', () => {
    it('returns 404 when the expense does not exist', async () => {
      db._.findFirst.mockResolvedValueOnce(undefined);

      const res = await req(app, 'PATCH', '/nope/submit');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Expense not found' });
    });

    it('marks the expense submitted and returns the updated row', async () => {
      db._.findFirst.mockResolvedValueOnce({
        id: 'e1',
        data: { status: 'draft', amount: 100, description: 'Hotel' },
      });
      db._.updateReturning.mockResolvedValueOnce([
        { id: 'e1', data: { status: 'submitted', amount: 100, description: 'Hotel' } },
      ]);

      const res = await req(app, 'PATCH', '/e1/submit');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ data: { status: 'submitted' } });
    });
  });

  describe('PATCH /:id', () => {
    it('returns 404 when updating a missing expense', async () => {
      db._.findFirst.mockResolvedValueOnce(undefined);

      const res = await req(app, 'PATCH', '/nope', { status: 'approved' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Expense not found' });
    });

    it('applies a status transition and returns the updated row', async () => {
      db._.findFirst.mockResolvedValueOnce({
        id: 'e1',
        data: { status: 'submitted', amount: 100, description: 'Hotel' },
      });
      db._.updateReturning.mockResolvedValueOnce([
        { id: 'e1', data: { status: 'approved', amount: 100, notes: 'ok' } },
      ]);

      const res = await req(app, 'PATCH', '/e1', { status: 'approved', notes: 'ok' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ data: { status: 'approved', notes: 'ok' } });
      expect(db.update).toHaveBeenCalledTimes(1);
    });
  });
});
