# ADR 004 — Job Queue

**Status:** Accepted  
**Date:** 2026-05-13

## Decision

BullMQ on Redis (Valkey-compatible) for background job processing.

## Rationale

- BullMQ is the most battle-tested Node.js queue library with reliable at-least-once delivery, delayed jobs, repeatable jobs, job priorities, and rate limiting.
- Redis is already a near-universal dependency for session caching and pub/sub; adding BullMQ doesn't introduce a new infrastructure component.
- Excellent observability via Bull Board (can be embedded in the admin UI).
- Active maintenance and a commercial support option (Bull Premium) if needed.

## Alternatives Considered

- **Inngest** — managed durable functions with excellent DX and local dev experience. Preferred for Veska Cloud eventually, but introduces a vendor dependency for self-hosters.  Inngest can be added as an optional adapter behind the queue abstraction in v1.
- **pg-boss** — queues in Postgres itself. Zero new infra, but throughput ceilings matter for high-volume channel adapters.
- **Temporal** — extremely powerful workflow orchestration, but heavy operational footprint incompatible with the "single docker compose up" self-hosting goal.

## Consequences

- Docker Compose includes a Redis 7 (or Valkey 8) service.
- All background work goes through a `QueueService` abstraction in `packages/core` — never raw BullMQ calls in app code.
- Job schemas are versioned so in-flight jobs survive deploys.
