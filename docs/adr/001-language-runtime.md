# ADR 001 — Language & Runtime

**Status:** Accepted  
**Date:** 2026-05-13

## Decision

TypeScript on Node.js 22+ (Bun-compatible). Strict mode enabled everywhere.

## Rationale

- Largest pool of OSS contributors for a community-first project.
- Single language across API, admin frontend, CLI, and plugin runtime eliminates context-switching.
- Node.js 22 LTS provides stable native ESM, the `--watch` flag, and the built-in `test` runner as fallback.
- Bun compatibility is a property we want (faster CI, faster local installs) but not a hard dependency — the production target is Node.js.

## Alternatives Considered

- **Go** — excellent runtime performance and strong concurrency story, but smaller OSS contributor pool and no native browser/frontend story.
- **Python** — strong AI/ML ecosystem, but async story is messier and less familiar to frontend developers who might contribute to admin UI.

## Consequences

- All packages must compile to ES2022+ targets.
- No `any` unless explicitly `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a comment explaining why.
- Plugin authors write TypeScript or vanilla JS; other languages are a WASM future.
