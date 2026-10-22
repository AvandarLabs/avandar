# syntax=docker/dockerfile:1

# --- Stage 1: install deps with pnpm (owns the lockfile) ---
FROM node:24-slim AS deps

WORKDIR /avandar

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/pipeline-server/package.json \
  apps/pipeline-server/package.json

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# --- Stage 2: run with bun ---
FROM oven/bun:1.3.11-slim AS runner

WORKDIR /avandar

COPY --from=deps /avandar/node_modules /avandar/node_modules
COPY --from=deps /avandar/apps/pipeline-server/node_modules \
  /avandar/apps/pipeline-server/node_modules
COPY package.json ./
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
