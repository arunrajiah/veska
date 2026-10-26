# awesome-selfhosted submission

Submissions are PRs against https://github.com/awesome-selfhosted/awesome-selfhosted-data (the data repo, not the README repo). Add one file, `software/veska.yml`, with the content below, then open the PR using their template.

Requirements check (as of 2026-10-26):

- [x] Older than 4 months: v0.1.0 released 2026-06-13
- [x] Actively maintained: recent commits on main
- [x] Free license from their approved list: Apache-2.0
- [x] Self-hostable without a mandatory external service (AI runs on Ollama locally; Anthropic is optional)
- [ ] Verify current field names and allowed `platforms`/`tags` values against their CONTRIBUTING.md before opening the PR (format below matches their 2025 schema; assumed still current)

`software/veska.yml`:

```yaml
name: Veska
website_url: https://hub.arunrajiah.com/products/veska
source_code_url: https://github.com/arunrajiah/veska
description: "AI-native operations platform (CRM, support desk, finance, HR) for small businesses, operated through Slack, WhatsApp and email instead of dashboards."
licenses:
  - Apache-2.0
platforms:
  - Nodejs
  - Docker
tags:
  - Enterprise Resource Planning (ERP)
```

Notes:

- Description must be under 250 characters, factual, no superlatives. The one above is 155.
- The `tags` value must match an existing category file in their `tags/` directory. ERP exists; check the exact spelling in `tags/` first.
- One software entry per PR. Their CI lints the file; fix whatever it flags.
- Maintainers sometimes sit on PRs for weeks. This is normal; answer review comments promptly and do not bump.
