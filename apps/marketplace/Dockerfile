FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/sdk/package.json ./packages/sdk/
COPY apps/marketplace/package.json ./apps/marketplace/
RUN pnpm install --frozen-lockfile --filter=@veska/marketplace...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build --filter=@veska/marketplace

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/marketplace/.next/standalone ./
COPY --from=builder /app/apps/marketplace/.next/static ./apps/marketplace/.next/static
COPY --from=builder /app/apps/marketplace/public ./apps/marketplace/public
USER nextjs
EXPOSE 3003
ENV PORT=3003
CMD ["node", "apps/marketplace/server.js"]
