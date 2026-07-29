# Single multi-target build for every Veska service.
#
# Previously each app had its own Dockerfile, so a cold `docker compose build` ran
# four near-identical `pnpm install`s and downloaded the same dependency set four
# times. BuildKit builds the shared `deps` and `builder` stages once and reuses them
# across all four targets, so the install and the compile each happen a single time.
#
# Build one service with:  docker build --target api -t veska-api .
FROM node:22-alpine AS base
RUN corepack enable pnpm

# ── Dependencies: installed once for the whole workspace ──────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ai/package.json ./packages/ai/
COPY packages/cli/package.json ./packages/cli/
COPY packages/core/package.json ./packages/core/
COPY packages/notifications/package.json ./packages/notifications/
COPY packages/rate-limit/package.json ./packages/rate-limit/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/storage/package.json ./packages/storage/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/
COPY apps/admin/package.json ./apps/admin/
COPY apps/marketing/package.json ./apps/marketing/
COPY apps/marketplace/package.json ./apps/marketplace/
# The cache mount keeps the pnpm store across rebuilds, so unchanged dependencies
# are never re-downloaded.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline --store-dir=/pnpm/store

# ── Build: every app compiled in one pass ─────────────────────────────────────
FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps
COPY . .
RUN pnpm build \
      --filter=@veska/api... \
      --filter=@veska/admin... \
      --filter=@veska/marketing... \
      --filter=@veska/marketplace...

# ── Runtime images ────────────────────────────────────────────────────────────
FROM base AS api
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 veska
COPY --from=builder --chown=veska:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=veska:nodejs /app/apps/api/package.json ./apps/api/package.json
# pnpm resolves workspace imports through per-package node_modules symlinks, so the
# packages tree and both node_modules directories all have to come along.
COPY --from=builder --chown=veska:nodejs /app/packages ./packages
COPY --from=deps --chown=veska:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=veska:nodejs /app/apps/api/node_modules ./apps/api/node_modules
USER veska
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]

FROM base AS admin
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/admin/server.js"]

FROM base AS marketing
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/marketing/.next/standalone ./
COPY --from=builder /app/apps/marketing/.next/static ./apps/marketing/.next/static
COPY --from=builder /app/apps/marketing/public ./apps/marketing/public
USER nextjs
EXPOSE 3002
CMD ["node", "apps/marketing/server.js"]

FROM base AS marketplace
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/marketplace/.next/standalone ./
COPY --from=builder /app/apps/marketplace/.next/static ./apps/marketplace/.next/static
COPY --from=builder /app/apps/marketplace/public ./apps/marketplace/public
USER nextjs
EXPOSE 3003
CMD ["node", "apps/marketplace/server.js"]
