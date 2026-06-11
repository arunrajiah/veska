# r/selfhosted draft

> Also suitable (with small tweaks) for r/opensource and r/smallbusiness. Read each sub's self-promotion rules first; r/selfhosted allows dev posts that are transparent about being the author. Engage with every comment.

**Title:**

I built a self-hosted, AI-native ERP where your team works through Slack/email instead of logging in (Apache 2.0)

**Body:**

Hey r/selfhosted — solo dev here. After a year of building, I'm open-sourcing Veska: a self-hosted operations platform (CRM + support desk + finance + HR) for small businesses.

The angle that's different: almost nobody logs in. You (the admin) describe your company in plain English and the AI configures the modules. After that, your team files expenses, gets approvals, and handles support tickets through Slack, WhatsApp, or email. The AI agent does the data entry and every action it takes is audit-logged with its reasoning.

Self-hosting details, since that's what matters here:

- **Stack:** TypeScript, Hono API, Next.js admin, PostgreSQL 16 + pgvector, Redis, BullMQ — all in one `docker compose up`
- **LLM is pluggable:** Anthropic Claude by default, but it runs fully local with Ollama (or any OpenAI-compatible endpoint) — no data has to leave your network
- **Real accounting:** double-entry immutable ledger, not a toy
- **Auth:** TOTP 2FA, magic links, capability-based RBAC
- **License:** Apache 2.0, no open-core feature gating in this repo

Quick demo with seeded fake data (a company with a full pipeline, invoices, tickets):

```
git clone https://github.com/arunrajiah/veska && cd veska
cp .env.example .env
pnpm install && docker compose up -d
pnpm db:migrate && pnpm seed && pnpm dev
# log in at localhost:3000 → admin@acme.com / demo1234
```

Honest state of things: v0.1, one maintainer, Slack + email channels are solid, WhatsApp/Telegram are scaffolded but need hardening, no load testing yet. Roadmap is in the repo.

Repo: https://github.com/arunrajiah/veska

Would genuinely appreciate brutal feedback — especially from anyone who's tried to self-host Odoo/ERPNext and bounced off.
