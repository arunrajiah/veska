FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/sdk/package.json ./packages/sdk/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter=@veska/api...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY . .
RUN pnpm build --filter=@veska/core --filter=@veska/api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 veska
COPY --from=builder --chown=veska:nodejs /app/packages/core/dist ./packages/core/dist
COPY --from=builder --chown=veska:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=deps --chown=veska:nodejs /app/node_modules ./node_modules
USER veska
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
