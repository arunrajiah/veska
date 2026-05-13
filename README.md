# Veska

**AI-native operations platform for small and medium businesses.**

Describe your company in plain language. Veska sets up CRM, support desk, and finance in minutes. Your team works through Slack, WhatsApp, and Email — no accounts, no logins, no training.

[![CI](https://github.com/veska-dev/veska/actions/workflows/ci.yml/badge.svg)](https://github.com/veska-dev/veska/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## What is Veska?

Veska is an open-source, AI-first ERP for small businesses. A founder describes their company and Veska configures the complete back office — CRM, support, finance, inventory, HR — in under 20 minutes.

Once configured, almost nobody logs in. Employees, customers, and vendors interact with Veska through **Slack, WhatsApp, Email, and Telegram**. The AI does the work; humans just talk.

## Why?

Existing SMB ERPs (Zoho, Odoo, ERPNext) require multi-week setup and force every user to learn a UI designed in 2005. Best-of-breed alternatives (HubSpot, QuickBooks, Gusto) are great individually but you end up stitching 10+ tools with no shared system of record.

Veska is built AI-first from the data model up.

## Architecture

```
apps/
  api/          Hono API server (Node.js 22)
  admin/        Admin UI (Next.js 15)
  marketing/    Marketing site (Next.js 15)
  marketplace/  Plugin marketplace (Next.js 15)

packages/
  core/         Primitive layer: entities, workflows, permissions, channels, ledger
  sdk/          Plugin SDK (@veska/sdk)
  ui/           Shared UI components (shadcn/ui)
  cli/          Developer CLI (veska create-plugin, veska dev)

plugins/
  official/     Official first-party plugins
```

**Stack:** TypeScript · Hono · PostgreSQL 16 + pgvector · Drizzle ORM · BullMQ · Redis · Next.js 15 · Anthropic Claude

## Quick start (local dev)

```bash
# Prerequisites: Node.js 22+, pnpm 9+, Docker

git clone https://github.com/veska-dev/veska.git
cd veska

cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

pnpm install
docker compose up -d          # starts Postgres + Redis
pnpm db:migrate               # run migrations
pnpm dev                      # starts all apps in watch mode
```

- **API:** http://localhost:3001
- **Admin UI:** http://localhost:3000
- **Marketing:** http://localhost:3002
- **Marketplace:** http://localhost:3003

## Build a plugin

```bash
npx @veska/cli create-plugin my-plugin
cd my-plugin
pnpm install
pnpm dev
```

See [developers.veska.com](https://developers.veska.com) for the full SDK reference.

## Contributing

We welcome contributions. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

- Open issues for bugs and feature requests
- Join the community in [GitHub Discussions](https://github.com/veska-dev/veska/discussions)
- Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages

## License

Apache 2.0 — see [LICENSE](LICENSE).

The "Veska" trademark is owned by the founding entity. Forks offering a competing hosted service must rebrand.
