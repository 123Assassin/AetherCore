FROM node:24.14.0-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @package/db build
RUN pnpm --filter @package/shared build
RUN pnpm --filter db-init build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV MIGRATIONS_FOLDER=/app/packages/db/drizzle
COPY --from=builder /app ./
WORKDIR /app/apps/db-init
CMD ["node", "dist/index.js"]
