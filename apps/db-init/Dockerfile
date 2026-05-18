FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune --scope=db-init --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.json ./tsconfig.json
RUN pnpm run build --filter=db-init

FROM base AS runner
WORKDIR /app/apps/db-init
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/db-init/package.json ./package.json
COPY --from=builder /app/apps/db-init/node_modules ./node_modules
COPY --from=builder /app/apps/db-init/data.json ./data.json
COPY --from=builder /app/apps/db-init/grade.json ./grade.json
COPY --from=builder /app/apps/db-init/dist ./dist
COPY --from=builder /app/packages/db/package.json /app/packages/db/package.json
COPY --from=builder /app/packages/db/dist /app/packages/db/dist
COPY --from=builder /app/packages/db/drizzle ./drizzle
COPY --from=builder /app/packages/shared/package.json /app/packages/shared/package.json
COPY --from=builder /app/packages/shared/dist /app/packages/shared/dist

CMD ["node", "dist/index.js"]
