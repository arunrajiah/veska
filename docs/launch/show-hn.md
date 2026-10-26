# Show HN draft

> Post from your own HN account. HN strongly prefers plain, honest, technical writing from the actual author; edit this into your own voice before posting. Best timing: weekday morning US Pacific time. Stay in the thread all day answering comments; that's where launches are won.

**Title:**

Show HN: Veska, an open-source ERP your team uses through Slack, not a dashboard

**Text:**

Hi HN, I'm Arun. For the past year I've been building Veska solo: a self-hosted, AI-native ERP for small businesses (Apache 2.0).

The thesis: small companies don't fail to adopt ERPs because they lack features. They fail because nobody wants to log into another dashboard. So in Veska, the dashboard is for the founder/admin; everyone else interacts through Slack, WhatsApp, or email. An employee files an expense by messaging the bot. A manager approves it from a Slack button. The AI agent does the data entry.

Setup is also conversational: you describe your company in plain English and the AI configures the modules (CRM, support desk, finance, HR); the demo GIF in the README shows this end-to-end.

What's under the hood (it's not a thin LLM wrapper):

- Real double-entry accounting: immutable ledger, invoices, expenses, budgets, recurring billing
- An agent with 30 ERP tools via the Anthropic SDK. Every AI action is audit-logged with its reasoning trace. Approval chains gate money-moving actions behind human sign-off by amount threshold (configure a chain; there is no default one yet)
- Works fully offline with Ollama or any OpenAI-compatible endpoint if you don't want data leaving your network
- Multi-tenant Postgres (Drizzle, 32 migrations), capability-based RBAC, TOTP 2FA
- TypeScript monorepo: Hono API, Next.js admin, plugin SDK with Stripe/QuickBooks/Google Calendar plugins
- 222 unit tests across core, the API route layer, and the official plugins

Try it with seeded demo data in ~5 minutes, no Node or cloning needed: curl one compose file, `docker compose up -d` (prebuilt images, migrations run automatically), then `docker compose --profile demo run --rm seed` and log in as admin@acme.com / demo1234. Exact commands are at the top of the README.

Honest caveats: I'm one person, it's v0.1, the WhatsApp/Telegram adapters are scaffolded but not battle-tested, and there's no load testing yet. The Slack and email paths are the most proven.

Repo: https://github.com/arunrajiah/veska

I'd love feedback on the core bet: would your team actually run their back office through chat? What would stop you?
