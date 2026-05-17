---
name: Fly volume ngrok URLs
overview: Replace the repo-committed ngrok targets file with a Fly Volume–backed JSON file managed via authenticated dev-fanout-server endpoints and `ava dev ngrok add|list|remove` CLI commands, with unit tests for both server routes and CLI logic.
todos:
  - id: server-volume-file
    content: Switch forwarder to read `/data/ngrok-dev-urls.json` (env override) and delete repo `ngrok-targets.json`.
    status: completed
  - id: server-ngrok-admin-routes
    content: Add authenticated `/ngrok-url/add|list|remove` routes that read/write the JSON file atomically.
    status: completed
  - id: server-tests
    content: Add route tests for ngrok endpoints; update `forward.test.ts` to align with new file path/error handling.
    status: completed
  - id: cli-ngrok-commands
    content: Add `ava dev ngrok add|list|remove` commands calling the server endpoints with bearer auth.
    status: completed
  - id: cli-tests
    content: Add vitest coverage for CLI commands by stubbing `fetch` and asserting output + requests.
    status: completed
  - id: fly-setup-docs
    content: Document Fly volume mount + required env vars/secrets + file initialization steps.
    status: completed
isProject: false
---

# Fly Volume + JSON ngrok URL registry

## Goal

- Move dev target URL storage out of the repo and into a **Fly Volume** file named `ngrok-dev-urls.json`.
- Add **authenticated** management endpoints on `dev-fanout-server` at `/ngrok-url/add|list|remove`.
- Add `ava dev ngrok add|list|remove` commands that call those endpoints.
- Update forwarding to read from the Fly Volume JSON file.
- Add tests for the new server routes and CLI commands.

## Current state (what changes)

- `dev-fanout-server` currently reads `../../ngrok-targets.json` in `packages/dev-fanout-server/src/routes/forward.ts`.

```8:39:/Users/juanpablosarmiento/projects/avandar/packages/dev-fanout-server/src/routes/forward.ts
const DEV_URLS_FILE_PATH = "../../ngrok-targets.json";

const DevURLsFileSchema = z.object({
  targets: z.array(z.url()),
});

async function _getDevTargetURLs(): Promise<URL[]> {
  const rawFile: string = await readFile(
    new URL(DEV_URLS_FILE_PATH, import.meta.url),
    "utf8",
  );
  const parsed = DevURLsFileSchema.parse(JSON.parse(rawFile));
  return parsed.targets.map((target) => new URL(target));
}
```

## Design decisions (defaults)

- **Persisted file path (server)**
  - Default: `/data/ngrok-dev-urls.json`
  - Override via env var: `AVA_NGROK_DEV_URLS_FILE_PATH`
- **File schema** (keep existing to minimize churn)
  - `{ "targets": string[] }` with `z.array(z.url())`
- **Auth for admin endpoints**
  - Require a shared secret in: `AVA_DEV_FANOUT_ADMIN_TOKEN`
  - Client sends: `Authorization: Bearer <token>`
  - Requests without/incorrect token: `401`
  - This token must be set in both:
    - Fly.io app env (as a secret) for `dev-fanout-server`
    - Local `.env.development` for `ava-cli` (so devs can run the commands)
- **Single machine assumption**
  - Use **1 Fly Machine** with **1 attached volume** (no replication needed).

## Server changes (`packages/dev-fanout-server`)

### 1) Rename + relocate storage file

- **Remove** repo file: `packages/dev-fanout-server/ngrok-targets.json`
- **Use** volume file: `/data/ngrok-dev-urls.json` (created on the volume)

### 2) Update forwarding to read volume JSON

- Update `packages/dev-fanout-server/src/routes/forward.ts`:
  - Replace `DEV_URLS_FILE_PATH` with a function that returns the runtime path:
    - `process.env.AVA_NGROK_DEV_URLS_FILE_PATH ?? "/data/ngrok-dev-urls.json"`
  - Read from that filesystem path (not `import.meta.url` relative URL).
  - If the file is missing (`ENOENT`), treat as `targets: []` so `/forward/*` still returns `200` with empty `results`.
  - Update the docstring that currently references `ngrok-targets.json`.

### 3) Add `/ngrok-url/add|list|remove` endpoints

- Add `packages/dev-fanout-server/src/routes/ngrok-url.ts` implementing a Fastify plugin:
  - `GET /ngrok-url/list` → `{ targets: string[] }`
  - `POST /ngrok-url/add` with body `{ url: string }` → `{ targets: string[] }`
    - 409 if already exists
  - `POST /ngrok-url/remove` with body `{ url: string }` → `{ targets: string[] }`
    - 404 if not found
  - Common helpers:
    - `_readTargets()` reads JSON file; on `ENOENT` returns `{ targets: [] }`.
    - `_writeTargets(targets)` writes JSON atomically:
      - write to temp file in same dir, then rename
  - Auth guard:
    - verify `Authorization` header matches bearer token

### 4) Register the new routes

- Update `packages/dev-fanout-server/src/index.ts` to register the new plugin:
  - `await server.register(registerNgrokURLRoutes)` (name TBD)

### 5) Server tests

- Add `packages/dev-fanout-server/src/routes/ngrok-url.test.ts`
  - Follow the existing `forward.test.ts` pattern:
    - `Fastify()` + `server.register()` + `server.inject()`
    - `vi.mock("node:fs/promises", () => ({ readFile: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), mkdir: vi.fn() }))`
  - Test cases:
    - list returns parsed targets
    - add appends and persists
    - add duplicate returns 409
    - remove deletes and persists
    - remove missing returns 404
    - invalid url returns 400
    - missing file (`ENOENT`) lists empty and add creates new file

### 6) Update forwarding tests

- Update `packages/dev-fanout-server/src/routes/forward.test.ts`:
  - Keep mocking `readFile` exactly like today (no Fly-specific mocking).
  - Adjust any expectations only if forward code changes error handling.
  - Rename test helper(s) for clarity (optional), but keep behavior.

## CLI changes (`packages/ava-cli`)

### 1) Add `ava dev ngrok ...` command tree

- Update `packages/ava-cli/src/DevCLI/DevCLI.ts` to add a new `ngrok` subcommand.
- Add new directory:
  - `packages/ava-cli/src/DevCLI/NgrokCLI/`
    - `NgrokCLI.ts` (wires subcommands)
    - `NgrokAddCLI.ts` / `NgrokListCLI.ts` / `NgrokRemoveCLI.ts`
    - `index.ts` barrel(s) following repo conventions

### 2) CLI UX and inputs

- `ava dev ngrok add <url>`
- `ava dev ngrok remove <url>`
- `ava dev ngrok list`
- Use `.addPositionalArg({ name: "url", ... })` for add/remove.

### 3) CLI networking + auth

- Use Node’s global `fetch` (Node >=18 is already required by `ava-cli`).
- Config via env vars:
  - `AVA_DEV_FANOUT_SERVER_URL` (e.g. `https://your-app.fly.dev`)
  - `AVA_DEV_FANOUT_ADMIN_TOKEN`
- Each command calls:
  - `GET  {base}/ngrok-url/list`
  - `POST {base}/ngrok-url/add` JSON `{ url }`
  - `POST {base}/ngrok-url/remove` JSON `{ url }`
  - Header `Authorization: Bearer <token>`
- Output via existing helpers in `packages/ava-cli/src/utils/cliOutput/cliOutput.ts`.

### 4) CLI tests

- Add tests alongside the new CLI modules (mirroring Polar CLI tests):
  - Stub `global.fetch` with `vi.stubGlobal("fetch", ...)`.
  - Set env vars in `beforeEach`.
  - Spy on `Acclimate.log` to assert output.
  - Verify fetch is called with correct URL, method, headers, and JSON body.
  - Test error cases:
    - missing env vars → throws + prints error
    - server returns 401/409/404 → prints error + throws

## Fly.io setup steps (what you do manually)

### 1) Create app + volume

- Create the Fly app for `dev-fanout-server` (one region).
- Create a 1GB volume (cheapest meaningful size on Fly Volumes):
  - Mount destination: `/data`

### 2) Configure mounts

- Ensure your Fly config mounts the volume:
  - `destination = "/data"`

### 3) Set secrets / env vars

- **Required secret**
  - `AVA_DEV_FANOUT_ADMIN_TOKEN`: random long token (used by CLI and server)
    - Set on Fly.io as a secret env var for `dev-fanout-server`
    - Also add to `packages/ava-cli/.env.development` (or the repo’s
      `.env.development` location used by `ava-cli`)
- **Optional**
  - `AVA_NGROK_DEV_URLS_FILE_PATH=/data/ngrok-dev-urls.json`

### 4) Initialize the JSON file on the volume

- Create `/data/ngrok-dev-urls.json` with:

```json
{ "targets": [] }
```

(You can do this via `fly ssh console` into the machine and creating the file.)

### 5) Configure developers’ local environment

- Devs set these locally when running `ava dev ngrok ...`:
  - `AVA_DEV_FANOUT_SERVER_URL=https://<your-fly-app>.fly.dev`
  - `AVA_DEV_FANOUT_ADMIN_TOKEN=<same token>`
  - Preferred: put these in `.env.development` so `ava-cli` can load them

## Notes / constraints

- With a single Fly machine, volume-backed JSON is durable across restarts and redeploys.
- If you later run multiple machines, you’ll need a single-writer strategy or a replicated store; this plan intentionally stays single-machine/simple.

## Test plan (when implementing)

- `pnpm -C packages/dev-fanout-server test`
- `pnpm -C packages/ava-cli test`
