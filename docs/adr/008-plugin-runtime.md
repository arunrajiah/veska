# ADR 008 — Plugin Runtime

**Status:** Accepted  
**Date:** 2026-05-13

## Decision

Isolated Node.js `worker_threads` with a capability-restricted SDK. Each plugin runs in its own worker. Communication between the host process and plugin workers is via structured `postMessage` (no shared memory).

## Rationale

- `worker_threads` is built-in to Node.js — no extra runtime dependency.
- Workers run in the same process memory space as V8, making them significantly faster to spin up than child processes or Docker containers.
- The SDK (injected into the worker context) acts as the capability enforcement boundary — plugins receive a `veska` object with only the methods declared in their manifest's `capabilities_required`.
- Synchronous blocking is impossible between host and worker; all communication is async message passing.

## Security Model

1. Plugins receive a `veska` SDK proxy scoped to their declared capabilities and their tenant.
2. Network access is enforced via a custom `fetch` wrapper that checks the plugin's declared `network_whitelist` before each request.
3. Filesystem access is blocked (`fs` module is not available in the worker context).
4. `require`/`import` inside the worker is restricted to the plugin's own bundle and a whitelist of safe standard modules.
5. CPU time limits per job invocation (configurable, default 30 seconds).
6. Memory limits per worker (configurable, default 256 MB).

## Alternatives Considered

- **Deno** — excellent security model (deny-by-default), but requires a separate Deno runtime and plugins would need to be rewritten for Deno-compatible imports.
- **WASM** — ideal long-term for non-JS plugins and stronger sandboxing, but WASI ecosystem is still maturing. Planned for v2.
- **Docker per plugin** — maximum isolation but unacceptable cold-start latency and operational complexity.
- **vm2 / isolated-vm** — `isolated-vm` provides stronger V8 isolation than worker_threads; worth evaluating for high-security tenants in v1.

## Consequences

- Plugin bundles are single-file ESM bundles (esbuild at publish time).
- The SDK types are in `packages/sdk` and published to npm as `@veska/sdk`.
- Plugin developers test locally against a dev SDK that uses in-process direct calls instead of worker messaging.
