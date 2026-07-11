// Test harness for API route unit tests.
//
// Routes import the `sharedDb` singleton from `../shared.js`, which eagerly
// connects to Postgres/Redis at import time. To unit-test a router in isolation
// we replace that module with an in-memory mock and drive the router with a fake
// tenant context, then exercise it via Hono's `app.request()`.
//
// Usage in a test file (`apps/api/src/routes/__tests__/<name>.test.ts`):
//
//   import { vi } from 'vitest';
//   const h = vi.hoisted(() => ({ execute: vi.fn() }));
//   vi.mock('../../shared.js', async () => {
//     const { sharedModuleMock } = await import('./_harness.js');
//     return sharedModuleMock(h.execute);
//   });
//   import { mountRouter, req, rows } from './_harness.js';
//   import { vendorsRouter } from '../vendors.js';
//
//   const app = mountRouter(vendorsRouter);
//   h.execute.mockResolvedValueOnce(rows([{ id: '...' }]));
//   const res = await req(app, 'GET', '/');

import { Hono } from 'hono';

export const TENANT_ID = '00000000-0000-0000-0000-000000000001';
export const IDENTITY_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Build the mocked `../shared.js` module. The single `execute` mock stands in
 * for `sharedDb.execute(sql`...`)`; every other export is a harmless stub so
 * routers that reference them at import time don't blow up.
 */
export function sharedModuleMock(execute: (...args: unknown[]) => unknown) {
  const noop = () => undefined;
  return {
    sharedDb: {
      execute,
      // Some routers/middleware touch `db.query.<table>.findFirst`; return a
      // proxy that yields a stub for any table name so import never throws.
      query: new Proxy(
        {},
        { get: () => ({ findFirst: async () => undefined, findMany: async () => [] }) },
      ),
      transaction: async (fn: (tx: unknown) => unknown) => fn({ execute }),
    },
    sharedRedis: { get: noop, set: noop, del: noop, incr: noop, expire: noop, on: noop },
    sharedLlm: {},
    sharedMagicLinkService: {},
    sharedAuditService: { log: async () => undefined, record: async () => undefined },
    sharedQueueService: { enqueue: async () => undefined, add: async () => undefined },
  };
}

/**
 * Shape a result set the way `sharedDb.execute(sql`...`)` actually returns it:
 * the postgres-js driver yields an Array, and `createDatabase` additionally
 * exposes non-enumerable `.rows`/`.rowCount` aliases. Mirroring that here means
 * a route is tested faithfully whether it reads `result[0]` or `result.rows[0]`.
 */
export function rows<T = Record<string, unknown>>(r: T[]) {
  const arr = [...r] as T[] & { rows: T[]; rowCount: number };
  Object.defineProperty(arr, 'rows', { value: arr, enumerable: false });
  Object.defineProperty(arr, 'rowCount', { value: arr.length, enumerable: false });
  return arr;
}

type TenantCtxOverride = Partial<{
  tenantId: string;
  identityId: string;
  db: unknown;
  configAgent: unknown;
}>;

/**
 * Mount a router under a fresh Hono app with a fake tenant context set on every
 * request (bypassing the real session/tenant middleware, which needs a live DB).
 */
export function mountRouter(router: Hono<never>, ctx: TenantCtxOverride = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).set('tenantCtx', {
      tenantId: TENANT_ID,
      identityId: IDENTITY_ID,
      db: undefined,
      configAgent: undefined,
      ...ctx,
    });
    await next();
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.route('/', router as any);
  return app;
}

export interface TestResponse {
  status: number;
  body: unknown;
  text: string;
}

/** Issue a request against a mounted app and parse the JSON response. */
export async function req(
  app: Hono,
  method: string,
  path: string,
  body?: unknown,
): Promise<TestResponse> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'content-type': 'application/json' };
  }
  const res = await app.request(path, init);
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = undefined;
  }
  return { status: res.status, body: parsed, text };
}

/**
 * Serialize a captured `sql` template object's chunks to a string so tests can
 * assert that an interpolated value (e.g. the tenantId) reached the query.
 */
export function sqlOf(call: unknown): string {
  const arg = (call as { queryChunks?: unknown }).queryChunks ?? call;
  return JSON.stringify(arg);
}
