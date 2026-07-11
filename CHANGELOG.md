# Changelog

All notable changes to Veska are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- **Critical: raw-SQL routes returned malformed results and could throw at runtime.** The
  `postgres-js` driver resolves `db.execute(sql`...`)` to an Array with no `.rows`
  property, but roughly forty route files read `result.rows`, which was `undefined` (so
  `result.rows[0]` threw). `createDatabase` now attaches non-enumerable `.rows` /
  `.rowCount` aliases to execute results, so both `result[0]` and `result.rows[0]` work.

### Added

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

- Action agent built on the Anthropic SDK with 57 ERP tools (create invoices, approve expenses, forecast revenue, …)
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
