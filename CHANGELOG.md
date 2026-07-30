# Changelog

All notable changes to Veska are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed — the app now actually runs end to end

Veska did not boot from a clean clone. The database could not be created, and the
documented demo login returned HTTP 500. The following fixes were needed to get from
`git clone` to a working, logged-in app.

- **`pnpm db:migrate` did nothing.** The migration folder had 32 `.sql` files but no
  `meta/_journal.json`, which drizzle's migrator requires, so a fresh clone could never
  create its schema. Added the journal; all migrations now apply.
- **The schema used two conflicting naming conventions.** 12 tables were snake_case
  (`entity_records`) while 61 were camelCase (`"vendors"."tenantId"`), and raw SQL in the
  routes referenced the camelCase spelling of tables that had been created snake_case. In
  Postgres those are different identifiers, so 15 route files (reports, search, budgets,
  hr, product-catalog, ai, …) failed with `relation "entityRecords" does not exist`.
  Everything is now camelCase, matching the API response contract the admin UI consumes.
- **Two migrations aborted partway.** `0013` referenced a table that did not exist, and
  `0024` did `CREATE TABLE IF NOT EXISTS notifications` against a table 0004 had already
  created with a different shape, so the create silently no-opped and the next statement
  failed.
- **The audit trail was split across two tables.** `audit_log` (written by the core
  AuditService) and `auditLog` (read by the `/audit` route) both existed, so the audit UI
  never showed what the service recorded. Merged into one canonical `"auditLog"`.
- **Login was impossible.** `/auth/login` queried `users."passwordHash"` and
  `users."isActive"`, which no migration ever created; the seed wrote credentials only to
  `identities`, and hashed them with sha256 while login verified with bcrypt. Added the
  columns, switched the seed to bcrypt, and had it create the matching `users` and
  `userRoles` rows (without a `userRoles` row, RBAC denied every request with a 403).
- **`(${x} IS NULL OR col = ${x})` filters crashed on null.** Postgres could not infer the
  parameter type, so listing budgets, contracts, vendors, service-desk tickets, and payroll
  runs returned 500. Added explicit casts (15 sites).
- **A custom `DATABASE_URL` in `.env` was ignored.** turbo did not forward it and
  `drizzle.config.ts` never loaded `.env`, so migrations silently used the default URL.

Verified against a live Postgres: `db:migrate` → `seed` → login returns 200 with a session
token (wrong password correctly 401s), and 19 core API routes return 200 with real data and
zero 500s.

### Fixed

- **Critical: raw-SQL routes returned malformed results and could throw at runtime.** The
  `postgres-js` driver resolves `db.execute(sql`...`)` to an Array with no `.rows`
  property, but roughly forty route files read `result.rows`, which was `undefined` (so
  `result.rows[0]` threw). `createDatabase` now attaches non-enumerable `.rows` /
  `.rowCount` aliases to execute results, so both `result[0]` and `result.rows[0]` work.

### Added

- **Official Xero plugin** (`plugins/official/xero`). Posts paid Veska invoices to Xero as
  ACCREC invoices (resolving the linked contact name and mapping line items) and syncs new
  Veska contacts to Xero contacts. Covered by 6 unit tests.
- **Official Shopify plugin** (`plugins/official/shopify`). Syncs Shopify `customers/create`
  into Veska Contacts (deduped by email), `orders/create` into Invoices with mapped line
  items, and `orders/paid` reconciles the matching invoice to paid (or creates it). Covered
  by 9 unit tests.
- Unit-test harness for the API route layer (`apps/api/src/routes/__tests__/_harness.ts`)
  that mocks the `shared.js` singleton and drives Hono routers via `app.request()`, plus
  135 route tests across vendors, currencies, tax-rates, expenses, budgets, contracts,
  assets, custom-fields, and notifications. See [docs/testing.md](docs/testing.md).

## [0.1.0] — first public release

The first tagged release of Veska: a self-hosted, AI-native operations platform for small and medium businesses.

### Platform

- Multi-tenant core with tenant isolation enforced at the database layer
- Capability-based RBAC with six system roles, per-user grants and deny lists
- Authentication: password + TOTP 2FA, magic links, session tokens, password reset
- Append-only audit log on every state change, including AI reasoning traces
- Workflow engine: entity-event triggers, multi-step runs, approval gates routed to chat
- Background jobs via BullMQ + Redis

### Modules

- **CRM** — leads, contacts, accounts, deals with pipeline stages and activity log
- **Support desk** — ticket lifecycle, conversation threading, SLAs, knowledge base
- **Finance** — invoices with line items and tax, double-entry ledger, expenses with approvals, budgets, recurring billing
- **HR** — employee records, leave, attendance, payroll runs with journal posting

### AI

- Action agent built on the Anthropic SDK with 30 ERP tools (create invoices, approve expenses, forecast revenue, …)
- Pluggable LLM provider: Anthropic Claude, or fully local via Ollama / any OpenAI-compatible endpoint
- Per-tenant AI usage and token tracking
- AI onboarding: describe your company in plain language to configure modules

### Channels & integrations

- Slack adapter (@slack/bolt) with signature verification and per-tenant apps
- Email: inbound webhook parsing, outbound SMTP with delivery logging
- WhatsApp and Telegram webhook scaffolding (hardening in progress — see ROADMAP.md)
- Plugin SDK (`@veska/sdk`) + official Stripe, QuickBooks, and Google Calendar plugins
- Per-tenant API keys, outbound webhooks with HMAC signing and retries

### Deployment

- Single-command Docker Compose stack (Postgres 16 + pgvector, Redis 7, API, Admin UI)
- Production compose file and self-hosting guide (SELF_HOSTING.md)
- Demo seed data (`pnpm seed`) — a full demo company to explore in minutes
