FROM node:22-alpine AS base
RUN corepack enable pnpm

# Every workspace package the API depends on has to be present here, or
# `pnpm install --filter=@veska/api...` cannot resolve the workspace graph.
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ai/package.json ./packages/ai/
COPY packages/core/package.json ./packages/core/
COPY packages/notifications/package.json ./packages/notifications/
COPY packages/rate-limit/package.json ./packages/rate-limit/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/storage/package.json ./packages/storage/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter=@veska/api...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
# The `...` suffix builds the API together with its workspace dependencies.
RUN pnpm build --filter=@veska/api...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 veska
COPY --from=builder --chown=veska:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=veska:nodejs /app/apps/api/package.json ./apps/api/package.json
# Copied whole: each workspace package needs its package.json (for the exports map),
# its dist, and its own node_modules. pnpm resolves through per-package symlinks, so
# copying only the root node_modules leaves every workspace import unresolvable.
COPY --from=builder --chown=veska:nodejs /app/packages ./packages
COPY --from=deps --chown=veska:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=veska:nodejs /app/apps/api/node_modules ./apps/api/node_modules
USER veska
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
