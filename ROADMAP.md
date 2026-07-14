# Roadmap

Veska is early (v0.x) and built in the open. This roadmap is directional, not a promise — and it's shaped by what users and contributors ask for. Open a [discussion](https://github.com/arunrajiah/veska/discussions) to influence it.

## Now — hardening for first users (v0.1 → v0.2)

- [ ] Cut and publish the first tagged release (v0.1.0)
- [ ] Battle-test the WhatsApp adapter end-to-end against the WhatsApp Business API
- [ ] Battle-test the Telegram adapter end-to-end
- [~] Unit test coverage for API routes (harness landed + first 9 modules; ~70 to go)
- [ ] Green up the Playwright E2E suite (30 of 78 UI specs currently fail)
- [ ] Load testing and published performance numbers
- [ ] Publish `@veska/sdk` and `@veska/cli` to npm

## Next — making it easy to try (v0.3)

- [ ] Public read-only hosted demo instance (reset hourly)
- [ ] One-click deploy templates: Railway, Fly.io, DigitalOcean
- [ ] Official Helm chart for Kubernetes
- [ ] Onboarding improvements: AI setup flow works fully offline with Ollama
- [x] More official plugins (Shopify + Xero shipped)

## Later — growing up (v1.0 and beyond)

- [ ] SSO (SAML/OIDC) for larger teams
- [ ] Data residency and compliance documentation
- [ ] Plugin marketplace with community submissions
- [ ] Managed cloud edition (Veska Cloud)
- [ ] Internationalization of the admin UI

## Done

- [x] Core platform: entities, workflows, RBAC, multi-tenancy, audit log
- [x] CRM, support desk, finance (double-entry ledger), HR modules
- [x] AI action agent with 57 ERP tools (Anthropic Claude or local Ollama)
- [x] Slack and Email channel adapters
- [x] Plugin SDK + Stripe, QuickBooks, Google Calendar plugins
- [x] Docker Compose self-hosting, CI, 222 unit tests (core + API routes + plugins)
