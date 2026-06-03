FROM node:24.14.0-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_SIMULATION_APP_PORT=80
ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_SIMULATION_APP_PORT=$NEXT_PUBLIC_SIMULATION_APP_PORT
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @package/db build
RUN pnpm --filter @package/shared build
RUN pnpm --filter @package/auth build
RUN pnpm --filter web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
