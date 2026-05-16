---
name: Fly Fastify Fanout Server
overview: Add a standalone TypeScript Fastify service under `server/` and deploy it to Fly.io as an always-on webhook relay that fans out `/ngrok` requests to a manually configured list of ngrok target URLs. Wire it into `npm run dev`, and deploy via staging/prod CI (no manual fly commands).
todos:
  - id: server-scaffold
    content: Create `server/` Fastify TypeScript service skeleton with `/ngrok` fanout and `ngrok-targets.json` configuration.
    status: completed
  - id: dev-wiring
    content: Update `scripts/startAvandar.sh` to add the fanout server process to the existing `concurrently` startup command.
    status: completed
  - id: fly-config
    content: Add Fly config and Dockerfile for always-on deployment (staging + prod).
    status: in_progress
  - id: deps
    content: Install minimal required packages (`fastify`, `tsx`, and `concurrently`).
    status: completed
  - id: repo-scripts
    content: Update root scripts so top-level `lint`, `test`, and `deploy:server` include the server.
    status: pending
  - id: cicd
    content: Update staging + production GitHub Actions workflows to deploy the server to Fly.io.
    status: pending
isProject: false
---

## Goals

- **Standalone TS server** in `server/` using Fastify.
- **Always-on webhook receiver** deployed to Fly.io (no cold starts).
- **Single endpoint for now**: `POST /ngrok` (and allow other methods) that **fans out** the incoming request to all configured local ngrok URLs.
- **Target URLs** live in a **manually edited JSON file** in `server/`.
- **Local dev**: when you run `npm run dev`, the fanout server starts alongside Vite/Supabase/ngrok by adding it to the existing `concurrently` command in `[scripts/startAvandar.sh](/Users/juanpablosarmiento/projects/avandar/scripts/startAvandar.sh)`.
- **CI/CD-only deploy**: staging and production deploy automatically via GitHub Actions.

## Build system decisions

- **Dev/hot reload**: `tsx watch` runs TypeScript directly and restarts on changes.
- **Build**: `tsc` emits JS to `server/dist/`.
- **Run**: `node server/dist/index.js`.

This avoids bundlers (`tsup`, Rollup, Vite, Babel) for now.

## Workspace integration (so top-level scripts can target the server)

- Add `server` to root `package.json` `workspaces` (alongside `packages/*`).
- Use `npm run -w server <script>` for dev/test/lint/deploy.

## Proposed file layout

- `[server/package.json](/Users/juanpablosarmiento/projects/avandar/server/package.json)`
  - Workspace package for the fanout server.
  - Scripts: `dev`, `build`, `start`, `lint`, `test`, `deploy`.
- `[server/tsconfig.json](/Users/juanpablosarmiento/projects/avandar/server/tsconfig.json)`
  - Build-only TS config (emit enabled).
- `[server/vitest.config.ts](/Users/juanpablosarmiento/projects/avandar/server/vitest.config.ts)`
  - Server tests (Node environment).
- `[server/src/index.ts](/Users/juanpablosarmiento/projects/avandar/server/src/index.ts)`
  - Creates Fastify instance, registers routes, starts listening.
- `[server/src/routes/ngrok.ts](/Users/juanpablosarmiento/projects/avandar/server/src/routes/ngrok.ts)`
  - Implements `ALL /ngrok` (or `POST /ngrok`) handler.
- `[server/ngrok-targets.json](/Users/juanpablosarmiento/projects/avandar/server/ngrok-targets.json)`
  - Manual list of **full target URLs** to forward to.
  - Example shape:
    - `{ "targets": ["https://abc.ngrok.app/ngrok", "https://def.ngrok.app/ngrok"] }`
- Fly deploy config (kept inside `server/` so it’s isolated from the frontend app):
  - `[server/fly.staging.toml](/Users/juanpablosarmiento/projects/avandar/server/fly.staging.toml)`
  - `[server/fly.production.toml](/Users/juanpablosarmiento/projects/avandar/server/fly.production.toml)`
  - `[server/Dockerfile](/Users/juanpablosarmiento/projects/avandar/server/Dockerfile)`

## Fan-out behavior (implementation details)

- **Body handling** (webhook-friendly): configure Fastify to parse all content-types as a **Buffer** using a wildcard content-type parser, so we can forward **raw bytes** (useful for signature-preserving webhooks).
- **Header forwarding**: forward most incoming headers but drop hop-by-hop/unsafe ones (e.g. `connection`, `transfer-encoding`, `content-length`, `host`).
- **Timeouts**: each fanout request uses `AbortSignal.timeout(5000)` (Node 22+) to avoid hanging.
- **Parallel fanout**: forward to all targets concurrently and return a summary.
- **Response**: return `200` with JSON like `{ received: true, results: [{ target, ok, status, error }] }`.
- **Health endpoint**: add `GET /healthz` for Fly health checks.

## Local dev wiring

Your current `npm run dev` runs `[scripts/startAvandar.sh](/Users/juanpablosarmiento/projects/avandar/scripts/startAvandar.sh)` and starts 3 processes with `concurrently`:

```83:90:/Users/juanpablosarmiento/projects/avandar/scripts/startAvandar.sh
concurrently \
  --names "vite,functions,ngrok" \
  --prefix-colors "blue,green,yellow" \
  --prefix "{name}" \
  --kill-others-on-fail \
  "vite" \
  "npm run fns:serve" \
  "ngrok http --url=$REVERSE_PROXY_URL 54321 --log=stdout"
```

We’ll add a **fourth** process (e.g. `fanout`) to that list to run the server dev command.

## Fly.io deployment approach

- Deploy as a **single containerized web service**.
- Configure Fly to keep **at least 1 machine running** to avoid cold starts:
  - `min_machines_running = 1`
  - `auto_stop_machines = "off"`
- Bind to `0.0.0.0` and `process.env.PORT` (Fly injects `PORT`).
- Use two Fly apps/configs: staging and production.
- Deploy happens via GitHub Actions (CI/CD), not developer machines.

## Minimal package list (before installing)

To keep installs minimal, avoid bundlers and use `tsx` for dev hot reload.

- **New runtime dependency (server)**
  - `fastify`
- **New dev dependency (root)**
  - `concurrently`
- **New dev dependency**
  - `tsx`

Notes:

- `scripts/startAvandar.sh` already requires a `concurrently` binary, but it’s not currently in your root `package.json`; adding it makes `npm run dev` work consistently for the whole team.
- For the server dev loop we use `tsx watch` so we get reliable hot reload.

## Commands you’ll use (DX)

- Local dev: `npm run dev` (starts Vite + functions + ngrok + fanout server)
- Deploy (CI-only):
  - Push to `develop` deploys staging.
  - Push to `main` deploys production.

## Lint and test integration

- Add server scripts:
  - `npm run -w server lint`
  - `npm run -w server test`
- Update root scripts so top-level commands include server:
  - `npm run lint` also runs `npm run -w server lint`
  - `npm run test` also runs `npm run -w server test`

## Deploy commands

- Server workspace:
  - `npm run -w server deploy` (invoked by CI; uses `flyctl` non-interactively)
- Root:
  - `npm run deploy:server` calls `npm run -w server deploy`

## CI/CD changes (staging + production)

Update the existing workflows:

- `[.github/workflows/staging.yaml](/Users/juanpablosarmiento/projects/avandar/.github/workflows/staging.yaml)`
  - Add a job after `test` to deploy the server to Fly staging.
  - Job installs `flyctl`, runs `npm ci`, then runs `npm run deploy:server`.
- `[.github/workflows/production.yaml](/Users/juanpablosarmiento/projects/avandar/.github/workflows/production.yaml)`
  - Add a job after `test` to deploy the server to Fly production.
  - Job installs `flyctl`, runs `npm ci`, then runs `npm run deploy:server`.

Keep `[.github/workflows/pr-develop.yaml](/Users/juanpablosarmiento/projects/avandar/.github/workflows/pr-develop.yaml)` as checks only.

## Setup prerequisites (do this ahead of time)

- Fly.io
  - Create two Fly apps: one staging, one production.
  - Put each app name in `server/fly.staging.toml` and `server/fly.production.toml`.
  - Create a Fly API token that can deploy both apps.
- GitHub
  - Add `FLY_API_TOKEN` secret to the `staging` and `production` GitHub
    Environments.

## Acceptance checks

- Hitting Fly endpoint `POST /ngrok` results in forwarded requests to every URL in `server/ngrok-targets.json`.
- Local `npm run dev` starts the fanout server with the existing stack.
- No serverless functions involved.
- Staging deploy happens automatically on push to `develop`.
- Production deploy happens automatically on push to `main`.
