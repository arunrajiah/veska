# Self-hosting Veska

This guide covers everything you need to run Veska on your own infrastructure.

## Prerequisites

- **Docker 24+** and **Docker Compose v2**
- **Node.js 22+** and **pnpm 9+** (for local development only)
- An **Anthropic API key** (for the AI configuration and action agents)
- A **Slack app** (for the Slack channel adapter)

## Quick start — prebuilt images (recommended)

The fastest path to a running Veska instance. No Node, no source checkout, just Docker:

```bash
mkdir veska && cd veska
curl -fsSL https://raw.githubusercontent.com/arunrajiah/veska/main/docker-compose.standalone.yml -o docker-compose.yml

# Configure: create a .env file next to the compose file and set at minimum:
#   ANTHROPIC_API_KEY=sk-ant-...        (or LLM_PROVIDER=ollama for local models)
#   JWT_SECRET=<random string>
#   MAGIC_LINK_SECRET=<any 32+ char random string>
#   POSTGRES_PASSWORD=<random string>
#   POSTGRES_APP_PASSWORD=<random string>

docker compose up -d
```

Migrations run automatically before the API starts. Visit http://localhost:3000 to complete onboarding. Images are published to GHCR for amd64 and arm64 on every push to `main` and every release; pin a release by setting `VESKA_TAG=v0.1.0` in `.env`.

## Quick start — build from source

Use this when you want to run modified code:

```bash
git clone https://github.com/arunrajiah/veska.git
cd veska

# 1. Configure environment
cp .env.example .env
#    Edit .env and set at minimum:
#    - ANTHROPIC_API_KEY
#    - MAGIC_LINK_SECRET (any 32+ char random string)

# 2. Build and start all services
docker compose up -d

# 3. Run database migrations
docker compose exec api node packages/core/dist/db/migrate.js

# 4. Open the admin UI
open http://localhost:3000
```

## Deployment targets

### Bare VPS (Ubuntu 22.04+)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Fetch the standalone compose file (prebuilt images) and configure
mkdir -p /opt/veska && cd /opt/veska
curl -fsSL https://raw.githubusercontent.com/arunrajiah/veska/main/docker-compose.standalone.yml -o docker-compose.yml
# Create .env with the secrets listed in the quick start above

# Start
docker compose up -d
```

To build from source on the VPS instead, clone the repo and use `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`.

One-click deploy templates (Railway, Fly.io, Helm) are planned — see [ROADMAP.md](ROADMAP.md). Contributions welcome.

## Environment variables

See [.env.example](.env.example) for the full list with descriptions. Minimum required:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI agents |
| `MAGIC_LINK_SECRET` | 32+ char secret for signing magic links |

## Connecting Slack

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Enable Socket Mode (for development) or Events API (for production)
3. Add the bot token and signing secret to your `.env`
4. Invite the bot to your workspace channels

## Database roles and row-level security

Veska ships row-level security policies that pin every tenant-scoped query to the
tenant on the request's session. They are enforced only when request-scoped queries
run as a non-superuser, so the API uses two connections:

- `DATABASE_URL` — privileged role. Migrations, seeding, auth, and background workers.
- `DATABASE_APP_URL` — non-superuser role for request-scoped queries. In Docker this
  role (`veska_app`) is created automatically on first start by
  `docker/initdb/01-app-role.sh`; set `POSTGRES_APP_PASSWORD` to override its default
  password and update `DATABASE_APP_URL` to match.

If `DATABASE_APP_URL` is unset the API falls back to `DATABASE_URL` and behaves as
before, with isolation enforced by the application layer only.

## Upgrades

Prebuilt images (standalone compose): migrations run automatically on every `up`.

```bash
docker compose pull
docker compose up -d
```

Source checkout:

```bash
git pull origin main
docker compose up -d --build
docker compose exec api node packages/core/dist/db/migrate.js
```

Migrations are always forward-only and safe to run on a live instance.

## Data & backups

Veska stores all data in PostgreSQL. Back up your database regularly:

```bash
# Example: pg_dump to S3
docker compose exec postgres pg_dump -U veska veska | \
  aws s3 cp - s3://your-bucket/veska-$(date +%Y%m%d).sql
```

## Security hardening

For production deployments:

1. **Never expose the Postgres or Redis ports publicly.** Use internal networking.
2. **Run behind a TLS-terminating reverse proxy** (Caddy, nginx, Traefik).
3. **Rotate `MAGIC_LINK_SECRET` periodically** — existing links will be invalidated.
4. **Use a secrets manager** (Vault, AWS Secrets Manager, Doppler) for credentials instead of `.env` files.
5. **Enable Postgres RLS** — it is enabled by default in the migration; do not disable it.

## Getting help

- [GitHub Discussions](https://github.com/arunrajiah/veska/discussions) — community support
- [GitHub Issues](https://github.com/arunrajiah/veska/issues) — bug reports
