# Testing

Veska is tested at three levels:

| Level | Where | What it covers |
| --- | --- | --- |
| Unit (services) | `packages/core/src/**/__tests__/*.test.ts` | Business logic in services, with the DB injected as a mock. |
| Unit (API routes) | `apps/api/src/routes/__tests__/*.test.ts` | HTTP route handlers, run against a mocked `shared.js` singleton. |
| End-to-end | `apps/admin/e2e/*.spec.ts` (Playwright) | Full user flows through the browser against a live stack. |

Run everything with `pnpm test` (Vitest, per package via Turbo) and `pnpm test:e2e` (Playwright).

## Unit-testing API routes

Routes import the `sharedDb` singleton from `apps/api/src/shared.js`, which eagerly
connects to Postgres and Redis at import time. So a route cannot be imported in a unit
test without first replacing that module. The harness at
`apps/api/src/routes/__tests__/_harness.ts` does this and lets you drive a router with
Hono's `app.request()`.

### The pattern

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// 1. Create the DB mock in a hoisted block so vi.mock can see it.
const h = vi.hoisted(() => ({ execute: vi.fn() }));

// 2. Replace the shared singleton with in-memory stubs.
vi.mock('../../shared.js', async () => {
  const { sharedModuleMock } = await import('./_harness.js');
  return sharedModuleMock(h.execute);
});

import { mountRouter, req, rows, sqlOf, TENANT_ID } from './_harness.js';
import { vendorsRouter } from '../vendors.js';

const app = mountRouter(vendorsRouter);
beforeEach(() => h.execute.mockReset());

it('lists vendors scoped to the tenant', async () => {
  h.execute.mockResolvedValueOnce(rows([{ id: 'v1', name: 'Acme' }]));
  const res = await req(app, 'GET', '/');
  expect(res.status).toBe(200);
  expect(res.body).toEqual([{ id: 'v1', name: 'Acme' }]);
  expect(sqlOf(h.execute.mock.calls[0][0])).toContain(TENANT_ID);
});
```

### Harness API

- `mountRouter(router, ctxOverride?)` — mounts the router under a fresh Hono app with a
  fake tenant context (`tenantId`, `identityId`) set on every request, bypassing the real
  session/tenant middleware. Some routes read the DB off the context (`tenantCtx.db`)
  rather than the singleton; for those, pass `mountRouter(router, { db: { execute: h.execute } })`.
- `req(app, method, path, body?)` — issues a request and returns `{ status, body, text }`.
- `rows(array)` — shapes a result set exactly as the postgres-js driver returns it: an
  Array with non-enumerable `.rows` / `.rowCount` aliases (see the driver note below).
  Feed one `h.execute.mockResolvedValueOnce(rows([...]))` per query the handler runs, in
  call order.
- `sqlOf(call)` — serializes a captured `sql` template so you can assert an interpolated
  value (like the tenant id) reached the query.

### The most common mistake

Match the number of `mockResolvedValueOnce` calls to the exact number of
`db.execute(...)` calls the handler makes, in order. A create handler that first counts
rows then inserts runs two queries, so it needs two mocked results.

## Driver note: `db.execute()` returns an Array

Veska uses the `drizzle-orm/postgres-js` driver. For a raw `db.execute(sql`...`)` it
resolves to a postgres.js `Result`, which is an **Array** with no `.rows` property, unlike
node-postgres. To let route code use either access style, `createDatabase` in
`packages/core/src/db/client.ts` attaches non-enumerable `.rows` (a self-reference) and
`.rowCount` aliases to the result. So both `result[0]` and `result.rows[0]` work. The test
harness's `rows()` helper reproduces this shape so tests exercise routes faithfully.

## What is excluded from unit coverage

Code that requires a live Postgres, Redis, or LLM is excluded from unit coverage (see the
`exclude` list in `packages/core/vitest.config.ts`) and is covered by the E2E suite
instead: the DB layer, AI agents, channel adapters, the queue, the workflow engine, and
third-party integrations.
