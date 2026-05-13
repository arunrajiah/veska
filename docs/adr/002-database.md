# ADR 002 — Database

**Status:** Accepted  
**Date:** 2026-05-13

## Decision

PostgreSQL 16+ as the sole database. Extensions: `pgvector` (embeddings), `pg_partman` (partition management for audit logs and ledger entries), `pg_cron` (scheduled jobs inside the DB). Row-Level Security enforced at the database layer for tenant isolation.

## Rationale

- ACID transactions are non-negotiable for double-entry ledger integrity.
- RLS provides defence-in-depth for multi-tenant isolation — a bug in application code cannot leak cross-tenant data if the policy is set correctly.
- `pgvector` keeps embeddings co-located with entities, enabling semantic search without a separate vector store.
- Strong ecosystem: managed offerings on every major cloud (RDS, Cloud SQL, Neon, Supabase, Railway).

## Alternatives Considered

- **MongoDB** — rejected. No ACID transactions across documents, schema-on-read makes ledger integrity impossible to enforce.
- **MySQL/MariaDB** — lacks RLS; pgvector is Postgres-only.
- **CockroachDB** — distributed Postgres-compatible, interesting for v2 global deployments but adds operational complexity for self-hosters.
- **PlanetScale** — MySQL-based; same objections as MySQL.

## Consequences

- Self-hosters need a PostgreSQL 16+ instance. Docker Compose includes one.
- Migrations via Drizzle Kit — forward-only in production, reversible only via config rollback.
- Period locks and immutable journal entries are enforced at the DB level (triggers + `SECURITY DEFINER` functions) not just application code.
