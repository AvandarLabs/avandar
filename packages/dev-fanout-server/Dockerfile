# syntax=docker/dockerfile:1

FROM node:22-slim AS base

WORKDIR /app

ENV NODE_ENV=production

FROM base AS deps

# Install workspace deps using the root lockfile.
COPY package.json package-lock.json ./
COPY packages/dev-fanout-server/package.json \
  packages/dev-fanout-server/package.json

# `tsx` is a devDependency of `@avandar/dev-fanout-server` but is required at
# runtime because `npm run start` executes TypeScript directly.
RUN npm ci --include=dev --ignore-scripts

FROM base AS runner

COPY --from=deps /app/node_modules /app/node_modules
COPY package.json package-lock.json ./

# Runtime TS config (provides `$/*` path aliases).
COPY tsconfig.node.json tsconfig.node.json

# Service sources.
COPY packages/dev-fanout-server packages/dev-fanout-server

# `@avandar/dev-fanout-server` uses the `$/*` TS path alias, which points to
# `shared/*`.
COPY shared shared

WORKDIR /app/packages/dev-fanout-server

ENV PATH="/app/node_modules/.bin:${PATH}"

ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["tsx", "--tsconfig", "/app/tsconfig.node.json", "src/index.ts"]
