# syntax=docker/dockerfile:1

# --- Stage 1: install deps with pnpm (owns the lockfile) ---
FROM node:24-slim AS deps

WORKDIR /avandar

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/dev-fanout-server/package.json \
  apps/dev-fanout-server/package.json

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# --- Stage 2: run with bun ---
FROM oven/bun:1-slim AS runner

WORKDIR /avandar

COPY --from=deps /avandar/node_modules /avandar/node_modules
COPY --from=deps /avandar/apps/dev-fanout-server/node_modules \
  /avandar/apps/dev-fanout-server/node_modules
COPY package.json ./

# `@avandar/dev-fanout-server` uses the `$/*` TS path alias, which points to
# `shared/*`. The local tsconfig.json extends the root tsconfig.node.json so
# that Bun resolves these paths at runtime.
COPY tsconfig.node.json tsconfig.node.json
COPY apps/dev-fanout-server apps/dev-fanout-server
COPY shared shared

WORKDIR /avandar/apps/dev-fanout-server

ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["bun", "src/index.ts"]
