# Contributing to Veska

Thanks for considering a contribution. Here's everything you need to know.

## Before you start

- Check [GitHub Issues](https://github.com/veska-dev/veska/issues) to see if your idea or bug is already tracked.
- For large changes (new modules, architectural changes), open a discussion first so we can align before you invest the time.
- Small fixes (typos, minor bugs, test coverage) — just open a PR.

## Development setup

```bash
git clone https://github.com/veska-dev/veska.git
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
4. Push and open a PR against `develop`.
5. Fill in the PR template.

PRs are reviewed within 3 business days. We may ask for changes; we won't close without explanation.

## Architecture Decision Records

Major decisions live in `docs/adr/`. If your PR introduces a significant technical choice, add an ADR alongside the code.

## Questions?

Open a [GitHub Discussion](https://github.com/veska-dev/veska/discussions). We read everything.
