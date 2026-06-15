# Veska Architecture

## Overview

Veska is an AI-native operations platform for small and medium businesses, structured as a **Turborepo monorepo** managed with **pnpm workspaces**. The repository contains applications, shared packages, and plugins organized under `apps/`, `packages/`, and `plugins/`.

Build orchestration is handled by [Turborepo](https://turbo.build/) (`turbo.json`), which caches and parallelizes tasks across the workspace. Dependencies are managed by [pnpm](https://pnpm.io/) (`pnpm-workspace.yaml`).

```
veska/
├── apps/
│   ├── admin/        # Admin dashboard (@veska/admin)
│   ├── api/          # Backend API server (@veska/api)
│   ├── marketing/    # Marketing site (@veska/marketing)
│   └── marketplace/  # Plugin marketplace (@veska/marketplace)
├── packages/
│   ├── core/         # Core library — entities, DB, agent runtime (@veska/core)
│   ├── sdk/          # Public plugin SDK (@veska/sdk)
│   ├── cli/          # Developer CLI (@veska/cli)
│   ├── ui/           # Shared React UI components (@veska/ui)
│   ├── ai/           # LLM providers and AI agent (@veska/ai)
│   ├── notifications/ # Email and notification delivery (@veska/notifications)
│   ├── rate-limit/   # Rate limiting middleware (@veska/rate-limit)
│   └── storage/      # File and blob storage (@veska/storage)
├── plugins/          # First-party and community plugins
├── scripts/          # Developer and CI scripts
└── turbo.json
```

---

## Package Taxonomy

All packages in this repository are licensed **Apache 2.0**.

| Package | npm scope | Purpose |
|---|---|---|
| `packages/core` | `@veska/core` | Core data models, database layer, agent runtime |
| `packages/sdk` | `@veska/sdk` | Public-facing SDK for third-party plugins |
| `packages/cli` | `@veska/cli` | Command-line interface for Veska |
| `packages/ui` | `@veska/ui` | Shared React UI component library |
| `packages/ai` | `@veska/ai` | LLM provider abstraction and AI action agent |
| `packages/notifications` | `@veska/notifications` | Email, SMS, and push notification delivery |
| `packages/rate-limit` | `@veska/rate-limit` | Rate limiting middleware |
| `packages/storage` | `@veska/storage` | File and blob storage abstraction |
| `apps/admin` | `@veska/admin` | Admin dashboard application |
| `apps/api` | `@veska/api` | REST API server |
| `apps/marketing` | `@veska/marketing` | Marketing and documentation site |
| `apps/marketplace` | `@veska/marketplace` | Plugin marketplace application |

### Core packages (`@veska/core`, `@veska/sdk`, `@veska/cli`, `@veska/ui`)

The foundational layer. Any self-hosted deployment can run with only these packages plus the apps. No external service dependencies beyond PostgreSQL and Redis.

### Feature packages (`@veska/ai`, `@veska/notifications`, `@veska/rate-limit`, `@veska/storage`)

Optional modules that extend the platform. They wrap external services (Anthropic, Resend, etc.) and degrade gracefully when not configured — self-hosted deployments can opt out of any feature module by not setting its environment variables or by swapping in local alternatives (Ollama instead of Anthropic, SMTP instead of Resend, local disk instead of S3).

---

## Modularity Rules

Feature packages are designed to be **optional at runtime**. This means:

### The Golden Rule

> **Core packages and apps must NOT statically import feature packages if that import would cause startup failure when the feature is not configured.**

A static import is any top-level `import` statement or CommonJS `require()` that unconditionally pulls in the module at load time.

### What Is Allowed

| Pattern | Allowed | Reason |
|---|---|---|
| Feature packages import core packages | Yes | Features depend on core, not the other way |
| Dynamic `await import('@veska/...')` with fallback in app code | Yes | Degrades gracefully when feature not configured |
| Core packages importing other core packages | Yes | Core-to-core is fine |
| Feature packages importing other feature packages | Yes | Feature-to-feature is fine |

### What Is NOT Allowed

```ts
// ❌ Unconditional static import of a feature package in core
import { sendEmail } from '@veska/notifications';

// ❌ Unconditional require() with no fallback
const { CloudStorage } = require('@veska/storage');
```

### Why This Matters

Self-hosted deployments may not configure every external service. A static import that fails module resolution at startup would break the entire deployment. The dynamic import pattern ensures that missing or unconfigured feature packages degrade to no-ops or local fallbacks rather than crashing.

---

## Extending with Optional Features

To add a feature that wraps an external service:

1. **Implement a local fallback in `@veska/core`** — define the interface and a default no-op or local implementation. The feature package overrides this at runtime when configured.

2. **Use dynamic import with fallback in app code**:

```ts
// ✅ Allowed — dynamic import with graceful fallback
async function getStorage() {
  try {
    const { CloudStorage } = await import('@veska/storage');
    return new CloudStorage();
  } catch {
    return new LocalStorage(); // always available, no external deps
  }
}
```

3. **Use the `enableCloudTools` flag** — the platform exposes an `enableCloudTools` option evaluated at runtime. Deployments with external services set it to `true`; minimal self-hosted deployments leave it `false` (the default).

---

## CI Enforcement

The modularity boundary is enforced in CI via the `check:boundary` script:

```bash
pnpm check:boundary
```

This runs `scripts/check-oss-cloud-boundary.sh`, which:

- Scans all TypeScript source files under core and app directories.
- Greps for static imports of feature packages (`@veska/ai`, `@veska/notifications`, `@veska/rate-limit`, `@veska/storage`).
- Excludes dynamic imports (`await import(`).
- Exits with code `1` and prints offending lines if any violations are found.
- Exits with code `0` if the boundary is clean.

---

## Running Locally

```bash
# Install all dependencies
pnpm install

# Start all apps in development mode (parallel)
pnpm dev

# Build all packages and apps
pnpm build

# Run all tests
pnpm test

# Type-check the entire monorepo
pnpm typecheck

# Lint the entire monorepo
pnpm lint

# Check the modularity boundary
pnpm check:boundary

# Database operations (requires @veska/core configured)
pnpm db:generate
pnpm db:migrate
pnpm db:push
```
