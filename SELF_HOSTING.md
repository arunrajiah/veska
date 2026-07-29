# Self-hosting Veska

This guide covers everything you need to run Veska on your own infrastructure.

## Prerequisites

- **Docker 24+** and **Docker Compose v2**
- **Node.js 22+** and **pnpm 9+** (for local development only)
- An **Anthropic API key** (for the AI configuration and action agents)
- A **Slack app** (for the Slack channel adapter)

## Quick start — Docker Compose

The fastest path to a running Veska instance:

```bash
git clone https://github.com/arunrajiah/veska.git
cd veska

# 1. Configure environment
cp .env.example .env
#    Edit .env and set at minimum:
#    - ANTHROPIC_API_KEY
#    - MAGIC_LINK_SECRET (any 32+ char random string)

# 2. Start all services
docker compose up -d

# 3. Run database migrations
docker compose exec api node packages/core/dist/db/migrate.js

# 4. Open the admin UI
open http://localhost:3000
```

Veska is now running. Visit http://localhost:3000 to complete onboarding.

## Deployment targets

### Bare VPS (Ubuntu 22.04+)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone and configure
git clone https://github.com/arunrajiah/veska.git /opt/veska
cd /opt/veska
cp .env.example .env
# Edit .env

# Start
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

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

## Upgrades

```bash
git pull origin main
docker compose pull
docker compose up -d
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
