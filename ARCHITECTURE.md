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
│   ├── core/         # OSS core library (@veska/core)
│   ├── sdk/          # OSS public SDK (@veska/sdk)
│   ├── cli/          # OSS CLI tool (@veska/cli)
│   ├── ui/           # OSS UI components (@veska/ui)
│   ├── ai/           # Cloud AI features (@veska-cloud/ai)
│   ├── notifications/ # Cloud notifications (@veska-cloud/notifications)
│   ├── rate-limit/   # Cloud rate limiting (@veska-cloud/rate-limit)
│   └── storage/      # Cloud storage (@veska-cloud/storage)
├── plugins/          # First-party and community plugins
├── scripts/          # Developer and CI scripts
└── turbo.json
```

---

## Package Taxonomy

Packages fall into two scopes with different licenses and distribution models:

| Package | npm scope | License | Purpose |
|---|---|---|---|
| `packages/core` | `@veska/core` | Apache 2.0 | Core data models, database layer, agent runtime |
| `packages/sdk` | `@veska/sdk` | Apache 2.0 | Public-facing SDK for third-party integrations |
| `packages/cli` | `@veska/cli` | Apache 2.0 | Command-line interface for Veska |
| `packages/ui` | `@veska/ui` | Apache 2.0 | Shared React UI component library |
| `apps/admin` | `@veska/admin` | Apache 2.0 | Admin dashboard application |
| `apps/api` | `@veska/api` | Apache 2.0 | REST/GraphQL API server |
| `apps/marketing` | `@veska/marketing` | Apache 2.0 | Marketing and documentation site |
| `apps/marketplace` | `@veska/marketplace` | Apache 2.0 | Plugin marketplace application |
| `packages/ai` | `@veska-cloud/ai` | Proprietary | LLM integrations, AI tool orchestration |
| `packages/notifications` | `@veska-cloud/notifications` | Proprietary | Email, SMS, push notification delivery |
| `packages/rate-limit` | `@veska-cloud/rate-limit` | Proprietary | Cloud-tier rate limiting and quotas |
| `packages/storage` | `@veska-cloud/storage` | Proprietary | Managed blob and file storage |

### OSS packages (`@veska/*`)

Published under Apache 2.0. Anyone can run a self-hosted Veska deployment using only these packages. They must remain free of proprietary dependencies.

### Cloud packages (`@veska-cloud/*`)

Proprietary, published separately for Veska Cloud subscribers. They enhance the platform with managed services but are not required for self-hosting.

---

## OSS/Cloud Boundary Rules

### The Golden Rule

> **OSS packages (`@veska/*` and `apps/*`) must NOT statically import `@veska-cloud/*` packages.**

A static import is any top-level `import` statement or CommonJS `require()` call that unconditionally pulls in the module at load time.

### What Is Allowed

| Pattern | Allowed | Reason |
|---|---|---|
| `@veska-cloud/*` imports `@veska/*` | Yes | Cloud depends on OSS, not the other way |
| Dynamic `await import('@veska-cloud/...')` with fallback inside OSS code | Yes | Degrades gracefully when cloud pkg absent |
| `@veska/*` importing other `@veska/*` | Yes | OSS-to-OSS is fine |
| `@veska-cloud/*` importing other `@veska-cloud/*` | Yes | Cloud-to-cloud is fine |

### What Is NOT Allowed

```ts
// ❌ Static import in an OSS package
import { SomeFeature } from '@veska-cloud/ai';

// ❌ Unconditional require() in an OSS package
const { SomeFeature } = require('@veska-cloud/storage');
```

### Why This Matters

Self-hosted deployments do not have access to `@veska-cloud/*` packages. A static import in an OSS package would cause module resolution failures at startup for any self-hosted user — making self-hosting impossible. Keeping the boundary clean ensures that the OSS tier is a first-class, fully functional product.

---

## Extending with Cloud Features

To add cloud-only capabilities without breaking the OSS boundary:

1. **Extend `ActionAgent`** from `@veska/core` — create a subclass in `@veska-cloud/ai` that adds cloud-specific behavior.

2. **Register extra tools** using `registerTools()` — cloud packages call this at initialization time to inject additional agent tools. OSS code never needs to know about them.

3. **Use the `enableCloudTools` flag** — the platform exposes an `enableCloudTools` option that is evaluated at runtime. Cloud deployments set it to `true`; self-hosted deployments leave it `false` (the default). Feature detection happens at runtime, not at import time.

### Pattern: Dynamic Import with Fallback

When OSS code needs to optionally use a cloud feature:

```ts
// ✅ Allowed in OSS packages — dynamic import with fallback
async function getStorage() {
  try {
    const { CloudStorage } = await import('@veska-cloud/storage');
    return new CloudStorage();
  } catch {
    return new LocalStorage(); // OSS fallback
  }
}
```

This pattern keeps the module graph clean while allowing progressive enhancement on cloud deployments.

---

## CI Enforcement

The boundary is enforced automatically in CI via the `check:boundary` script:

```bash
pnpm check:boundary
```

This runs `scripts/check-oss-cloud-boundary.sh`, which:

- Scans all TypeScript source files under OSS package directories.
- Greps for any static imports of `@veska-cloud/*`.
- Excludes lines containing `await import(` (dynamic imports are permitted).
- Exits with code `1` and prints the offending lines if any violations are found.
- Exits with code `0` if the boundary is clean.

The script should be run as part of any pull request that touches `packages/` or `apps/` source files.

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

# Check the OSS/cloud boundary
pnpm check:boundary

# Database operations (requires @veska/core configured)
pnpm db:generate
pnpm db:migrate
pnpm db:push
```
