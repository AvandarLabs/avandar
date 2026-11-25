# syntax=docker/dockerfile:1

# --- Stage 1: install deps with pnpm (owns the lockfile) ---
FROM node:24-slim AS deps

WORKDIR /avandar

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# Every workspace package the server imports, so pnpm links them.
COPY apps/pipeline-server/package.json apps/pipeline-server/package.json
COPY packages/node/etl/package.json packages/node/etl/package.json
COPY packages/shared/utils/package.json packages/shared/utils/package.json

# DuckDB is a peer of @avandar/etl, installed through the server's own
# dependency. Hoisting it lets the etl source resolve it from the root. The
# leading newline matters: `.npmrc` does not end with one.
RUN printf '\npublic-hoist-pattern[]=duckdb\n' >> .npmrc

# Install scripts run only for the root package.json's
# `pnpm.onlyBuiltDependencies` (duckdb, which downloads its native binary).
RUN pnpm install --frozen-lockfile --prod

# Fails the build, rather than every machine start, when the etl source
# cannot resolve DuckDB.
RUN node -e "require.resolve('duckdb', { paths: ['packages/node/etl'] })"

# --- Stage 2: run with bun ---
FROM oven/bun:1.3.11-slim AS runner

WORKDIR /avandar

COPY --from=deps /avandar/node_modules node_modules
COPY --from=deps /avandar/apps/pipeline-server/node_modules \
  apps/pipeline-server/node_modules
COPY --from=deps /avandar/packages/node/etl/node_modules \
  packages/node/etl/node_modules
COPY --from=deps /avandar/packages/shared/utils/node_modules \
  packages/shared/utils/node_modules
COPY package.json tsconfig.base.json tsconfig.node.json tsconfig.app.json ./
# Bun resolves the `$/`, `@etl`, and `@pipeline-server` path aliases from the
# tsconfig files above (`shared/tsconfig.json` extends `tsconfig.app.json`),
# so the sources they point at come along.
COPY shared shared
COPY packages packages
COPY apps/pipeline-server apps/pipeline-server

WORKDIR /avandar/apps/pipeline-server

# The git commit this image was built from, recorded with every run. Pass it
# with `--build-arg AVA_CODE_VERSION=$(git rev-parse HEAD)`. Unset, runs
# record no commit.
ARG AVA_CODE_VERSION
ENV AVA_CODE_VERSION=${AVA_CODE_VERSION}

ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["bun", "src/index.ts"]
