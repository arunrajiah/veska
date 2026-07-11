# Contributing to Veska

Thanks for considering a contribution. Here's everything you need to know.

## Before you start

- Check [GitHub Issues](https://github.com/arunrajiah/veska/issues) to see if your idea or bug is already tracked.
- For large changes (new modules, architectural changes), open a discussion first so we can align before you invest the time.
- Small fixes (typos, minor bugs, test coverage) — just open a PR.

## Development setup

```bash
git clone https://github.com/arunrajiah/veska.git
cd veska
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

## Code standards

- **TypeScript strict mode.** No `any` without a documented reason.
- **No comments explaining what the code does.** Only comment the *why* when it's non-obvious.
- **Tests required for `packages/core`.** Coverage must stay above 80%.
- **Conventional Commits.** Format: `type(scope): description`. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.
- **Never bypass the permission system or audit log.** All writes go through the same APIs as plugins.
- **Never let the AI take a money-moving action without explicit human confirmation.**

## Pull request process

1. Fork the repo and create a branch: `git checkout -b feat/my-feature`
2. Make your changes and add tests.
3. Run `pnpm typecheck && pnpm lint && pnpm test` and fix any failures.
4. Push and open a PR against `main`.
5. Fill in the PR template.

PRs are reviewed within 3 business days. We may ask for changes; we won't close without explanation.

## Contributing a plugin

Plugins are the highest-leverage way to help. They extend what Veska can do without
touching core, and a good one can go from idea to merged in an afternoon. If you want
Veska to sync with a tool you use (a CRM, a payment provider, an e-commerce platform, a
help desk), build a plugin for it.

A plugin is a small folder under `plugins/official/<name>/` with three files:

- `manifest.json` — id, version, the entities it touches, `capabilitiesRequired`, and a
  `networkWhitelist` of hosts it may call.
- `package.json` — depends on `@veska/sdk`; add a `test` script.
- `src/index.ts` — exported handler functions, each `(input, ctx: VeskaPluginContext)`.

Handlers never touch the database. All data access goes through the injected `ctx`
(`ctx.entities.find/create/update`, `ctx.audit.log`, and more), which enforces the same
permissions and audit logging as the rest of the platform.

To build one:

1. Scaffold with `npx @veska/cli create-plugin my-plugin`, or copy the closest official
   plugin as a template:
   - Inbound sync (an external webhook creates Veska records): [Stripe](plugins/official/stripe), [Shopify](plugins/official/shopify).
   - Outbound sync (a Veska event pushes to an external API): [QuickBooks](plugins/official/quickbooks), [Xero](plugins/official/xero).
2. Keep every external host you call listed in the manifest `networkWhitelist`.
3. Add unit tests. Mock `ctx` (and `fetch` for outbound plugins) and assert on the exact
   mutations and API calls your handlers make. The official plugins' `src/__tests__/` show
   the pattern.
4. Run `pnpm --filter @veska-official/plugin-<name> test` and open a PR.

For a brand-new integration, open a [discussion](https://github.com/arunrajiah/veska/discussions)
first so we can flag anything (auth model, rate limits) before you invest the time.

## Architecture Decision Records

Major decisions live in `docs/adr/`. If your PR introduces a significant technical choice, add an ADR alongside the code.

## Questions?

Open a [GitHub Discussion](https://github.com/arunrajiah/veska/discussions). We read everything.
