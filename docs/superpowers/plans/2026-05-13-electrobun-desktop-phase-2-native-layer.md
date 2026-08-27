# Electrobun Desktop — Phase 2: Native Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Per-step test handoff:** After completing every Step in this plan, output an enumerated list (`1.`, `2.`, `3.`, …) of the exact actions the human partner should take to verify the just-completed Step — commands to run (copy-pasteable), files or UI to inspect, and the expected result for each. Do this for every Step, including "trivial" config/file-creation steps; never skip or summarize. The list is in addition to (not a replacement for) the Manual review checkpoint at the end of each Task.
>
> **PR rule:** Every Task ships as exactly **one PR**. Steps are progress markers _within_ a Task, not independent PR boundaries — never split a Task across multiple PRs, and never bundle two Tasks into one PR. When a per-Task `**PR boundaries:**` note below mentions multiple PRs (carried over from an earlier revision), treat that as a signal the Task should be **decomposed into multiple smaller Tasks**, not shipped as multi-PR work.

**Spec:** `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md`

**Testing strategy:** `docs/superpowers/specs/2026-05-14-testing-strategy.md` — defines per-PR test groupings (G2.x) referenced in each Task below.

**Goal:** Wire all desktop privileged services (SQLite, native DuckDB, filesystem `DatasetBlobStore`, OS keychain) into Bun main and expose them to the webview via typed IPC. After Phase 2 the desktop runs **fully offline** against a local snapshot of the user's data; the sync engine (Phase 3) is still absent, so writes do not yet propagate to Supabase.

**Architecture:**

- A typed IPC layer in `shared/platform/ipc/` defines contracts; webview side has an IPC client, Bun main side has handler registration.
- `apps/desktop/main/services/` hosts the concrete native implementations: `Sqlite.ts`, `DuckDb.ts`, `FileSystemDatasetBlobStore.ts`, `Keychain.ts`.
- A Postgres→SQLite migration generator (`apps/desktop/scripts/gen-sqlite-migrations.ts`) shells out to Python's `sqlglot`, guarded by a `SYNCABLE_TABLES` manifest.
- `createSqliteCrudClient` joins `createSupabaseCrudClient` as a backend implementation; `createRdbCrudClient` (at `shared/RdbCrudClient/createRdbCrudClient.ts`) now branches per platform.

**Tech Stack:** Electrobun IPC, Bun runtime, `bun:sqlite`, native DuckDB (via the existing `duckdb` Node binding used by `@avandar/ava-etl`), `Bun.spawn` shelling out to `/usr/bin/security` for keychain access, Python 3 + `sqlglot` (developer-machine dependency).

**Phase 1 outcome — what already exists (as of 2026-05-17):**

- Electrobun desktop shell: `apps/desktop/{electrobun.config.ts,main/index.ts,preload/index.ts,package.json,vitest.config.ts,types/electrobun-deps.d.ts}` and `pnpm dev:desktop` boots a window pointed at the Vite dev server.
- Platform discriminator: `shared/platform/isDesktop.ts` (reads `document.documentElement.dataset.avaPlatform`, set in the page main world by a Bun-side `dom-ready` handler in `apps/desktop/main/index.ts`).
- Platform interface contracts (type-only): `shared/platform/types/{Platform,AuthProvider,DatasetBlobStore,DuckDbClient,RdbClient,ServerApiClient,SyncEngine}.types.ts` plus a structural existence test at `shared/platform/types/interfaces.test.ts`.
- Umbrella CRUD factory: `shared/RdbCrudClient/createRdbCrudClient.ts` (currently always returns `createSupabaseCrudClient`; Phase 2 Task 8 flips the desktop branch). Every `src/clients/**` call site has already been migrated from `createSupabaseCrudClient` to `createRdbCrudClient`.
- ServerApiClient Phase 1 stub: `packages/shared/clients/src/ServerApiClient/createIpcServerApiClient.ts` throws `"desktop ServerApiClient lands in Phase 2"`. `createServerApiClient` currently falls through to the browser adapter on both platforms. Phase 2 Task 14 replaces the stub.
- Platform-aware hooks: `src/hooks/useIsDesktopPlatform/`, `src/hooks/usePlatformInfo/` consume `isDesktop()`. There is no `PlatformProvider` yet — Task 13 introduces it.

**Path aliases & package layout (deltas from the plan as originally drafted):**

- There is **no `@avandar/platform` workspace package**. Platform code lives under `shared/platform/` and is reached via the `$/` alias (`$/* → ./shared/*`). When code samples below import from `"@avandar/platform"`, substitute the matching `$/platform/...` path: contracts at `$/platform/ipc/contracts.ts`, client at `$/platform/ipc/client.ts`, server at `$/platform/ipc/server.ts`, `isDesktop` at `$/platform/isDesktop.ts`, and the `Desktop*` adapters at `$/platform/desktop/...`.
- The umbrella factory is at `shared/RdbCrudClient/createRdbCrudClient.ts` (under `$/RdbCrudClient/...`), **not** `packages/shared/clients/src/RdbCrudClient/`. Concrete backends like `createSupabaseCrudClient` and the new `createSqliteCrudClient` do live under `packages/shared/clients/src/` (the `@clients` package, alias `@clients/*`).
- Tests under `shared/**` (excluding `shared/lib/**`) are picked up by the root vitest config and run via `pnpm test:frontend`. Tests under `apps/desktop/` run via `pnpm --filter @avandar/desktop test`, but the current desktop `vitest.config.ts` only includes `main/**` and `preload/**` — Tasks that drop tests in `apps/desktop/{sync,scripts}/` must also widen that include glob or relocate the tests under `main/`.

**Phase exit criteria:**

1. On desktop, `pnpm dev:desktop` opens the app; first launch performs a one-shot Supabase→SQLite snapshot pull; subsequent launches read from local SQLite even with the network disabled.
2. Native DuckDB in Bun main answers queries from the webview via IPC; duckdb-wasm is no longer loaded by the desktop webview bundle.
3. File uploads on desktop write the source + parquet to disk under the per-OS-user app data directory.
4. Refresh tokens persist in the macOS Keychain via `/usr/bin/security` shellout; auth survives app relaunches.
5. `pnpm test` is green. `pnpm dev` (web) is unchanged.

**Honest framing:** This is the largest phase. Treat each native service as its own subsystem with TDD discipline. The migration generator, IPC layer, and keychain shellout all get tests — the keychain has a pure-layer unit suite (argv builder + exit-code parser via mocked `Bun.spawn`) plus a `KEYCHAIN_E2E=1`-gated integration test against the real `security` CLI.

---

## File Structure

> The paths below reflect the **current** repo layout after Phase 1 landed. Where the original plan referenced `packages/shared/platform/src/...` or `@avandar/platform`, the real location is `shared/platform/...` (alias `$/platform/...`). The remaining `@avandar/platform` imports inside code samples in later Tasks have been intentionally left in place — when implementing, substitute the matching `$/platform/...` path per the note in the previous section.

**New: IPC framework (lives in the shared `$/platform` tree, not a separate workspace):**

- `shared/platform/ipc/contracts.ts` — typed contract definitions
- `shared/platform/ipc/contracts.test-d.ts`
- `shared/platform/ipc/client.ts` — webview-side IPC client
- `shared/platform/ipc/client.test.ts`
- `shared/platform/ipc/server.ts` — main-side handler registration helper
- `shared/platform/ipc/server.test.ts`

**New: Migration generator:**

- `apps/desktop/scripts/gen-sqlite-migrations.ts` — Bun-runnable generator
- `apps/desktop/scripts/gen-sqlite-migrations.test.ts`
- `apps/desktop/scripts/check-sqlite-migrations.ts` — CI drift check
- `apps/desktop/sync/syncable-tables.ts` — `SYNCABLE_TABLES` manifest
- `apps/desktop/sync/syncable-tables.test.ts`
- `apps/desktop/migrations/` — committed generated SQLite migrations
- `apps/desktop/migrations/README.md`

  ⚠ The current `apps/desktop/vitest.config.ts` `include` glob is `["main/**/*.test.ts", "preload/**/*.test.ts"]`. Either widen it to cover `sync/**` and `scripts/**`, or relocate these tests under `main/` (and adjust the script paths accordingly) before authoring tests here — otherwise the suite will silently skip them.

**New: Bun-main services:**

- `apps/desktop/main/services/Sqlite.ts` — bun:sqlite handle + migration runner
- `apps/desktop/main/services/Sqlite.test.ts`
- `apps/desktop/main/services/DuckDb.ts` — native DuckDB connection management
- `apps/desktop/main/services/DuckDb.test.ts`
- `apps/desktop/main/services/FileSystemDatasetBlobStore.ts`
- `apps/desktop/main/services/FileSystemDatasetBlobStore.test.ts`
- `apps/desktop/main/services/Keychain.ts` — shellout wrapper around `/usr/bin/security`
- `apps/desktop/main/services/Keychain.test.ts` — pure-layer unit tests with mocked `Bun.spawn`
- `apps/desktop/main/services/Keychain.integration.test.ts` — gated `KEYCHAIN_E2E=1` round-trip against the real macOS keychain
- `apps/desktop/main/services/SupabaseRest.ts` — server-side fetch wrapper for sync (used in Phase 3)

**New: Main-side IPC handlers:**

- `apps/desktop/main/ipc/rdb.ts`
- `apps/desktop/main/ipc/duckdb.ts`
- `apps/desktop/main/ipc/dataset-blob.ts`
- `apps/desktop/main/ipc/auth.ts`
- `apps/desktop/main/ipc/api.ts` — ServerApi (Task 14)

**New: Platform helpers:**

- `apps/desktop/main/platform/userDataDir.ts`
- `apps/desktop/main/platform/userDataDir.test.ts`
- `apps/desktop/main/platform/network.ts`

**New: Webview-side desktop implementations:**

- `packages/shared/clients/src/SqliteCrudClient/createSqliteCrudClient.ts`
- `packages/shared/clients/src/SqliteCrudClient/createSqliteCrudClient.test.ts`
- `shared/platform/desktop/DesktopRdbClient.ts`
- `shared/platform/desktop/DesktopDuckDbClient.ts`
- `shared/platform/desktop/DesktopDatasetBlobStore.ts`
- `shared/platform/desktop/DesktopAuthProvider.ts`
- `shared/platform/desktop/*.test.ts` for each

**Pre-existing from Phase 1 (referenced by Phase 2, do not recreate):**

- `shared/platform/isDesktop.ts` + `shared/platform/isDesktop.test.ts`
- `shared/platform/types/{Platform,AuthProvider,DatasetBlobStore,DuckDbClient,RdbClient,ServerApiClient,SyncEngine}.types.ts` + `shared/platform/types/interfaces.test.ts`
- `shared/RdbCrudClient/createRdbCrudClient.ts` + `.test.ts` + `RdbCrudClient.types.ts`
- `packages/shared/clients/src/ServerApiClient/createIpcServerApiClient.ts` (Phase 1 throwing stub; Task 14 replaces the body)
- `packages/shared/clients/src/ServerApiClient/createServerApiClient.ts` (Phase 1 always-browser dispatch; Task 14 flips the desktop branch)
- `apps/desktop/main/index.ts`, `apps/desktop/preload/index.ts`, `apps/desktop/main/config/url.ts`, `apps/desktop/main/menu/setupApplicationMenu.ts`, `apps/desktop/electrobun.config.ts`, `apps/desktop/vitest.config.ts`

**Modified:**

- `apps/desktop/package.json` — add `duckdb` (bun:sqlite is built-in)
- `apps/desktop/vitest.config.ts` — widen `include` if Task 5/6 put tests outside `main/`
- `apps/desktop/main/index.ts` — register IPC handlers on startup
- `apps/desktop/preload/index.ts` — expose IPC bridge to webview (if needed beyond Electrobun's defaults)
- `packages/shared/clients/src/index.ts` — export `createSqliteCrudClient`
- `shared/RdbCrudClient/createRdbCrudClient.ts` — flip the desktop branch to `createSqliteCrudClient`
- `shared/RdbCrudClient/createRdbCrudClient.test.ts` — update the desktop-branch assertion (currently asserts Supabase fallback per Phase 1 Option A)
- `packages/shared/clients/src/ServerApiClient/createServerApiClient.ts` — flip the desktop branch to `createIpcServerApiClient` (Task 14)
- `packages/shared/clients/src/ServerApiClient/createIpcServerApiClient.ts` — replace the Phase 1 throwing stub with the real IPC implementation (Task 14)
- `package.json` (root) — add `gen:sqlite-migrations` and `check:sqlite-migrations` scripts
- Vite config — exclude `@duckdb/duckdb-wasm` from the bundle when `AVA_TARGET=desktop`

---

## Milestones

Phase 2 is too big to ship in one go. The 15 Tasks group into **6 milestones**. Every milestone is sized to:

1. **Leave the codebase consistent** — `pnpm test` green, `pnpm type-check` clean, `pnpm dev` (web) and `pnpm dev:desktop` both boot, no half-wired adapters left behind.
2. **Be reviewable** — a milestone is a coherent unit of work, not a grab-bag. Each constituent Task still ships per its own `**PR boundaries:**` block; the milestone is just the chunk you'd open a meta-issue for.

The hard ordering invariants (don't reorder these):

- Tasks 2 & 3 depend on Task 1's contract types.
- Task 6 (migration generator) depends on Task 5's `SYNCABLE_TABLES` manifest.
- Task 7's startup wiring depends on Task 6's generated `apps/desktop/migrations/*.sql`.
- Task 8's `createSqliteCrudClient` depends on Tasks 1-3 + 7.
- Task 8's **factory flip** (the moment desktop CRUD stops reading from Supabase) must ship _together with_ Task 9's snapshot bootstrap — otherwise the desktop reads from an empty SQLite and the UI goes blank.
- Tasks 10, 11, 12 each depend on Tasks 1-3 but are independent of each other.
- Task 13 (PlatformProvider) is the moment the Desktop\* adapters from 10/11/12 actually get consumed by React. Until Task 13, those adapters exist but idle.
- Task 14 depends on Task 11 (it reads the access token from AuthProvider).

### Milestone A — IPC framework (Tasks 1, 2, 3)

Lay the typed IPC primitives. Zero runtime consumers yet.

**Includes:**

- Task 1 — IPC contract definitions in `shared/platform/ipc/contracts.ts`
- Task 2 — `callIpc` webview client in `shared/platform/ipc/client.ts`
- Task 3 — `createIpcServer` Bun-main helper in `shared/platform/ipc/server.ts`

**Consistency at milestone end:**

- New files exist, type-level + unit tests pass.
- Nothing imports the new symbols yet — web is bit-for-bit identical, `pnpm dev:desktop` opens the same window it does today.

**Review surface:** small, mostly type-level; ~3 PRs.

---

### Milestone B — Desktop infrastructure scaffolding (Tasks 4, 5, 6)

Stand up the building blocks the SQLite path needs, _without_ wiring anything into startup.

**Includes:**

- Task 4 — `resolveUserDataDir` pure function in `apps/desktop/main/platform/userDataDir.ts`
- Task 5 — `SYNCABLE_TABLES` manifest in `apps/desktop/sync/syncable-tables.ts`
- Task 6 — Postgres→SQLite generator (`apps/desktop/scripts/gen-sqlite-migrations.ts`), first batch of generated `apps/desktop/migrations/*.sql`, and the `pnpm check:sqlite-migrations` CI drift check.

**Consistency at milestone end:**

- Generated migrations are committed but not yet applied at runtime (no runner exists yet).
- `pnpm check:sqlite-migrations` passes against the current Supabase schema.
- Desktop boots identically.

**Watch out for:**

- The current `apps/desktop/vitest.config.ts` only includes `main/**` and `preload/**`. Task 5/6 tests live under `apps/desktop/{sync,scripts}/` — widen the `include` glob (or relocate the tests under `main/`) before authoring, or the suite will silently skip them.
- Python `sqlglot>=22` becomes a developer-machine dependency; document it in `apps/desktop/migrations/README.md` (Task 6 Step 1 already covers this).

**Review surface:** 3-4 PRs; Task 6 is the heaviest because it ships a script + generated SQL + CI check.

---

### Milestone C — Local SQLite + CRUD live on desktop (Tasks 7, 8, 9)

The biggest milestone. After this lands, desktop CRUD reads from local SQLite, populated on first launch via a one-shot Supabase pull. Web is untouched.

**Includes:**

- Task 7 — `openSqliteDatabase` + migration runner; wired into `apps/desktop/main/index.ts` startup so launch creates `~/Library/Application Support/Avandar/metadata.sqlite` with every syncable table.
- Task 8 — RDB IPC handlers (`apps/desktop/main/ipc/rdb.ts`), `createSqliteCrudClient` in `packages/shared/clients/src/SqliteCrudClient/`, and the **flip** of `shared/RdbCrudClient/createRdbCrudClient.ts` so `isDesktop()` selects the SQLite backend.
- Task 9 — `SnapshotBootstrap` at `apps/desktop/main/services/SnapshotBootstrap.ts` that fills an empty local SQLite from Supabase REST before the webview opens.

**Hard internal ordering (within the milestone, across its PRs):**

1. Task 7 lands + wires startup → migrations apply, empty SQLite on disk.
2. Task 8 PRs 1-3 land (`rdb.ts`, `createSqliteCrudClient`, integration loopback test) — factory still routes desktop to Supabase, nothing breaks.
3. Task 9 lands → first-launch bootstrap populates SQLite from Supabase.
4. Task 8 PR 4 lands → factory flips; desktop CRUD now hits local SQLite, which is no longer empty.

If you ship the flip before the bootstrap, the desktop UI loads against an empty DB. Don't do that.

**Consistency at milestone end:**

- Cold-launch desktop hydrates SQLite from Supabase, then renders the UI from local data.
- Restart with network off still renders cached data (the headline Phase 2 deliverable).
- Web is unaffected because `isDesktop() === false`.
- `shared/RdbCrudClient/createRdbCrudClient.test.ts` is updated: the Phase 1 "Option A — falls through to Supabase on desktop" assertion becomes "desktop returns SQLite client".

**Review surface:** 6-8 PRs total. Largest of the six milestones; split aggressively.

---

### Milestone D — Native services in Bun main (Tasks 10, 11, 12)

Land the three remaining native subsystems. Each ships its Bun-main service + IPC handlers + desktop adapter, but the adapters are not yet _consumed_ by React (that's Milestone E).

**Includes:**

- Task 10 — Native DuckDB (`apps/desktop/main/services/DuckDb.ts`) + DuckDb IPC + `DesktopDuckDbClient` + (optional) drop `@duckdb/duckdb-wasm` from desktop bundle.
- Task 11 — Keychain (`apps/desktop/main/services/Keychain.ts`) + auth IPC + `DesktopAuthProvider`. Implementation is a thin shellout to `/usr/bin/security` with the secret fed via child stdin (never argv). FFI to `Security.framework` is explicitly out of scope: the call frequency (~1 read at boot, ~1 write per access-token refresh) doesn't justify the marshaling complexity or the deprecation curve on the relevant C symbols.
- Task 12 — `FileSystemDatasetBlobStore` + dataset-blob IPC + `DesktopDatasetBlobStore`.

**Consistency at milestone end:**

- Bun main starts SQLite (from C), DuckDB, Keychain, and the blob store on launch. Each must boot without throwing — a single failed `dlopen`, missing path, or missing `/usr/bin/security` takes the app down.
- The Desktop\* adapters exist on disk but no React code imports them yet, so the webview behavior is unchanged.
- Tests pass for each service. Manual smoke tests at each Task's checkpoint confirm startup boots cleanly.

**Watch out for:**

- Tasks 10, 11, 12 are independent of each other — order them by risk: do whichever blocks first. With FFI off the table, Task 11 is roughly as risky as Task 12 — both are subprocess/filesystem plumbing. DuckDB (Task 10) carries slightly more risk because of the `duckdb` Node binding under Bun (now resolved on macOS — see commit history) and any future arch surprises.
- Each task's PR 1 lands the service in isolation, PR 2 wires it into `apps/desktop/main/index.ts`. After each PR 2 lands, do `pnpm dev:desktop` and confirm the app still boots — startup is now doing strictly more work and any of these services can break it.

**Review surface:** 6-9 PRs across the three Tasks. They can land in parallel.

---

### Milestone E — Wire desktop into React (Tasks 13, 14)

The "make it real" milestone. Introduce `PlatformProvider`, migrate consumers to `usePlatform()`, and route ServerApi (Supabase RPCs + Edge Functions) through Bun main.

**Includes:**

- Task 13 — `PlatformProvider` + `usePlatform()` hook in `src/config/platform/` (NOT `packages/web/hooks/` — the web adapters need to import from `src/` where the existing concrete classes live; this is called out in Task 13 Step 1's note). Migrate `DuckDbClient.getInstance()`, direct `AvaSupabase` auth calls, and Dexie `LocalDataset` accesses to `usePlatform().*` in batches.
- Task 14 — `apps/desktop/main/ipc/api.ts` Bun-main handler, real implementation in `packages/shared/clients/src/ServerApiClient/createIpcServerApiClient.ts` (replaces the Phase 1 throwing stub), and the flip of `createServerApiClient.ts`'s desktop branch.

**Consistency at milestone end:**

- Desktop runs the full happy path on a cold `userDataDir`: sign in → snapshot bootstrap → list workspaces → run a query → upload a CSV → quit → relaunch → state survives.
- Single network-egress invariant holds: every Supabase call from the desktop webview is visible in Bun-main logs.
- Web shell (`pnpm dev`) still works — gate everything behind `isDesktop()`.

**Review surface:** 5-7 PRs (Task 13's PR-by-adapter split + Task 14's 2 PRs).

---

### Milestone F — Phase 2 acceptance (Task 15)

Verification + spec annotation. Doc-only edits to mark Phase 2 complete in the design spec. No code changes.

**Consistency at milestone end:** trivially consistent — nothing in code changed.

**Review surface:** 1 PR.

---

### Milestone summary table

| Milestone                  | Tasks      | Approx. PRs | Risk                                                     | After this, desktop behavior…                                   |
| -------------------------- | ---------- | ----------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| A — IPC framework          | 1, 2, 3    | ~3          | Low                                                      | unchanged                                                       |
| B — Infra scaffolding      | 4, 5, 6    | ~3-4        | Low                                                      | unchanged                                                       |
| C — SQLite live            | 7, 8, 9    | ~6-8        | **High** (factory flip + bootstrap must land coherently) | reads from local SQLite, hydrated from Supabase on first launch |
| D — Native services        | 10, 11, 12 | ~6-9        | Medium (each service can break startup)                  | unchanged (adapters idle)                                       |
| E — Wire React + ServerApi | 13, 14     | ~5-7        | Medium-High (broad consumer migration)                   | uses all native services end-to-end                             |
| F — Acceptance             | 15         | 1           | None                                                     | unchanged                                                       |

---

## Task 1: IPC Contracts Framework

**Test groupings:** G2.1 (IPC contracts parity — type-level guard against drift between contract **request/**response and handler signatures registered in Tasks 8/10/11/12/14).

**PR boundaries:** 2 PRs.

- PR 1: Type-level contract definitions for all six handler groups (RdbContracts, DuckDbContracts, AuthContracts, DatasetBlobContracts, ServerApiContracts plus the loopback helper) — type-only, no runtime cost, nothing imports them yet.
- PR 2: Tests for the contracts framework — asserts currently-passing type-level behavior; safe to land independently.
- (Or 1 combined PR if the Steps fold tests and contracts together in a TDD pair.)

A small, typed RPC abstraction that lives under `shared/platform/ipc/` (alias `$/platform/ipc/...`) and is consumed by both sides. Each contract is `{ name, request, response }` and the registration helper enforces type matching.

**Files:**

- Create: `shared/platform/ipc/contracts.ts`
- Test: `shared/platform/ipc/contracts.test-d.ts`

- [ ] **Step 1: Write the failing type test**

Create `shared/platform/ipc/contracts.test-d.ts`:

```ts
import { expectTypeOf, test } from "vitest";
import { defineIpcContract } from "./contracts.ts";
import type { IpcContract } from "./contracts.ts";

test("defineIpcContract returns a typed contract handle", () => {
  const contract = defineIpcContract<
    { rowId: string },
    { row: { id: string; name: string } | null }
  >("rdb.getById");

  expectTypeOf(contract).toMatchTypeOf<IpcContract<unknown, unknown>>();
  expectTypeOf(contract.name).toEqualTypeOf<string>();
  expectTypeOf<
    Parameters<typeof contract.parseRequest>[0]
  >().toEqualTypeOf<unknown>();
});

test("IpcContract preserves request/response types", () => {
  type Req = { sql: string; params: ReadonlyArray<unknown> };
  type Res = { rows: ReadonlyArray<Record<string, unknown>> };
  const contract: IpcContract<Req, Res> = defineIpcContract<Req, Res>(
    "rdb.run",
  );

  expectTypeOf<typeof contract.__request>().toEqualTypeOf<Req>();
  expectTypeOf<typeof contract.__response>().toEqualTypeOf<Res>();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
pnpm test:frontend
```

Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement `defineIpcContract`**

Create `shared/platform/ipc/contracts.ts`:

```ts
/**
 * A typed IPC contract. The `__request` / `__response` phantom fields exist
 * only at compile time to thread types from declaration to call site.
 */
export type IpcContract<TRequest, TResponse> = {
  readonly name: string;
  readonly parseRequest: (raw: unknown) => TRequest;
  readonly parseResponse: (raw: unknown) => TResponse;
  readonly __request: TRequest;
  readonly __response: TResponse;
};

export function defineIpcContract<TRequest, TResponse>(
  name: string,
): IpcContract<TRequest, TResponse> {
  return {
    name,
    parseRequest: (raw: unknown): TRequest => raw as TRequest,
    parseResponse: (raw: unknown): TResponse => raw as TResponse,
    __request: undefined as unknown as TRequest,
    __response: undefined as unknown as TResponse,
  };
}
```

Note: `parseRequest`/`parseResponse` are intentionally identity casts in Phase 2. If runtime validation becomes necessary (it shouldn't if both sides ship together), drop in `zod` validators — the call sites won't change.

- [ ] **Step 4: Run the test and confirm it passes**

```bash
pnpm test:frontend
```

Expected: green.

- [ ] **Step 5: Define every contract used in Phase 2**

Append to `shared/platform/ipc/contracts.ts`:

```ts
// ─────────────────────────────────────────────────────────────────────────
// Concrete contracts
// ─────────────────────────────────────────────────────────────────────────

// RDB (SQLite via bun:sqlite in Bun main)
export const RdbContracts = {
  run: defineIpcContract<
    { readonly sql: string; readonly params: ReadonlyArray<unknown> },
    { readonly changes: number; readonly lastInsertRowid: number }
  >("rdb.run"),
  query: defineIpcContract<
    { readonly sql: string; readonly params: ReadonlyArray<unknown> },
    { readonly rows: ReadonlyArray<Record<string, unknown>> }
  >("rdb.query"),
  transaction: defineIpcContract<
    {
      readonly statements: ReadonlyArray<{
        readonly sql: string;
        readonly params: ReadonlyArray<unknown>;
      }>;
    },
    { readonly results: ReadonlyArray<{ readonly changes: number }> }
  >("rdb.transaction"),
};

// DuckDB (native, via the existing `duckdb` Node binding)
export const DuckDbContracts = {
  runRawQuery: defineIpcContract<
    { readonly sql: string; readonly params: ReadonlyArray<unknown> },
    { readonly rows: ReadonlyArray<Record<string, unknown>> }
  >("duckdb.runRawQuery"),
  loadParquetFromDatasetBlobStore: defineIpcContract<
    { readonly datasetId: string },
    { readonly tableName: string }
  >("duckdb.loadParquetFromDatasetBlobStore"),
  loadFromSourcePath: defineIpcContract<
    {
      readonly sourcePath: string;
      readonly datasetId: string;
      readonly format: "csv" | "xlsx" | "parquet";
    },
    {
      readonly datasetId: string;
      readonly rowCount: number;
      readonly parquetBlobKey: string;
    }
  >("duckdb.loadFromSourcePath"),
};

// DatasetBlobStore (filesystem)
export const DatasetBlobContracts = {
  put: defineIpcContract<
    { readonly key: string; readonly bytesBase64: string },
    { readonly bytesWritten: number }
  >("datasetBlob.put"),
  get: defineIpcContract<
    { readonly key: string },
    { readonly bytesBase64: string }
  >("datasetBlob.get"),
  delete: defineIpcContract<
    { readonly key: string },
    { readonly deleted: boolean }
  >("datasetBlob.delete"),
  exists: defineIpcContract<
    { readonly key: string },
    { readonly exists: boolean }
  >("datasetBlob.exists"),
  list: defineIpcContract<
    { readonly prefix: string },
    { readonly keys: ReadonlyArray<string> }
  >("datasetBlob.list"),
  stat: defineIpcContract<
    { readonly key: string },
    {
      readonly stat: {
        readonly sizeBytes: number;
        readonly mtimeMs: number;
      } | null;
    }
  >("datasetBlob.stat"),
};

// Auth
export const AuthContracts = {
  signIn: defineIpcContract<
    { readonly email: string; readonly password: string },
    {
      readonly userId: string;
      readonly email: string;
      readonly accessToken: string;
      readonly accessTokenExpiresAt: number;
    }
  >("auth.signIn"),
  signOut: defineIpcContract<Record<string, never>, { readonly ok: true }>(
    "auth.signOut",
  ),
  getSession: defineIpcContract<
    Record<string, never>,
    {
      readonly session: {
        readonly userId: string;
        readonly email: string;
        readonly accessToken: string;
        readonly accessTokenExpiresAt: number;
        readonly mode: "online" | "offline-cached";
      } | null;
    }
  >("auth.getSession"),
  refreshIfNeeded: defineIpcContract<
    Record<string, never>,
    { readonly refreshed: boolean }
  >("auth.refreshIfNeeded"),
};

// ServerApi (Supabase RPCs + Edge Functions, routed through Bun main)
// Inner request/response types are checked by the typed `ServerApiClient`
// interface in @avandar/clients; the IPC layer here is intentionally loose
// (unknown in / unknown out) so contracts don't have to re-encode every RPC.
export const ServerApiContracts = {
  rpc: defineIpcContract<
    { readonly name: string; readonly args: unknown },
    unknown
  >("serverApi.rpc"),
  invokeFunction: defineIpcContract<
    {
      readonly route: string;
      readonly method: string;
      readonly pathParams?: Record<string, string | number>;
      readonly queryParams?: Record<string, unknown>;
      readonly body?: unknown;
    },
    { readonly data: unknown; readonly status: number }
  >("serverApi.invokeFunction"),
};
```

**Note on bytes-as-base64:** Electrobun's stdin/stdout IPC layer transports strings. Large blobs over base64 add ~33% overhead. For files >50MB consider chunking. The contracts above keep things simple for V1; Phase 3 may add a streaming variant if profiles show pressure.

- [ ] **Step 6: Export from the platform index**

Edit `shared/platform/index.ts`, add:

```ts
export {
  defineIpcContract,
  RdbContracts,
  DuckDbContracts,
  DatasetBlobContracts,
  AuthContracts,
  ServerApiContracts,
} from "./ipc/contracts.ts";
export type { IpcContract } from "./ipc/contracts.ts";
```

- [ ] **Step 7: Type-check**

```bash
pnpm type-check
```

Expected: green.

- [ ] **Step 8: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm test:frontend
  pnpm type-check
  ```

  Expected: tests pass, type-check exits clean.

  **Verify:**
  - `shared/platform/ipc/contracts.ts` exists with the `defineIpcContract` / `IpcContract` exports.
  - `shared/platform/ipc/contracts.test-d.ts` covers both the type-test and the runtime sanity checks.
  - All Phase 2 contracts (rdb._, duckdb._, auth._, dataset-blob._, serverApi.\*) are declared in the contracts module with the request/response shapes the spec calls for.
  - Public surface is re-exported from `shared/platform/index.ts`.
  - Test groupings G2.1 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test:** none yet — there's no runtime path to exercise until the client/server land in Tasks 2/3 (and a real handler in Task 8). Defer end-to-end smoke until then.

  **Greenlight criteria:** unit + type tests pass and the contract module compiles cleanly across the monorepo before moving to Task 2.

---

## Task 2: IPC Client (webview side)

**Test groupings:** G2.2 (IPC client unit — happy path, error reply, concurrent calls to same channel matched by id, bridge-missing throws, 5s timeout fires; the concurrency case will likely surface a bug in the once-listener pattern).

**PR boundaries:** 1 PR. TDD red-green over the IPC client — failing tests and implementation must ship together, and the module is only consumed by desktop callers added in later tasks so web is unaffected.

Webview-side client that calls a contract over Electrobun's IPC bridge and returns a Promise.

**Files:**

- Create: `shared/platform/ipc/client.ts`
- Test: `shared/platform/ipc/client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/platform/ipc/client.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __setIpcBridgeForTests, callIpc } from "./client.ts";
import { defineIpcContract } from "./contracts.ts";

describe("callIpc", () => {
  const sendMock = vi.fn();
  const onceMock = vi.fn();

  beforeEach(() => {
    __setIpcBridgeForTests({ send: sendMock, once: onceMock });
  });

  afterEach(() => {
    sendMock.mockReset();
    onceMock.mockReset();
  });

  it("sends a request with a unique id and resolves with the response", async () => {
    const contract = defineIpcContract<{ a: number }, { b: number }>(
      "test.echo",
    );

    onceMock.mockImplementation(
      (channel: string, cb: (msg: unknown) => void) => {
        // Simulate the server replying on the response channel
        Promise.resolve().then(() =>
          cb({
            id: (sendMock.mock.calls[0]?.[1] as { id: string }).id,
            ok: true,
            result: { b: 42 },
          }),
        );
      },
    );

    const result = await callIpc(contract, { a: 1 });
    expect(sendMock).toHaveBeenCalledOnce();
    expect(result).toEqual({ b: 42 });
  });

  it("rejects when the server responds with ok: false", async () => {
    const contract = defineIpcContract<Record<string, never>, { ok: true }>(
      "test.fails",
    );

    onceMock.mockImplementation(
      (channel: string, cb: (msg: unknown) => void) => {
        Promise.resolve().then(() =>
          cb({
            id: (sendMock.mock.calls[0]?.[1] as { id: string }).id,
            ok: false,
            error: "boom",
          }),
        );
      },
    );

    await expect(callIpc(contract, {})).rejects.toThrow(/boom/);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
pnpm test:frontend
```

Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement the client**

Create `shared/platform/ipc/client.ts`:

```ts
import type { IpcContract } from "./contracts.ts";

type IpcBridge = {
  readonly send: (channel: string, message: unknown) => void;
  readonly once: (
    channel: string,
    callback: (message: unknown) => void,
  ) => void;
};

let bridge: IpcBridge | null = null;

function getBridge(): IpcBridge {
  if (bridge) return bridge;
  const electrobun = (globalThis as unknown as { electrobun?: IpcBridge })
    .electrobun;
  if (!electrobun) {
    throw new Error(
      "Electrobun IPC bridge not available — callIpc may only be used inside the desktop webview",
    );
  }
  bridge = electrobun;
  return bridge;
}

/** Test-only injection point. Do not call from app code. */
export function __setIpcBridgeForTests(b: IpcBridge | null): void {
  bridge = b;
}

let nextRequestId = 1;
function makeRequestId(): string {
  return `${Date.now()}-${nextRequestId++}`;
}

export async function callIpc<TRequest, TResponse>(
  contract: IpcContract<TRequest, TResponse>,
  request: TRequest,
): Promise<TResponse> {
  const b = getBridge();
  const id = makeRequestId();

  return new Promise<TResponse>((resolve, reject) => {
    b.once(`${contract.name}.reply`, (raw: unknown) => {
      const msg = raw as {
        id: string;
        ok: boolean;
        result?: unknown;
        error?: string;
      };
      if (msg.id !== id) {
        // Not our reply — re-register (the harness guarantees one reply per id;
        // mismatch indicates a bug)
        reject(new Error(`IPC reply id mismatch on ${contract.name}`));
        return;
      }
      if (msg.ok) {
        resolve(contract.parseResponse(msg.result));
      } else {
        reject(new Error(msg.error ?? `${contract.name} failed`));
      }
    });
    b.send(contract.name, { id, payload: request });
  });
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
pnpm test:frontend
```

Expected: green.

- [ ] **Step 5: Export from the platform index**

Edit `shared/platform/index.ts`:

```ts
export { callIpc, __setIpcBridgeForTests } from "./ipc/client.ts";
```

- [ ] **Step 6: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm test:frontend
  pnpm type-check
  ```

  Expected: client unit tests pass (including the bridge-injection cases), type-check clean.

  **Verify:**
  - `shared/platform/ipc/client.ts` exports `callIpc` plus the test-injection seam `__setIpcBridgeForTests`.
  - The client serialises a contract call into the expected Electrobun bridge shape and rejects on error responses.
  - `shared/platform/index.ts` re-exports the new symbols.
  - Request/response types flow through from `defineIpcContract` so callers get inferred typings.
  - Test groupings G2.2 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test:** none yet — `callIpc` still has nothing real to talk to (server lands in Task 3, first usable handler in Task 8). Defer end-to-end smoke until then.

  **Greenlight criteria:** client tests + type-check are green and the test-injection seam works before moving to Task 3.

---

## Task 3: IPC Server (Bun-main side)

**Test groupings:** G2.3 (IPC server unit — dispatch, handler-throw → error reply, unknown channel); G2.4 (IPC loopback integration — round-trip a real contract via paired fake transport; symmetry guard against channel-name typos).

**PR boundaries:** 1 PR. TDD red-green; lives only in `apps/desktop/main` so web bundles are untouched.

Helper for registering typed handlers in Bun main. Same shape on the other side of the wire.

**Files:**

- Create: `shared/platform/ipc/server.ts`
- Test: `shared/platform/ipc/server.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/platform/ipc/server.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { defineIpcContract } from "./contracts.ts";
import { createIpcServer } from "./server.ts";

describe("createIpcServer", () => {
  it("dispatches a registered handler and replies with the result", async () => {
    const send = vi.fn();
    const onMessageHandlers: Record<string, (msg: unknown) => void> = {};
    const transport = {
      on: (channel: string, cb: (msg: unknown) => void) => {
        onMessageHandlers[channel] = cb;
      },
      send,
    };
    const server = createIpcServer(transport);

    const contract = defineIpcContract<{ a: number }, { b: number }>(
      "test.double",
    );
    server.handle(contract, async (req) => ({ b: req.a * 2 }));

    onMessageHandlers["test.double"]({ id: "x1", payload: { a: 5 } });
    await new Promise((r) => setTimeout(r, 0));

    expect(send).toHaveBeenCalledWith("test.double.reply", {
      id: "x1",
      ok: true,
      result: { b: 10 },
    });
  });

  it("replies with ok: false when the handler throws", async () => {
    const send = vi.fn();
    const onMessageHandlers: Record<string, (msg: unknown) => void> = {};
    const transport = {
      on: (channel: string, cb: (msg: unknown) => void) => {
        onMessageHandlers[channel] = cb;
      },
      send,
    };
    const server = createIpcServer(transport);

    const contract = defineIpcContract<Record<string, never>, { ok: true }>(
      "test.boom",
    );
    server.handle(contract, async () => {
      throw new Error("nope");
    });

    onMessageHandlers["test.boom"]({ id: "x2", payload: {} });
    await new Promise((r) => setTimeout(r, 0));

    expect(send).toHaveBeenCalledWith("test.boom.reply", {
      id: "x2",
      ok: false,
      error: "nope",
    });
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
pnpm test:frontend
```

Expected: FAIL.

- [ ] **Step 3: Implement the server**

Create `shared/platform/ipc/server.ts`:

```ts
import type { IpcContract } from "./contracts.ts";

export type IpcTransport = {
  readonly on: (channel: string, callback: (message: unknown) => void) => void;
  readonly send: (channel: string, message: unknown) => void;
};

export type IpcServer = {
  handle<TRequest, TResponse>(
    contract: IpcContract<TRequest, TResponse>,
    handler: (request: TRequest) => Promise<TResponse> | TResponse,
  ): void;
};

export function createIpcServer(transport: IpcTransport): IpcServer {
  return {
    handle(contract, handler) {
      transport.on(contract.name, async (raw) => {
        const msg = raw as { id: string; payload: unknown };
        const replyChannel = `${contract.name}.reply`;
        try {
          const result = await handler(contract.parseRequest(msg.payload));
          transport.send(replyChannel, { id: msg.id, ok: true, result });
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          transport.send(replyChannel, { id: msg.id, ok: false, error });
        }
      });
    },
  };
}
```

- [ ] **Step 4: Run tests and confirm pass**

```bash
pnpm test:frontend
```

Expected: green.

- [ ] **Step 5: Export from platform index**

```ts
export { createIpcServer } from "./ipc/server.ts";
export type { IpcServer, IpcTransport } from "./ipc/server.ts";
```

- [ ] **Step 6: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm test:frontend
  pnpm type-check
  ```

  Expected: server unit tests pass, type-check clean.

  **Verify:**
  - `shared/platform/ipc/server.ts` exports `createIpcServer`, the `IpcServer` type, and the `IpcTransport` shape it expects from Electrobun.
  - Registering a handler for a contract narrows request/response types correctly (mirror of the client side).
  - Errors thrown inside a handler are serialised, not crashed; the test covers this.
  - Re-export wired up in `shared/platform/index.ts`.
  - Test groupings G2.3, G2.4 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test:** none yet — exercising the server requires a real transport, which Tasks 7/8 deliver. A trivial loopback round-trip (fake transport that pipes client → server in-process) is acceptable here if you want extra confidence; otherwise defer.

  **Greenlight criteria:** server tests + type-check pass and contract types stay symmetric between client and server before moving to Task 4.

---

## Task 4: `userDataDir` resolver

**Test groupings:** G2.5 (userDataDir resolver across platform fixtures — darwin, win32 happy, win32 with spaces, win32 missing APPDATA, linux throws; uses path/win32 to lock Windows behavior even on macOS CI).

**PR boundaries:** 1 PR. TDD red-green; pure function in `apps/desktop/main` with no web consumers.

Pure function returning the per-OS-user app data directory. Used by every native service.

**Files:**

- Create: `apps/desktop/main/platform/userDataDir.ts`
- Test: `apps/desktop/main/platform/userDataDir.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/main/platform/userDataDir.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveUserDataDir } from "./userDataDir.ts";

describe("resolveUserDataDir", () => {
  it("returns the macOS Application Support path on darwin", () => {
    const result = resolveUserDataDir({
      platform: "darwin",
      home: "/Users/pablo",
      appdata: undefined,
    });
    expect(result).toBe("/Users/pablo/Library/Application Support/Avandar");
  });

  it("returns the APPDATA path on win32", () => {
    const result = resolveUserDataDir({
      platform: "win32",
      home: "C:/Users/pablo",
      appdata: "C:/Users/pablo/AppData/Roaming",
    });
    expect(result).toBe("C:/Users/pablo/AppData/Roaming/Avandar");
  });

  it("throws on unsupported platforms", () => {
    expect(() =>
      resolveUserDataDir({
        platform: "linux",
        home: "/home/pablo",
        appdata: undefined,
      }),
    ).toThrow(/unsupported platform/i);
  });

  it("throws on win32 when APPDATA is missing", () => {
    expect(() =>
      resolveUserDataDir({
        platform: "win32",
        home: "C:/Users/pablo",
        appdata: undefined,
      }),
    ).toThrow(/APPDATA required/);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/desktop test
```

Expected: FAIL.

- [ ] **Step 3: Implement `resolveUserDataDir`**

Create `apps/desktop/main/platform/userDataDir.ts`:

```ts
export type ResolveUserDataDirArgs = {
  readonly platform: NodeJS.Platform | string;
  readonly home: string;
  readonly appdata: string | undefined;
};

const APP_NAME = "Avandar";

export function resolveUserDataDir(args: ResolveUserDataDirArgs): string {
  if (args.platform === "darwin") {
    return `${args.home}/Library/Application Support/${APP_NAME}`;
  }
  if (args.platform === "win32") {
    if (!args.appdata) throw new Error("APPDATA required on win32");
    return `${args.appdata}/${APP_NAME}`;
  }
  throw new Error(`unsupported platform: ${args.platform}`);
}

/** Convenience for runtime callers. */
export function getUserDataDir(): string {
  return resolveUserDataDir({
    platform: process.platform,
    home: process.env.HOME ?? process.env.USERPROFILE ?? "",
    appdata: process.env.APPDATA,
  });
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
pnpm --filter @avandar/desktop test
```

Expected: green.

- [ ] **Step 5: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm --filter @avandar/desktop test
  pnpm --filter @avandar/desktop type-check
  ```

  Expected: path-resolution tests pass on all stubbed platforms (darwin/win32/linux), type-check clean.

  **Verify:**
  - `apps/desktop/main/platform/userDataDir.ts` exports `resolveUserDataDir` and is a pure function over `(platform, env, homedir)` — no side effects at import time.
  - macOS branch returns `<home>/Library/Application Support/Avandar`.
  - Windows branch returns the `%APPDATA%\Avandar` equivalent (even though Phase 5 ships it, the resolver should already be correct).
  - Linux branch honours `$XDG_DATA_HOME` with the documented fallback.
  - Test file covers each branch with injected inputs.
  - Test groupings G2.5 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test (desktop app — `pnpm dev:desktop`):**
  1. Add a one-line `console.log("[userDataDir]", resolveUserDataDir(...))` near app startup (temporary, revert before moving on).
  2. Launch the app on macOS.
  3. Confirm the logged path is exactly `~/Library/Application Support/Avandar`.
  4. Quit and revert the temporary log line.

  Expected: the printed path matches the macOS branch verbatim; no exceptions during startup.

  **Greenlight criteria:** unit tests pass and the resolved path matches the macOS spec on a real launch before moving to Task 5.

---

## Task 5: `SYNCABLE_TABLES` manifest

**Test groupings:** G2.6 (SYNCABLE_TABLES manifest vs live Supabase schema — every CREATE TABLE in supabase/migrations/\*.sql is in SYNCABLE_TABLES ∪ EXCLUDED_TABLES; automates the human check in this task).

**PR boundaries:** 1 PR (could be split to 2). The manifest is pure data with no runtime consumers yet, and the parity test asserts a currently-true property — small enough to land together. If preferred, ship the manifest first and the parity test second.

The single source of truth for which Supabase tables get mirrored to SQLite. Listed manually; tested for shape.

**Files:**

- Create: `apps/desktop/sync/syncable-tables.ts`
- Test: `apps/desktop/sync/syncable-tables.test.ts`

- [ ] **Step 1: Identify the initial set of syncable tables**

From the spec: V1 syncs user-owned artifacts. Read the existing Supabase migrations:

```bash
ls supabase/migrations/
git grep "create table" -- supabase/migrations/ | head -50
```

Enumerate the tables that hold user-owned artifacts: at minimum `datasets`, `dataset_versions`, `dashboards`, `saved_queries`, `entity_configs`, `user_profiles`, `workspace_memberships`, plus any other tables whose rows are exclusively a single user's personal data (consult `AGENTS.md` and the `src/clients/` directory for the canonical list).

If unclear which tables are user-owned vs shared, default to the conservative _small_ set (only what's clearly personal) — the spec's manifest-driven generator will fail loudly on the next new table, forcing a per-table decision rather than silent drift.

- [ ] **Step 2: Write the manifest**

Create `apps/desktop/sync/syncable-tables.ts`:

```ts
/**
 * Source of truth for which Supabase tables get mirrored to local SQLite on
 * desktop. Any Postgres migration touching a table not listed here will be
 * rejected by the SQLite migration generator unless that table is explicitly
 * excluded below.
 *
 * Edit this file when adding a new syncable artifact type. Coordinate with
 * the Phase 3 sync engine; new tables typically also need per-row sync
 * columns appended via a migration.
 */
export const SYNCABLE_TABLES = [
  "datasets",
  "dataset_versions",
  "dashboards",
  "saved_queries",
  "entity_configs",
  "user_profiles",
  "workspace_memberships",
  // Add more as user-owned-artifact tables come online.
] as const;

export type SyncableTable = (typeof SYNCABLE_TABLES)[number];

/**
 * Tables we intentionally do NOT sync to SQLite. Listed explicitly so the
 * migration generator can distinguish "unhandled new table" from "deliberately
 * excluded".
 */
export const EXCLUDED_TABLES = [
  // collaborative state, audit logs, server-side queue tables, etc.
  // Example placeholders (replace with actual table names from the schema):
  "audit_log",
  "background_jobs",
] as const;

export function isSyncable(tableName: string): boolean {
  return (SYNCABLE_TABLES as ReadonlyArray<string>).includes(tableName);
}

export function isExcluded(tableName: string): boolean {
  return (EXCLUDED_TABLES as ReadonlyArray<string>).includes(tableName);
}
```

Replace the example placeholders (`audit_log`, `background_jobs`) with whatever your schema actually exposes. If there are no clear excludable tables yet, leave `EXCLUDED_TABLES` empty — every unknown table will then force an explicit decision the first time the generator encounters it.

- [ ] **Step 3: Write the manifest test**

Create `apps/desktop/sync/syncable-tables.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  EXCLUDED_TABLES,
  isExcluded,
  isSyncable,
  SYNCABLE_TABLES,
} from "./syncable-tables.ts";

describe("syncable-tables manifest", () => {
  it("contains no duplicates", () => {
    expect(new Set(SYNCABLE_TABLES).size).toBe(SYNCABLE_TABLES.length);
    expect(new Set(EXCLUDED_TABLES).size).toBe(EXCLUDED_TABLES.length);
  });

  it("does not list the same table in both lists", () => {
    const overlap = SYNCABLE_TABLES.filter((t) =>
      (EXCLUDED_TABLES as ReadonlyArray<string>).includes(t),
    );
    expect(overlap).toEqual([]);
  });

  it("isSyncable / isExcluded reflect membership", () => {
    expect(isSyncable("datasets")).toBe(true);
    expect(isSyncable("not_a_real_table_xyz")).toBe(false);
    if (EXCLUDED_TABLES.length > 0) {
      expect(isExcluded(EXCLUDED_TABLES[0]!)).toBe(true);
    }
  });
});
```

- [ ] **Step 4: Run the test and confirm pass**

```bash
pnpm --filter @avandar/desktop test
```

Expected: green.

- [ ] **Step 5: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm --filter @avandar/desktop test
  pnpm --filter @avandar/desktop type-check
  ```

  Expected: manifest shape tests pass, type-check clean.

  **Verify:**
  - `apps/desktop/sync/syncable-tables.ts` exports a `readonly`-typed `SYNCABLE_TABLES` tuple/record matching the Phase 2 spec intent (user-owned artifacts only — no auth, no system tables, no Phase 3-only artifacts).
  - The list lines up with the actual table names in `supabase/migrations/*.sql` (no typos, no missing tables, no tables that don't exist).
  - Each entry carries whatever metadata downstream tasks expect (table name, primary key, etc.) — confirm by cross-referencing how Task 6 (generator) and Task 9 (bootstrap) consume it.
  - Tests assert the shape (e.g. unique table names, primary keys present) rather than the literal list.
  - Test groupings G2.6 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test:** none — manifest is a static constant with no runtime behaviour of its own. Real validation happens when Task 6 generates migrations and Task 9 reads from these tables.

  **Greenlight criteria:** manifest tests pass and the table list has been reviewed against the live Supabase schema before moving to Task 6.

---

## Task 6: Postgres → SQLite migration generator

**Test groupings:** G2.7 (PG→SQLite generator fixture+golden snapshots — uuid→text, timestamptz→expected, RLS stripped, unknown table errors, idempotency; replaces the manual spot-check review step).

**PR boundaries:** 2-3 PRs.

- PR 1: Scaffold the generator script with fixtures and golden tests; no generated SQLite migrations committed yet — script-only.
- PR 2: Commit the first generated SQLite migration files plus the CI drift-check workflow (`pnpm check:sqlite-migrations`); files are unread until Task 7 wires the runner.
- PR 3 (optional): Generator's hard-error / warning behavior on unknown PG constructs, if implemented as a separate Step.

**Approach (post-Phase 2 implementation): classify-and-filter, schema-shape only.**

Per-file generation of one `.gen.sql` per Postgres migration, but every statement runs through a classifier first. Only schema-shape statements (CREATE/ALTER/DROP TABLE, CREATE/DROP INDEX) end up in the SQLite output. RLS policies, GRANT/REVOKE, functions, triggers, types, COMMENTs, SETs, and data-mutation statements (UPDATE/INSERT/DELETE/DO blocks) are silently dropped because SQLite has no equivalent for any of them.

**Foreign-key handling.** FKs are preserved when their target table is in `SYNCABLE_TABLES`; SQLite enforces them natively when the Bun-main runner sets `PRAGMA foreign_keys = ON`. Two flavours are handled differently:

- _Inline_ FK references (`REFERENCES <table>(<col>)` inside a `CREATE TABLE` column or table-level clause) are emitted verbatim and SQLite accepts them as-is.
- _Standalone_ `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` statements are surfaced via a yellow `⚠ needs hand-edit` warning at the end of the run because SQLite's `ALTER TABLE` only supports `RENAME`/`ADD COLUMN`/`DROP COLUMN`. Same hand-edit treatment applies to `ALTER COLUMN` (type change, set/drop default, set/drop NOT NULL) and any other `ADD CONSTRAINT` (CHECK, PK, UNIQUE). The developer inlines the constraint into the matching `CREATE TABLE` in the earlier `.gen.sql`.
- FKs pointing at a non-public schema (e.g. `references auth.users`) or at an `EXCLUDED_TABLES` entry are dropped (the target table does not exist locally).

**Tool chain.** Shells out to Python's `sqlglot` (Postgres → SQLite transpile) via `uv run --with 'sqlglot>=26.0.0,<27.0.0' python -c "..."`. `uv` (https://astral.sh/uv) is the only developer-machine prerequisite; it manages Python + sqlglot on demand with no `pip install` step. The exact sqlglot version range lives in the `SQLGLOT_SPEC` constant at the top of the generator. `sqlglot` is never an npm dependency and never reaches the runtime bundle. Post-transpile, a small `_stripPostgresIsms` step strips residue sqlglot leaves behind that SQLite still cannot parse: `"public".` schema prefixes, `NOT VALID`, `USING btree`, `NULLS FIRST`/`LAST` inside index defs, `ARRAY<T>` (collapsed to `TEXT`), `ADD COLUMN IF NOT EXISTS` (→ `ADD COLUMN`), and `DEFAULT <fn>(...)` clauses whose function does not exist on SQLite (`UUID()`, `auth.uid()`, etc.).

Hard-errors on uncategorised tables and on unrecognised leading keywords; first lists each unhandled statement with a reason hint so the engineer knows whether to extend `classifyStatement()` or the manifest.

**Files:**

- Create: `apps/desktop/scripts/gen-sqlite-migrations.ts`
- Test: `apps/desktop/scripts/gen-sqlite-migrations.test.ts`
- Create: `apps/desktop/scripts/check-sqlite-migrations.ts`
- Create: `apps/desktop/migrations/README.md`
- Modify: `package.json` (root)

- [ ] **Step 1: Document the Python dependency**

Create `apps/desktop/migrations/README.md`:

```markdown
# SQLite migrations (generated)

These files are **generated** from `supabase/migrations/*.sql` by
`pnpm gen:sqlite-migrations`. Do not edit by hand. Edit the corresponding
Postgres migration instead, then regenerate.

## Prerequisites

- Python 3.10+
- `sqlglot` >= 22

Install:

    pip install --user 'sqlglot>=22'

## Regenerate

    pnpm gen:sqlite-migrations

## Check for drift (CI)

    pnpm check:sqlite-migrations

## Adding a new table

1. Author the Postgres migration as usual (`pnpm db:new-migration name`).
2. Decide: should this table be synced to desktop?
   - Yes → add the table name to `apps/desktop/sync/syncable-tables.ts` `SYNCABLE_TABLES`.
   - No → add the table name to `EXCLUDED_TABLES`.
3. Run `pnpm gen:sqlite-migrations`.
4. Commit the regenerated `apps/desktop/migrations/*.sql` alongside the Postgres migration.
```

- [ ] **Step 2: Write the failing test**

Create `apps/desktop/scripts/gen-sqlite-migrations.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { partitionStatements } from "./gen-sqlite-migrations.ts";
import type { Statement } from "./gen-sqlite-migrations.ts";

describe("partitionStatements", () => {
  const syncable = ["datasets", "dashboards"];
  const excluded = ["audit_log"];

  it("includes statements referencing only syncable tables", () => {
    const stmts: Statement[] = [
      {
        tables: ["datasets"],
        sql: "create table datasets (id text primary key);",
      },
    ];
    const result = partitionStatements(stmts, syncable, excluded);
    expect(result.included).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(result.unknown).toHaveLength(0);
  });

  it("skips statements that touch only excluded tables", () => {
    const stmts: Statement[] = [
      {
        tables: ["audit_log"],
        sql: "create table audit_log (id text primary key);",
      },
    ];
    const result = partitionStatements(stmts, syncable, excluded);
    expect(result.included).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
  });

  it("flags statements touching unknown tables", () => {
    const stmts: Statement[] = [
      {
        tables: ["mystery_table"],
        sql: "create table mystery_table (id text primary key);",
      },
    ];
    const result = partitionStatements(stmts, syncable, excluded);
    expect(result.unknown).toEqual([
      { table: "mystery_table", sql: stmts[0]!.sql },
    ]);
  });

  it("rejects a statement that mixes syncable and excluded tables in the same DDL", () => {
    const stmts: Statement[] = [
      {
        tables: ["datasets", "audit_log"],
        sql: "alter table datasets add column some_audit_fk references audit_log(id);",
      },
    ];
    const result = partitionStatements(stmts, syncable, excluded);
    // Mixed: included tables present, but excluded reference would break.
    // The generator should flag this as unknown for human review.
    expect(result.unknown.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/desktop test
```

Expected: FAIL.

- [ ] **Step 4: Implement the pure partition function**

Create `apps/desktop/scripts/gen-sqlite-migrations.ts`:

```ts
#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { EXCLUDED_TABLES, SYNCABLE_TABLES } from "../sync/syncable-tables.ts";

export type Statement = {
  readonly tables: ReadonlyArray<string>;
  readonly sql: string;
};

export type PartitionResult = {
  readonly included: ReadonlyArray<Statement>;
  readonly skipped: ReadonlyArray<Statement>;
  readonly unknown: ReadonlyArray<{
    readonly table: string;
    readonly sql: string;
  }>;
};

export function partitionStatements(
  statements: ReadonlyArray<Statement>,
  syncable: ReadonlyArray<string>,
  excluded: ReadonlyArray<string>,
): PartitionResult {
  const included: Statement[] = [];
  const skipped: Statement[] = [];
  const unknown: { table: string; sql: string }[] = [];

  for (const stmt of statements) {
    const tables = stmt.tables;
    const allSyncable = tables.every((t) => syncable.includes(t));
    const allExcluded = tables.every((t) => excluded.includes(t));
    const anyUnknown = tables.some(
      (t) => !syncable.includes(t) && !excluded.includes(t),
    );
    const mixed = !allSyncable && !allExcluded;

    if (anyUnknown) {
      const u = tables.find(
        (t) => !syncable.includes(t) && !excluded.includes(t),
      );
      if (u) unknown.push({ table: u, sql: stmt.sql });
      continue;
    }
    if (mixed) {
      // Spans both lists — needs human review.
      const t = tables.find((x) => excluded.includes(x)) ?? tables[0]!;
      unknown.push({ table: t, sql: stmt.sql });
      continue;
    }
    if (allSyncable) included.push(stmt);
    else skipped.push(stmt);
  }

  return { included, skipped, unknown };
}

// ─────────────────────────────────────────────────────────────────────────
// Driver (CLI entry)
// ─────────────────────────────────────────────────────────────────────────

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");
const POSTGRES_DIR = join(REPO_ROOT, "supabase", "migrations");
const SQLITE_DIR = join(REPO_ROOT, "apps", "desktop", "migrations");

async function main(): Promise<void> {
  mkdirSync(SQLITE_DIR, { recursive: true });

  const pgFiles = readdirSync(POSTGRES_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const allUnknown: { file: string; table: string; sql: string }[] = [];

  for (const file of pgFiles) {
    const pgPath = join(POSTGRES_DIR, file);
    const sliteOut = join(SQLITE_DIR, file);

    const sql = readFileSync(pgPath, "utf8");
    const statements = parseStatementsViaSqlglot(sql);
    const result = partitionStatements(
      statements,
      SYNCABLE_TABLES as unknown as ReadonlyArray<string>,
      EXCLUDED_TABLES as unknown as ReadonlyArray<string>,
    );

    for (const u of result.unknown) {
      allUnknown.push({ file, ...u });
    }

    if (result.included.length === 0) {
      // No syncable content; emit an empty stub so the file list stays in
      // lockstep, helpful for diffing.
      writeFileSync(
        sliteOut,
        `-- generated from ${file} — no syncable statements\n`,
      );
      continue;
    }

    const transpiled = transpileToSqliteViaSqlglot(
      result.included.map((s) => s.sql).join("\n\n"),
    );
    writeFileSync(
      sliteOut,
      `-- generated from supabase/migrations/${file}\n` +
        `-- DO NOT EDIT — regenerate via 'pnpm gen:sqlite-migrations'\n\n` +
        transpiled +
        "\n",
    );
  }

  if (allUnknown.length > 0) {
    console.error(
      "Refusing to generate. The following statements reference tables not in SYNCABLE_TABLES or EXCLUDED_TABLES:",
    );
    for (const u of allUnknown) {
      console.error(`  ${u.file}: table=${u.table}`);
    }
    console.error(
      "Decide per table: add to SYNCABLE_TABLES or EXCLUDED_TABLES.",
    );
    process.exit(1);
  }

  console.log(`Generated ${pgFiles.length} migration file(s) to ${SQLITE_DIR}`);
}

function runSqlglot(args: ReadonlyArray<string>, stdin?: string): string {
  const result = spawnSync("python3", ["-m", "sqlglot.cli", ...args], {
    input: stdin,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(result.stderr);
    throw new Error(
      "sqlglot failed — is Python 3 with sqlglot installed? (pip install 'sqlglot>=22')",
    );
  }
  return result.stdout;
}

/**
 * Phase 2 starting implementation: split on `;` at top level, ask sqlglot to
 * identify the tables each statement touches. Cheap and correct for our
 * Supabase migration style; replace with a real Python helper script if it
 * ever proves insufficient.
 */
function parseStatementsViaSqlglot(sql: string): Statement[] {
  // Naive split — fine for our migrations since they don't embed `;` in
  // string literals at scale. Revisit if this assumption breaks.
  const raw = sql
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  return raw.map((stmt) => ({
    sql: stmt + ";",
    tables: extractTablesViaSqlglot(stmt),
  }));
}

function extractTablesViaSqlglot(stmt: string): string[] {
  // Use sqlglot to parse and extract all referenced table names.
  const py = `
import sys, json
import sqlglot
expr = sqlglot.parse_one(sys.stdin.read(), read='postgres')
tables = sorted({t.name for t in expr.find_all(sqlglot.exp.Table)})
print(json.dumps(tables))
`;
  const result = spawnSync("python3", ["-c", py], {
    input: stmt,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(result.stderr);
    throw new Error("sqlglot table extraction failed");
  }
  return JSON.parse(result.stdout) as string[];
}

function transpileToSqliteViaSqlglot(pgSql: string): string {
  return runSqlglot(["--read", "postgres", "--write", "sqlite"], pgSql).trim();
}

// Run main() when invoked directly.
if (import.meta.main) {
  await main();
}
```

- [ ] **Step 5: Run the unit test and confirm pass**

```bash
pnpm --filter @avandar/desktop test
```

Expected: green.

- [ ] **Step 6: Write the CI drift checker**

Create `apps/desktop/scripts/check-sqlite-migrations.ts`:

```ts
#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");
const SQLITE_DIR = join(REPO_ROOT, "apps", "desktop", "migrations");

// Snapshot the current committed migrations.
const before = readdirSync(SQLITE_DIR)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => ({
    name: f,
    content: readFileSync(join(SQLITE_DIR, f), "utf8"),
  }));

// Regenerate.
const gen = spawnSync(
  "bun",
  ["run", "apps/desktop/scripts/gen-sqlite-migrations.ts"],
  {
    cwd: REPO_ROOT,
    encoding: "utf8",
  },
);
if (gen.status !== 0) {
  console.error(gen.stderr);
  process.exit(1);
}

// Compare.
const after = readdirSync(SQLITE_DIR)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => ({
    name: f,
    content: readFileSync(join(SQLITE_DIR, f), "utf8"),
  }));

let drift = false;
const beforeMap = new Map(before.map((f) => [f.name, f.content]));
const afterMap = new Map(after.map((f) => [f.name, f.content]));

for (const [name, content] of afterMap) {
  const prior = beforeMap.get(name);
  if (prior === undefined) {
    console.error(`Drift: new migration file ${name}`);
    drift = true;
  } else if (prior !== content) {
    console.error(`Drift: ${name} content changed`);
    drift = true;
  }
}

for (const name of beforeMap.keys()) {
  if (!afterMap.has(name)) {
    console.error(`Drift: ${name} disappeared after regen`);
    drift = true;
  }
}

if (drift) {
  console.error(
    "\nCommitted SQLite migrations are out of date. Run 'pnpm gen:sqlite-migrations' and commit the result.",
  );
  process.exit(1);
}

console.log("SQLite migrations are in sync.");
```

- [ ] **Step 7: Add root scripts**

Edit root `package.json` `scripts`:

```json
"gen:sqlite-migrations": "bun run apps/desktop/scripts/gen-sqlite-migrations.ts",
"check:sqlite-migrations": "bun run apps/desktop/scripts/check-sqlite-migrations.ts",
```

- [ ] **Step 8: Run the generator for the first time**

Confirm Python + sqlglot are installed:

```bash
python3 -c 'import sqlglot; print(sqlglot.__version__)'
```

If not installed:

```bash
pip install --user 'sqlglot>=22'
```

Then:

```bash
pnpm gen:sqlite-migrations
```

Expected:

- If every Postgres migration touches only known (syncable or excluded) tables: generates `apps/desktop/migrations/*.sql` files mirroring `supabase/migrations/*.sql`.
- If any Postgres migration references unknown tables: hard error listing them. **Stop. Decide per table. Update `SYNCABLE_TABLES` or `EXCLUDED_TABLES`. Re-run.**

- [ ] **Step 9: Review the generated migrations**

Spot-check a few generated files:

- Types translated correctly (`uuid` → `text`, `timestamptz` → `integer` or `text` per sqlglot's defaults — verify the choice is workable).
- RLS / GRANT statements dropped or commented out.
- Triggers calling PG functions either dropped or surfaced as TODOs.

If sqlglot mis-translates something critical, file an upstream issue and apply a one-off post-processing step. For Phase 2, a minor manual touch-up _of the generator script_ (not of the output files) is acceptable.

- [ ] **Step 10: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm --filter @avandar/desktop test
  pnpm gen:sqlite-migrations
  pnpm check:sqlite-migrations
  git status apps/desktop/migrations/
  git diff --stat apps/desktop/migrations/
  ```

  Expected: generator tests pass; the generator runs without errors; `check:sqlite-migrations` exits 0 (no drift between generator output and what's on disk); `git status`/`git diff` show only the expected, intentional changes under `apps/desktop/migrations/`.

  **Verify:**
  - `apps/desktop/scripts/gen-sqlite-migrations.ts` and `apps/desktop/scripts/check-sqlite-migrations.ts` exist and are wired into root `package.json` scripts.
  - `apps/desktop/migrations/` contains one generated file per source migration that touches a syncable table — no files for non-syncable tables.
  - `apps/desktop/migrations/README.md` documents the regeneration workflow.
  - Spot-check **at least one** generated migration:
    - `uuid` columns become `text`.
    - `timestamptz` columns become whichever of `integer`/`text` sqlglot lands on — confirm the choice is workable for bun:sqlite.
    - RLS / GRANT statements dropped or commented out.
    - PG-function triggers either dropped or surfaced as `-- TODO:` markers (no live calls to `auth.uid()` etc.).
  - Generator hard-errors on a manifest table it can't translate (verified by a unit test).
  - Test groupings G2.7 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test:**
  1. Touch a syncable-table column in `supabase/migrations/` (e.g. add a no-op `ALTER TABLE … ADD COLUMN _scratch text`).
  2. Re-run `pnpm gen:sqlite-migrations` — confirm a new `apps/desktop/migrations/*.sql` file appears reflecting the change.
  3. Run `pnpm check:sqlite-migrations` — confirm it now passes.
  4. Revert the scratch change in `supabase/migrations/`, re-run the generator, and confirm the desktop migration disappears (or the diff cleanly reverts).

  Expected: the generator picks up source changes and `check:sqlite-migrations` reliably catches drift in both directions.

  **Greenlight criteria:** generator runs clean, drift check passes against committed output, and a manual diff of one migration reads sensibly before moving to Task 7.

---

## Task 7: `Sqlite.ts` — bun:sqlite handle + migration runner

**Test groupings:** G2.8 (bun:sqlite migration runner — fresh DB applies all; idempotency on rerun; history mismatch detected; malformed migration rolls back without partial state).

**PR boundaries:** 2 PRs.

- PR 1: `openSqliteDatabase` + migration runner module (`apps/desktop/main/sqlite/...`) with its unit tests; not yet invoked at launch.
- PR 2: Wire the runner into desktop main startup so Task 6's generated migrations apply on first launch — desktop-only code path.

**Files:**

- Create: `apps/desktop/main/services/Sqlite.ts`
- Test: `apps/desktop/main/services/Sqlite.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/main/services/Sqlite.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openSqliteDatabase, runMigrations } from "./Sqlite.ts";

describe("Sqlite", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("opens a database file at the given path", () => {
    dir = mkdtempSync(join(tmpdir(), "avandar-sqlite-test-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    expect(db).toBeDefined();
    db.run("create table foo (id text primary key);");
    db.run("insert into foo (id) values ('a');");
    const rows = db.query<{ id: string }, []>("select id from foo").all();
    expect(rows).toEqual([{ id: "a" }]);
    db.close();
  });

  it("runMigrations applies pending files in order and is idempotent", () => {
    dir = mkdtempSync(join(tmpdir(), "avandar-sqlite-test-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));

    const migrations = [
      {
        name: "001_init.sql",
        sql: "create table widgets (id integer primary key, name text);",
      },
      {
        name: "002_add_color.sql",
        sql: "alter table widgets add column color text;",
      },
    ];

    runMigrations(db, migrations);

    // Idempotent: rerunning should be a no-op
    runMigrations(db, migrations);

    db.run("insert into widgets (name, color) values ('a', 'red');");
    const rows = db
      .query<
        { name: string; color: string },
        []
      >("select name, color from widgets")
      .all();
    expect(rows).toEqual([{ name: "a", color: "red" }]);
    db.close();
  });

  it("runMigrations refuses to skip files (would indicate missing migrations)", () => {
    dir = mkdtempSync(join(tmpdir(), "avandar-sqlite-test-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));

    runMigrations(db, [
      {
        name: "001_init.sql",
        sql: "create table widgets (id integer primary key);",
      },
    ]);

    // Now caller passes a different set that omits 001
    expect(() =>
      runMigrations(db, [
        {
          name: "002_add_color.sql",
          sql: "alter table widgets add column color text;",
        },
      ]),
    ).toThrow(/migration history mismatch/i);

    db.close();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/desktop test
```

Expected: FAIL.

- [ ] **Step 3: Implement `Sqlite.ts`**

Create `apps/desktop/main/services/Sqlite.ts`:

```ts
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";

export type AvaSqliteDatabase = Database;

export type Migration = {
  readonly name: string;
  readonly sql: string;
};

export function openSqliteDatabase(filePath: string): AvaSqliteDatabase {
  mkdirSync(dirname(filePath), { recursive: true });
  const db = new Database(filePath, { create: true });
  db.run("pragma journal_mode = WAL;");
  db.run("pragma foreign_keys = ON;");
  return db;
}

/**
 * Apply pending migrations to the database in order. Tracks applied
 * migrations in `_schema_migrations` and rejects history mismatches.
 */
export function runMigrations(
  db: AvaSqliteDatabase,
  migrations: ReadonlyArray<Migration>,
): void {
  db.run(`
    create table if not exists _schema_migrations (
      name text primary key,
      applied_at integer not null
    );
  `);

  const applied = db
    .query<{ name: string }, []>(
      "select name from _schema_migrations order by name",
    )
    .all()
    .map((r) => r.name);

  // History check: every already-applied migration must still appear in the
  // input, in the same order, before any new ones.
  for (let i = 0; i < applied.length; i++) {
    if (migrations[i]?.name !== applied[i]) {
      throw new Error(
        `migration history mismatch: db has ${applied[i]} at index ${i}, but caller provided ${migrations[i]?.name ?? "<none>"}`,
      );
    }
  }

  // Apply any new ones.
  const tx = db.transaction((toApply: ReadonlyArray<Migration>) => {
    for (const m of toApply) {
      db.run(m.sql);
      db.run(
        "insert into _schema_migrations (name, applied_at) values (?, ?);",
        [m.name, Date.now()],
      );
    }
  });

  tx(migrations.slice(applied.length));
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
pnpm --filter @avandar/desktop test
```

Expected: green.

- [ ] **Step 5: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm --filter @avandar/desktop test
  pnpm --filter @avandar/desktop type-check
  ```

  Expected: Sqlite unit tests pass (migration runner, idempotency, error paths), type-check clean.

  **Verify:**
  - `apps/desktop/main/services/Sqlite.ts` exports the handle factory and a migration runner that:
    - reads from `apps/desktop/migrations/*.sql` in lexical order,
    - tracks applied migrations in a bookkeeping table,
    - is idempotent across restarts,
    - runs each file inside a transaction.
  - Tests cover: fresh DB, partial-apply restart, malformed migration aborts the transaction.
  - The handle uses `bun:sqlite` (not `better-sqlite3`) and sets WAL / sensible pragmas at open time.
  - Test groupings G2.8 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test (desktop app — `pnpm dev:desktop`):**
  1. Delete any pre-existing `~/Library/Application Support/Avandar/metadata.sqlite` so you're starting fresh.
  2. Launch the desktop app.
  3. Quit, then inspect on disk:
     ```bash
     ls -la "$HOME/Library/Application Support/Avandar/"
     sqlite3 "$HOME/Library/Application Support/Avandar/metadata.sqlite" '.schema'
     sqlite3 "$HOME/Library/Application Support/Avandar/metadata.sqlite" 'SELECT name FROM sqlite_master WHERE type="table";'
     ```
  4. Relaunch the app and confirm no migrations re-apply (check logs for a "no pending migrations" or equivalent line; the bookkeeping table should already list every migration).

  Expected: `metadata.sqlite` exists, schema contains every syncable table from Task 5, the bookkeeping table is populated, and a second launch does not re-run migrations.

  **Greenlight criteria:** fresh launch produces the expected SQLite file and schema, and a second launch is a no-op for the migration runner, before moving to Task 8.

---

## Task 8: RDB IPC handlers + `createSqliteCrudClient`

**Test groupings:** G2.9 (createSqliteCrudClient round-trip on real bun:sqlite — insert→getById→list→update→delete; transaction rolls back on second-statement failure); G2.10 (Outbox-in-same-transaction invariant — data write + manual INSERT INTO \_outbox commit atomically; Phase 3 prerequisite encoded in Phase 2).

**PR boundaries:** 3-4 PRs.

- PR 1: RDB IPC handlers in `apps/desktop/main/ipc/rdb.ts` with unit tests; nothing imports them on web.
- PR 2: `createSqliteCrudClient` in `packages/shared/clients/src/SqliteCrudClient/...` with mocked-IPC unit tests; new file, not yet selected by the factory.
- PR 3: Integration loopback test wiring PR 1 and PR 2 through the fake-IPC harness — asserts already-passing behavior.
- PR 4: Update `createRdbCrudClient` factory's desktop branch to return `createSqliteCrudClient`; desktop CRUD goes live, web is unaffected because `isDesktop()` is false.

Wire SQLite to the webview through the IPC layer, then introduce the SQLite-backed CRUD client.

**Files:**

- Create: `apps/desktop/main/ipc/rdb.ts`
- Create: `packages/shared/clients/src/SqliteCrudClient/createSqliteCrudClient.ts`
- Test: `packages/shared/clients/src/SqliteCrudClient/createSqliteCrudClient.test.ts`
- Modify: `packages/shared/clients/src/index.ts`
- Modify: `shared/RdbCrudClient/createRdbCrudClient.ts`
- Modify: `apps/desktop/main/index.ts`

- [ ] **Step 1: Register RDB handlers in Bun main**

Create `apps/desktop/main/ipc/rdb.ts`:

```ts
import { RdbContracts } from "@avandar/platform";
import type { AvaSqliteDatabase } from "../services/Sqlite.ts";
import type { IpcServer } from "@avandar/platform";

export function registerRdbHandlers(
  server: IpcServer,
  db: AvaSqliteDatabase,
): void {
  server.handle(RdbContracts.run, (req) => {
    const stmt = db.prepare(req.sql);
    const res = stmt.run(...req.params);
    return {
      changes: res.changes,
      lastInsertRowid: Number(res.lastInsertRowid ?? 0),
    };
  });

  server.handle(RdbContracts.query, (req) => {
    const stmt = db.prepare(req.sql);
    const rows = stmt.all(...req.params) as ReadonlyArray<
      Record<string, unknown>
    >;
    return { rows };
  });

  server.handle(RdbContracts.transaction, (req) => {
    const tx = db.transaction((stmts: typeof req.statements) => {
      const results: { changes: number }[] = [];
      for (const s of stmts) {
        const r = db.prepare(s.sql).run(...s.params);
        results.push({ changes: r.changes });
      }
      return results;
    });
    return { results: tx(req.statements) };
  });
}
```

- [ ] **Step 2: Update `apps/desktop/main/index.ts` to open the database and register handlers**

Modify `apps/desktop/main/index.ts`:

```ts
import { join } from "node:path";
import { createIpcServer } from "@avandar/platform";
import { Electrobun } from "electrobun";
import { resolveWebviewUrl } from "./config/url.ts";
import { registerRdbHandlers } from "./ipc/rdb.ts";
import { getUserDataDir } from "./platform/userDataDir.ts";
import { loadMigrations } from "./services/loadMigrations.ts";
import { openSqliteDatabase, runMigrations } from "./services/Sqlite.ts";

const mode = (process.env.AVA_DESKTOP_MODE ?? "development") as
  | "development"
  | "production";

const dataDir = getUserDataDir();
const db = openSqliteDatabase(join(dataDir, "metadata.sqlite"));
runMigrations(db, await loadMigrations());

const viteDevUrl = process.env.AVA_VITE_DEV_URL ?? "http://localhost:5173";
const bundledIndexPath =
  process.env.AVA_BUNDLED_INDEX_PATH ??
  Electrobun.resources.path("web/index.html");
const url = resolveWebviewUrl({ mode, viteDevUrl, bundledIndexPath });

const window = Electrobun.windows.create({
  title: "Avandar",
  url,
  width: 1280,
  height: 800,
  preload: "preload/index.js",
});

const ipcServer = createIpcServer({
  on: (channel, cb) => window.ipc.on(channel, cb),
  send: (channel, msg) => window.ipc.send(channel, msg),
});

registerRdbHandlers(ipcServer, db);

window.on("closed", () => {
  db.close();
  Electrobun.app.quit();
});

console.log(`[avandar-desktop] webview loaded ${url}; data dir ${dataDir}`);
```

Adapt `window.ipc.on / send` to Electrobun's actual IPC API. The invariant: provide an `on(channel, cb)` and `send(channel, message)` pair to `createIpcServer`.

- [ ] **Step 3: Create the migration loader**

Create `apps/desktop/main/services/loadMigrations.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Migration } from "./Sqlite.ts";

const MIGRATIONS_DIR = join(import.meta.dir, "..", "..", "migrations");

export async function loadMigrations(): Promise<ReadonlyArray<Migration>> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files.map((name) => ({
    name,
    sql: readFileSync(join(MIGRATIONS_DIR, name), "utf8"),
  }));
}
```

In production builds, the migrations directory will be bundled into the app resources; adjust this path if Electrobun's bundler relocates `apps/desktop/migrations/`.

- [ ] **Step 4: Write the failing test for `createSqliteCrudClient`**

Create `packages/shared/clients/src/SqliteCrudClient/createSqliteCrudClient.test.ts`:

```ts
import { __setIpcBridgeForTests, RdbContracts } from "@avandar/platform";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSqliteCrudClient } from "./createSqliteCrudClient.ts";

describe("createSqliteCrudClient", () => {
  const sendMock = vi.fn();
  const onceMock = vi.fn();

  afterEach(() => {
    sendMock.mockReset();
    onceMock.mockReset();
    __setIpcBridgeForTests(null);
  });

  it("translates `get(id)` into an rdb.query IPC call", async () => {
    __setIpcBridgeForTests({ send: sendMock, once: onceMock });

    onceMock.mockImplementation((_channel, cb) => {
      Promise.resolve().then(() =>
        cb({
          id: (sendMock.mock.calls[0]?.[1] as { id: string }).id,
          ok: true,
          result: {
            rows: [{ id: "x1", name: "test", created_at: 123 }],
          },
        }),
      );
    });

    const client = createSqliteCrudClient<{
      Read: { id: string; name: string; created_at: number };
    }>({
      modelName: "Widget",
      tableName: "widgets",
      dbTablePrimaryKey: "id",
      parsers: {
        Read: (r) => r as any,
        Insert: (r) => r as any,
        Update: (r) => r as any,
      },
    });

    const result = await client.getById("x1");
    expect(sendMock).toHaveBeenCalledWith(
      RdbContracts.query.name,
      expect.objectContaining({
        payload: expect.objectContaining({
          sql: expect.stringContaining("widgets"),
        }),
      }),
    );
    expect(result?.name).toBe("test");
  });
});
```

- [ ] **Step 5: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/clients test
```

Expected: FAIL.

- [ ] **Step 6: Implement `createSqliteCrudClient`**

Create `packages/shared/clients/src/SqliteCrudClient/createSqliteCrudClient.ts`:

```ts
import { callIpc, RdbContracts } from "@avandar/platform";
import { createModelCrudClient } from "@clients/ModelCrudClient/createModelCrudClient.ts";
import type { RdbCrudModelSpec } from "$/RdbCrudClient/RdbCrudClient.types.ts";

/**
 * SQLite-backed CRUD client. Issues IPC calls to the Bun-main process,
 * which holds the bun:sqlite database. Mirrors the surface of
 * `createSupabaseCrudClient` so it can plug into the existing
 * `ModelCrudClient` factory.
 */
export function createSqliteCrudClient<M>(spec: RdbCrudModelSpec<M>) {
  const tableName = spec.tableName;
  const pk = spec.dbTablePrimaryKey;

  return createModelCrudClient<M>({
    modelName: spec.modelName,
    parsers: spec.parsers,
    primaryKey: pk,
    operations: {
      async getById(id) {
        const { rows } = await callIpc(RdbContracts.query, {
          sql: `select * from ${tableName} where ${pk} = ? limit 1`,
          params: [id],
        });
        return rows[0] ?? null;
      },
      async list(filter) {
        const { where, params } = buildWhere(filter);
        const order =
          filter?.orderBy ?
            "order by " +
            filter.orderBy
              .map(
                (o) => `${o.column} ${o.direction === "desc" ? "desc" : "asc"}`,
              )
              .join(", ")
          : "";
        const lim = filter?.limit ? `limit ${filter.limit}` : "";
        const off = filter?.offset ? `offset ${filter.offset}` : "";
        const sql = [`select * from ${tableName}`, where, order, lim, off]
          .filter(Boolean)
          .join(" ");
        const { rows } = await callIpc(RdbContracts.query, { sql, params });
        return rows;
      },
      async upsert(row) {
        const cols = Object.keys(row as object);
        const placeholders = cols.map(() => "?").join(", ");
        const updates = cols
          .filter((c) => c !== pk)
          .map((c) => `${c} = excluded.${c}`)
          .join(", ");
        const sql = `insert into ${tableName} (${cols.join(", ")}) values (${placeholders}) on conflict(${pk}) do update set ${updates};`;
        const params = cols.map((c) => (row as Record<string, unknown>)[c]);
        await callIpc(RdbContracts.run, { sql, params });
        return row;
      },
      async delete(id) {
        await callIpc(RdbContracts.run, {
          sql: `delete from ${tableName} where ${pk} = ?`,
          params: [id],
        });
      },
    },
  });
}

function buildWhere(
  filter:
    | {
        eq?: Record<string, unknown>;
        in?: Record<string, ReadonlyArray<unknown>>;
      }
    | undefined,
): {
  where: string;
  params: unknown[];
} {
  if (!filter) return { where: "", params: [] };
  const clauses: string[] = [];
  const params: unknown[] = [];

  for (const [col, val] of Object.entries(filter.eq ?? {})) {
    clauses.push(`${col} = ?`);
    params.push(val);
  }
  for (const [col, vals] of Object.entries(filter.in ?? {})) {
    if (vals.length === 0) {
      clauses.push("1 = 0");
      continue;
    }
    clauses.push(`${col} in (${vals.map(() => "?").join(", ")})`);
    params.push(...vals);
  }

  return clauses.length === 0 ?
      { where: "", params: [] }
    : { where: `where ${clauses.join(" and ")}`, params };
}
```

If the existing `createModelCrudClient` doesn't accept an `operations` block in this exact shape, adapt to its real signature. The invariant: `createSqliteCrudClient` must produce a value that satisfies the same `ModelCrudClient<M, ExtendedQueries, ExtendedMutations>` interface as `createSupabaseCrudClient`.

- [ ] **Step 7: Run the test and confirm it passes**

```bash
pnpm --filter @avandar/clients test
```

Expected: green.

- [ ] **Step 8: Flip the desktop branch in `createRdbCrudClient`**

Edit `shared/RdbCrudClient/createRdbCrudClient.ts`:

Adapt the existing Phase 1 file (which currently always delegates to Supabase) to branch on `isDesktop()`:

```ts
import { createSqliteCrudClient } from "@clients/SqliteCrudClient/createSqliteCrudClient.ts";
import { createSupabaseCrudClient } from "@clients/SupabaseCrudClient/createSupabaseCrudClient.ts";
import { AvaSupabase } from "$/db/supabase/AvaSupabase.ts";
import { isDesktop } from "$/platform/isDesktop.ts";
import type { RdbCrudModelSpec } from "$/RdbCrudClient/RdbCrudClient.types.ts";

export function createRdbCrudClient<M>(spec: RdbCrudModelSpec<M>) {
  if (isDesktop()) {
    return createSqliteCrudClient<M>(spec);
  }
  return createSupabaseCrudClient<M>({
    ...spec,
    dbClient: AvaSupabase.db(),
  } as never);
}
```

Keep the actual generics (`ExtendedQueriesClient`, `ExtendedMutationsClient`) from the existing Phase 1 signature — the snippet above omits them for clarity. Update `shared/RdbCrudClient/createRdbCrudClient.test.ts` accordingly: the Phase 1 test currently asserts "Phase 1 Option A — also delegates to createSupabaseCrudClient on desktop". Replace that case with one that mocks `isDesktop` → `true` and asserts the call lands on `createSqliteCrudClient` instead.

- [ ] **Step 9: Export `createSqliteCrudClient` from the clients index**

Edit `packages/shared/clients/src/index.ts`:

```ts
export { createSqliteCrudClient } from "@clients/SqliteCrudClient/createSqliteCrudClient.ts";
```

- [ ] **Step 10: Run all tests**

```bash
pnpm test
```

Expected: green.

- [ ] **Step 11: Desktop smoke test**

```bash
pnpm dev:desktop
```

The webview should:

- Open the Electrobun window
- Bun main creates the SQLite database in `~/Library/Application Support/Avandar/metadata.sqlite`
- The webview now routes CRUD reads through the IPC bridge to bun:sqlite
- Reads return empty initially (no data yet) — this is _expected_; subsequent tasks handle the one-shot Supabase→SQLite snapshot bootstrap

If the webview crashes because `createRdbCrudClient` returns empty results from an empty DB, that's exposing a missing snapshot-bootstrap. Add it as a small startup-time service in `apps/desktop/main/index.ts`:

```ts
// Pseudocode: on first launch, if SQLite is empty, fetch the user's syncable
// rows from Supabase REST and seed the local DB.
```

The actual implementation lives in the next task.

- [ ] **Step 12: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm --filter @avandar/desktop test
  pnpm --filter @avandar/clients test
  pnpm type-check
  ```

  Expected: SQLite CRUD client tests pass against a real bun:sqlite in-memory DB; the RDB-IPC server tests pass; whole-monorepo type-check clean.

  **Verify:**
  - `apps/desktop/main/ipc/rdb.ts` registers handlers for every `rdb.*` contract from Task 1.
  - `packages/shared/clients/src/SqliteCrudClient/createSqliteCrudClient.ts` implements the same `RdbCrudClient` interface as the web Dexie client (parity is what makes the swap transparent).
  - `shared/RdbCrudClient/createRdbCrudClient.ts` now branches on platform and returns the SQLite-backed client on desktop, Dexie on web.
  - SQL parameter handling is parameterised — no string interpolation of user data into queries.
  - `apps/desktop/main/index.ts` constructs the Sqlite handle once and passes it to `registerRdbHandlers`.
  - Test groupings G2.9, G2.10 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test (desktop app — `pnpm dev:desktop`):**
  1. Open a page in the app that creates a row in a syncable table (e.g. a Datasets list or whichever CRUD surface is wired earliest).
  2. Create a row via the UI.
  3. In another terminal, confirm it landed in SQLite:
     ```bash
     sqlite3 "$HOME/Library/Application Support/Avandar/metadata.sqlite" 'SELECT * FROM datasets;'
     ```
  4. Quit the app and relaunch.
  5. Confirm the row is still listed in the UI on relaunch.
  6. Watch the desktop logs during the operation for the IPC roundtrip (request name + response) to confirm calls flow through `callIpc` → server handler → bun:sqlite, not a stale web code path.

  Expected: the row appears in the on-disk SQLite file and survives a restart; logs show the desktop RDB IPC path firing, not the Dexie fallback.

  **Greenlight criteria:** at least one full create→read→restart→read cycle works through the SQLite-backed CRUD client before moving to Task 9.

---

## Task 9: One-shot Supabase→SQLite snapshot bootstrap

**Test groupings:** G2.11 (Snapshot bootstrap — empty→populated; populated→skip; partial-completion-per-table is recoverable; FK-ordered inserts; REST 401 → no partial state; mocked Supabase REST via msw).

**PR boundaries:** 1 PR. Bootstrap module, tests, and desktop main wiring all land together; the code path is desktop-only and gated by `isDesktop()` so web users never reach it.

Without a sync engine (Phase 3), the desktop still needs _some_ way to populate its local SQLite from Supabase on first launch. This task ships a minimal one-shot pull: when the local DB is fresh, fetch all rows for each syncable table from Supabase and insert.

**Files:**

- Create: `apps/desktop/main/services/SupabaseRest.ts`
- Create: `apps/desktop/main/services/SnapshotBootstrap.ts`
- Test: `apps/desktop/main/services/SnapshotBootstrap.test.ts`
- Modify: `apps/desktop/main/index.ts`

- [ ] **Step 1: Implement a minimal Supabase REST wrapper**

Create `apps/desktop/main/services/SupabaseRest.ts`:

```ts
const SUPABASE_URL = process.env.AVA_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.AVA_SUPABASE_ANON_KEY ?? "";

export type SupabaseRestClient = {
  selectAll(
    table: string,
    accessToken: string,
  ): Promise<ReadonlyArray<Record<string, unknown>>>;
};

export function createSupabaseRestClient(): SupabaseRestClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("AVA_SUPABASE_URL and AVA_SUPABASE_ANON_KEY must be set");
  }
  return {
    async selectAll(table, accessToken) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(
          `Supabase selectAll ${table} failed: ${res.status} ${await res.text()}`,
        );
      }
      return (await res.json()) as ReadonlyArray<Record<string, unknown>>;
    },
  };
}
```

In dev, set these vars via `.env.development`:

```
AVA_SUPABASE_URL=http://127.0.0.1:54321
AVA_SUPABASE_ANON_KEY=<the anon key from supabase status>
```

In production builds, propagate from `.env.production`.

- [ ] **Step 2: Write the failing test for `SnapshotBootstrap`**

Create `apps/desktop/main/services/SnapshotBootstrap.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bootstrapSnapshotIfNeeded } from "./SnapshotBootstrap.ts";
import { openSqliteDatabase, runMigrations } from "./Sqlite.ts";

describe("bootstrapSnapshotIfNeeded", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("inserts rows from Supabase when the local table is empty", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-snap-test-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: "create table datasets (id text primary key, name text);",
      },
    ]);

    const rest = {
      selectAll: vi.fn().mockResolvedValueOnce([
        { id: "a", name: "Alpha" },
        { id: "b", name: "Bravo" },
      ]),
    };

    await bootstrapSnapshotIfNeeded(db, rest as never, "token", ["datasets"]);

    const rows = db
      .query<
        { id: string; name: string },
        []
      >("select id, name from datasets order by id")
      .all();
    expect(rows).toEqual([
      { id: "a", name: "Alpha" },
      { id: "b", name: "Bravo" },
    ]);
    expect(rest.selectAll).toHaveBeenCalledOnce();
    db.close();
  });

  it("skips tables that already have rows", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-snap-test-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, [
      {
        name: "001.sql",
        sql: "create table datasets (id text primary key);",
      },
    ]);
    db.run("insert into datasets (id) values ('existing');");

    const rest = { selectAll: vi.fn() };
    await bootstrapSnapshotIfNeeded(db, rest as never, "token", ["datasets"]);
    expect(rest.selectAll).not.toHaveBeenCalled();
    db.close();
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/desktop test
```

Expected: FAIL.

- [ ] **Step 4: Implement `SnapshotBootstrap`**

Create `apps/desktop/main/services/SnapshotBootstrap.ts`:

```ts
import type { AvaSqliteDatabase } from "./Sqlite.ts";
import type { SupabaseRestClient } from "./SupabaseRest.ts";

export async function bootstrapSnapshotIfNeeded(
  db: AvaSqliteDatabase,
  rest: SupabaseRestClient,
  accessToken: string,
  tables: ReadonlyArray<string>,
): Promise<void> {
  for (const table of tables) {
    const count = (
      db
        .query<{ c: number }, []>(`select count(*) as c from ${table}`)
        .get() ?? { c: 0 }
    ).c;
    if (count > 0) continue;

    const rows = await rest.selectAll(table, accessToken);
    if (rows.length === 0) continue;

    const cols = Object.keys(rows[0]!);
    const placeholders = cols.map(() => "?").join(", ");
    const sql = `insert into ${table} (${cols.join(", ")}) values (${placeholders});`;
    const stmt = db.prepare(sql);

    const tx = db.transaction(
      (rowsBatch: ReadonlyArray<Record<string, unknown>>) => {
        for (const row of rowsBatch) {
          stmt.run(...cols.map((c) => row[c] ?? null));
        }
      },
    );
    tx(rows);
  }
}
```

- [ ] **Step 5: Run the test and confirm it passes**

```bash
pnpm --filter @avandar/desktop test
```

Expected: green.

- [ ] **Step 6: Wire bootstrap into Bun main on startup**

Edit `apps/desktop/main/index.ts` to call `bootstrapSnapshotIfNeeded` after the user logs in. Since auth is not yet implemented in Bun main (that's the Keychain task below), use a stopgap: pass `AVA_DEV_ACCESS_TOKEN` from env during dev, and gate bootstrap on its presence.

Add near the top of `apps/desktop/main/index.ts`:

```ts
import { SYNCABLE_TABLES } from "../sync/syncable-tables.ts";
import { bootstrapSnapshotIfNeeded } from "./services/SnapshotBootstrap.ts";
import { createSupabaseRestClient } from "./services/SupabaseRest.ts";

// ... after db + migrations:
const devToken = process.env.AVA_DEV_ACCESS_TOKEN;
if (devToken) {
  await bootstrapSnapshotIfNeeded(
    db,
    createSupabaseRestClient(),
    devToken,
    SYNCABLE_TABLES,
  );
}
```

The "real" bootstrap-on-login flow is wired up in the Keychain/auth task (Task 11).

- [ ] **Step 7: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm --filter @avandar/desktop test
  pnpm --filter @avandar/desktop type-check
  ```

  Expected: `SnapshotBootstrap.test.ts` covers fresh-DB + already-populated cases and passes; type-check clean.

  **Verify:**
  - `apps/desktop/main/services/SupabaseRest.ts` is a minimal, typed REST wrapper (no full supabase-js dependency in main) honouring the dev token contract Task 11 will replace.
  - `apps/desktop/main/services/SnapshotBootstrap.ts`:
    - detects "empty SQLite" by checking the bookkeeping/data tables — not by file existence,
    - iterates `SYNCABLE_TABLES` and inserts rows in dependency order (FK-safe),
    - is idempotent: a second run on a non-empty DB is a no-op,
    - batches inserts inside a single transaction per table.
  - Wiring in `apps/desktop/main/index.ts` runs the bootstrap exactly once at startup and logs `[snapshot-bootstrap] …` progress.
  - Test groupings G2.11 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test (desktop app — `pnpm dev:desktop`):**
  1. Wipe local state: `rm "$HOME/Library/Application Support/Avandar/metadata.sqlite"*`.
  2. Make sure the dev token used by `SnapshotBootstrap` is configured for a user that has real rows in Supabase.
  3. Launch the desktop app.
  4. Watch the logs for `[snapshot-bootstrap] starting`, per-table progress lines, and a `[snapshot-bootstrap] done` (or equivalent) terminator.
  5. After bootstrap completes, inspect SQLite:
     ```bash
     for t in $(sqlite3 "$HOME/Library/Application Support/Avandar/metadata.sqlite" "SELECT name FROM sqlite_master WHERE type='table'"); do
       echo "=== $t ==="
       sqlite3 "$HOME/Library/Application Support/Avandar/metadata.sqlite" "SELECT COUNT(*) FROM $t;"
     done
     ```
  6. Quit and relaunch; confirm the bootstrap log line says "already bootstrapped / skipping" instead of re-pulling.

  Expected: every syncable table has the same row count locally as it does in Supabase for that user; second launch does not re-pull.

  **Greenlight criteria:** fresh launch populates SQLite from Supabase, counts match, and the second launch is a no-op before moving to Task 10.

---

## Task 10: Native DuckDB in Bun main + DuckDb IPC

**Test groupings:** G2.12 (Native DuckDB happy path + parity — real @duckdb/node-api instance, SELECT 1, parquet round-trip, column types match a golden captured from duckdb-wasm; catches BIGINT/INTEGER and TIMESTAMP_NS drift early).

**PR boundaries:** 2 PRs.

- PR 1: `DuckDb` service in Bun main + DuckDb IPC handlers + parity tests; new desktop-only files, not yet wired.
- PR 2: `createIpcDuckDbClient` desktop adapter + wiring into the platform provider's desktop branch; web's DuckDb implementation remains the WASM one because `isDesktop()` is false.

Replace duckdb-wasm on desktop. The existing `@avandar/ava-etl` package already uses the `duckdb` Node binding; we lean on the same package.

**Files:**

- Create: `apps/desktop/main/services/DuckDb.ts`
- Test: `apps/desktop/main/services/DuckDb.test.ts`
- Create: `apps/desktop/main/ipc/duckdb.ts`
- Create: `shared/platform/desktop/DesktopDuckDbClient.ts`
- Modify: `apps/desktop/package.json` — add `duckdb` dep
- Modify: `apps/desktop/main/index.ts`
- Modify: `vite.config.ts` (root) — drop duckdb-wasm from the bundle when `AVA_TARGET=desktop`

- [ ] **Step 1: Add the `duckdb` dependency**

Edit `apps/desktop/package.json` `dependencies`:

```json
"duckdb": "*",
```

Pin the version to match what `@avandar/ava-etl` currently uses (read its `package.json`).

```bash
pnpm install
```

- [ ] **Step 2: Write the failing test for `DuckDb.ts`**

Create `apps/desktop/main/services/DuckDb.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDuckDbService } from "./DuckDb.ts";

describe("DuckDb service", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("opens a database file and runs SELECT 1", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-duckdb-test-"));
    const svc = createDuckDbService(join(dir, "ava.duckdb"));
    const rows = await svc.runRawQuery<{ one: number }>("select 1 as one", []);
    expect(rows).toEqual([{ one: 1 }]);
    await svc.close();
  });

  it("loads a parquet file from disk", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-duckdb-test-"));
    const svc = createDuckDbService(join(dir, "ava.duckdb"));

    // Create a tiny parquet via DuckDB itself
    await svc.runRawQuery(
      "copy (select 1 as id, 'a' as name union all select 2, 'b') to ?",
      [join(dir, "sample.parquet")],
    );

    const rows = await svc.runRawQuery<{ id: number; name: string }>(
      `select * from read_parquet(?) order by id`,
      [join(dir, "sample.parquet")],
    );
    expect(rows).toEqual([
      { id: 1, name: "a" },
      { id: 2, name: "b" },
    ]);
    await svc.close();
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/desktop test
```

Expected: FAIL.

- [ ] **Step 4: Implement `DuckDb.ts`**

Create `apps/desktop/main/services/DuckDb.ts`:

```ts
// Lean on the same `duckdb` Node binding used by @avandar/ava-etl.
// API surface: see https://duckdb.org/docs/api/nodejs/overview
import duckdb from "duckdb";

export type DuckDbService = {
  runRawQuery<TRow>(
    sql: string,
    params: ReadonlyArray<unknown>,
  ): Promise<ReadonlyArray<TRow>>;
  close(): Promise<void>;
};

export function createDuckDbService(filePath: string): DuckDbService {
  const db = new duckdb.Database(filePath);
  const conn = db.connect();

  function exec<TRow>(
    sql: string,
    params: ReadonlyArray<unknown>,
  ): Promise<TRow[]> {
    return new Promise((resolve, reject) => {
      conn.all(sql, ...params, (err: Error | null, rows: TRow[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  return {
    runRawQuery: exec,
    close() {
      return new Promise<void>((resolve, reject) => {
        conn.close((err: Error | null) => {
          if (err) return reject(err);
          db.close((err2: Error | null) => (err2 ? reject(err2) : resolve()));
        });
      });
    },
  };
}
```

If the `duckdb` Node binding API differs in details (callback signature, parameter binding), adjust the wrapper while preserving the `runRawQuery` and `close` invariants.

- [ ] **Step 5: Run the test and confirm pass**

```bash
pnpm --filter @avandar/desktop test
```

Expected: green.

- [ ] **Step 6: Implement DuckDB IPC handlers**

Create `apps/desktop/main/ipc/duckdb.ts`:

```ts
import { join } from "node:path";
import { DuckDbContracts } from "@avandar/platform";
import { getUserDataDir } from "../platform/userDataDir.ts";
import type { DuckDbService } from "../services/DuckDb.ts";
import type { IpcServer } from "@avandar/platform";

export function registerDuckDbHandlers(
  server: IpcServer,
  svc: DuckDbService,
): void {
  server.handle(DuckDbContracts.runRawQuery, async (req) => {
    const rows = await svc.runRawQuery<Record<string, unknown>>(
      req.sql,
      req.params,
    );
    return { rows };
  });

  server.handle(
    DuckDbContracts.loadParquetFromDatasetBlobStore,
    async (req) => {
      // Compute the on-disk path for the parquet:
      const dataDir = getUserDataDir();
      // We don't have workspaceId here in V1 yet — load all parquets matching
      // datasetId. Phase 3 narrows this via the dataset_blob_index.
      // Stopgap for Phase 2: caller passes a key in `datasetId` formatted as
      // `workspaces/<wsId>/datasets/<dsId>`.
      const parquetPath = join(dataDir, req.datasetId, "data.parquet");
      // Register a table view bound to the parquet file
      const tableName = `ds_${req.datasetId.replace(/[^a-z0-9_]/gi, "_")}`;
      await svc.runRawQuery(
        `create or replace view ${tableName} as select * from read_parquet(?)`,
        [parquetPath],
      );
      return { tableName };
    },
  );

  server.handle(DuckDbContracts.loadFromSourcePath, async (req) => {
    const dataDir = getUserDataDir();
    const parquetPath = join(
      dataDir,
      "datasets",
      req.datasetId,
      "data.parquet",
    );

    if (req.format === "csv") {
      const result = await svc.runRawQuery<{ count: number }>(
        `copy (select * from read_csv_auto(?)) to ? (format parquet); select count(*) as count from read_parquet(?)`,
        [req.sourcePath, parquetPath, parquetPath],
      );
      return {
        datasetId: req.datasetId,
        rowCount: result[0]?.count ?? 0,
        parquetBlobKey: parquetPath,
      };
    }
    if (req.format === "xlsx") {
      await svc.runRawQuery(
        `install excel; load excel; copy (select * from read_xlsx(?)) to ? (format parquet)`,
        [req.sourcePath, parquetPath],
      );
      const r = await svc.runRawQuery<{ count: number }>(
        `select count(*) as count from read_parquet(?)`,
        [parquetPath],
      );
      return {
        datasetId: req.datasetId,
        rowCount: r[0]?.count ?? 0,
        parquetBlobKey: parquetPath,
      };
    }
    if (req.format === "parquet") {
      // copy through to canonical path
      await svc.runRawQuery(
        `copy (select * from read_parquet(?)) to ? (format parquet)`,
        [req.sourcePath, parquetPath],
      );
      const r = await svc.runRawQuery<{ count: number }>(
        `select count(*) as count from read_parquet(?)`,
        [parquetPath],
      );
      return {
        datasetId: req.datasetId,
        rowCount: r[0]?.count ?? 0,
        parquetBlobKey: parquetPath,
      };
    }
    throw new Error(`Unsupported format: ${req.format}`);
  });
}
```

The path layout in this handler is a stopgap; Task 12 introduces the canonical workspaces/<wsId>/datasets/<dsId> layout via the `DatasetBlobStore`. Update the handler then.

- [ ] **Step 7: Register the handlers in `index.ts`**

Modify `apps/desktop/main/index.ts`:

```ts
import { registerDuckDbHandlers } from "./ipc/duckdb.ts";
import { createDuckDbService } from "./services/DuckDb.ts";

// ... after openSqliteDatabase:
const duckdbSvc = createDuckDbService(join(dataDir, "duckdb", "ava.duckdb"));

// ... after registerRdbHandlers:
registerDuckDbHandlers(ipcServer, duckdbSvc);

// On window close:
window.on("closed", async () => {
  await duckdbSvc.close();
  db.close();
  Electrobun.app.quit();
});
```

- [ ] **Step 8: Implement webview-side `DesktopDuckDbClient`**

Create `shared/platform/desktop/DesktopDuckDbClient.ts`:

```ts
import { callIpc, DuckDbContracts } from "../ipc/contracts.ts";
import type {
  DatasetImportOptions,
  DatasetImportResult,
  DuckDbClient,
  UploadSource,
} from "../types/DuckDbClient.types.ts";

export const DesktopDuckDbClient: DuckDbClient = {
  async runRawQuery(sql, params = []) {
    const { rows } = await callIpc(DuckDbContracts.runRawQuery, {
      sql,
      params,
    });
    return rows as never;
  },
  async runStructuredQuery(query) {
    // Translation from StructuredQuery → SQL lives wherever it does today on
    // web (src/clients/DuckDbClient). Reuse that translator here. Phase 2
    // leaves this as a thin pass-through to a TODO; Phase 3 wires the real
    // translator after the web<->desktop boundary is firmed up.
    throw new Error(
      "DesktopDuckDbClient.runStructuredQuery: not yet implemented in Phase 2",
    );
  },
  async loadParquetFromDatasetBlobStore(datasetId) {
    await callIpc(DuckDbContracts.loadParquetFromDatasetBlobStore, {
      datasetId,
    });
  },
  async loadFromUpload(
    source: UploadSource,
    options: DatasetImportOptions,
  ): Promise<DatasetImportResult> {
    if (source.kind !== "filesystem-path") {
      throw new Error(
        "Desktop ingest requires a filesystem path; pass uploads through DatasetBlobStore.put first",
      );
    }
    const r = await callIpc(DuckDbContracts.loadFromSourcePath, {
      sourcePath: source.path,
      datasetId: options.datasetId,
      format: options.format,
    });
    return {
      datasetId: r.datasetId,
      rowCount: r.rowCount,
      schema: [],
    };
  },
};
```

- [ ] **Step 9: Drop duckdb-wasm from desktop webview bundle**

Edit the Vite config (root `vite.config.ts`):

Find where externals/optimizeDeps reference duckdb-wasm. Add a conditional:

```ts
const isDesktopTarget = process.env.AVA_TARGET === "desktop";

export default defineConfig({
  // ...
  optimizeDeps: {
    exclude: isDesktopTarget ? ["@duckdb/duckdb-wasm"] : [],
  },
  build: {
    rollupOptions: {
      external: isDesktopTarget ? ["@duckdb/duckdb-wasm"] : [],
    },
  },
});
```

Then update root `package.json` `scripts`:

```json
"dev:desktop": "concurrently -k -n vite,electrobun -c blue,magenta \"AVA_TARGET=desktop pnpm dev\" \"AVA_DESKTOP_MODE=development AVA_VITE_DEV_URL=http://localhost:5173 pnpm --filter @avandar/desktop dev\"",
"build:desktop": "AVA_TARGET=desktop pnpm build && pnpm --filter @avandar/desktop build",
```

This requires that any web code that _imports_ `@duckdb/duckdb-wasm` is wrapped in an `isDesktop()` guard, otherwise the bundle will fail. Audit imports:

```bash
git grep -l "@duckdb/duckdb-wasm" -- 'src/' 'packages/'
```

Each call site should either be desktop-conditional or moved behind a `usePlatform().duckDb` indirection. The full audit is broader than Phase 2 — for now, the goal is _not_ "zero duckdb-wasm in the desktop bundle" but "duckdb-wasm code paths never execute on desktop". The bundle drop is an optimization; if it's blocked, defer it to Phase 4 and accept the ~30MB bundle bloat in V1 desktop. Note this decision in the spec's "decisions" section.

- [ ] **Step 10: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm --filter @avandar/desktop test
  pnpm --filter @avandar/desktop type-check
  pnpm type-check
  ```

  Expected: native DuckDB service tests pass against the real `duckdb` Node binding loaded under Bun; monorepo type-check clean.

  **Verify:**
  - `apps/desktop/package.json` now depends on `duckdb` (Node binding) and the binding loads under Bun without a postinstall fight.
  - `apps/desktop/main/services/DuckDb.ts` exposes the same query API the web `duckdb-wasm` wrapper exposes (so the IPC layer can swap in transparently).
  - `apps/desktop/main/ipc/duckdb.ts` registers handlers for every `duckdb.*` contract from Task 1.
  - `shared/platform/desktop/DesktopDuckDbClient.ts` calls the contracts and returns the same shape the web client returns.
  - The duckdb-wasm bundle decision is recorded as described in Step 9 (dropped from desktop OR explicitly deferred to Phase 4 in the spec's "decisions" section).
  - No `@duckdb/duckdb-wasm` import executes on the desktop runtime path (audit confirmed via `git grep` per Step 9).
  - Test groupings G2.12 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test (desktop app — `pnpm dev:desktop`):**
  1. Add a temporary `console.log` in `DuckDb.ts` that prints the binding's reported version on first query (revert after).
  2. Open a page that runs a DuckDB query — dataset preview, query workbench, whichever exists today.
  3. Confirm the result renders.
  4. In the desktop logs:
     - Confirm the native-DuckDB version line prints.
     - Confirm NO log lines from `duckdb-wasm` (e.g. no "Loading WASM module" messages from the wasm worker).
  5. Run a larger query (e.g. against a multi-MB parquet) and confirm it returns at a speed consistent with native, not wasm.

  Expected: queries succeed via the native binding; logs show native path only; no `duckdb-wasm` activity in the desktop process.

  **Greenlight criteria:** at least one real query renders through `DesktopDuckDbClient` → IPC → native DuckDB, with no wasm fallback firing, before moving to Task 11.

---

## Task 11: Keychain via `/usr/bin/security` shellout (macOS only in Phase 2)

**Test groupings:** G2.13 (Keychain pure-layer unit — argv construction for set/get/delete via `security`; exit-code parsing including 44 = not found; stderr classification; secret never appears in argv); G2.14 (Keychain real-`security`-CLI round-trip, gated by `KEYCHAIN_E2E=1` + `process.platform === 'darwin'`; non-ASCII payload; plaintext never appears in argv, stdout, or stderr).

**PR boundaries:** 1 PR (per project convention — Task = 1 PR; steps below are progress markers, not PR boundaries).

Phase 2 lands macOS keychain. Windows keychain is Phase 5 (`cmdkey` shellout, same shape).

**Design decision (recorded at plan rewrite, 2026-05-19):** the keychain is read ~once at boot and written ~once per Supabase access-token refresh (default: hourly). At that frequency the ~50–100ms cost of `fork+exec` is invisible, so we take the boring/safe path: shell out to `/usr/bin/security`, feed the secret via the child's stdin, parse exit codes for not-found. We explicitly do **not** ship FFI bindings to `Security.framework` — Apple has deprecated the `SecKeychain*` C symbols in favor of `SecItem*`, and the marshaling surface (pointer wrangling, manual free of returned buffers, UTF-8 length math) is a much wider failure surface than a stdin pipe with no upside at this call frequency.

**Files:**

- Create: `apps/desktop/main/services/Keychain.ts`
- Test: `apps/desktop/main/services/Keychain.test.ts` (pure-layer unit tests; mocks `Bun.spawn`)
- Test: `apps/desktop/main/services/Keychain.integration.test.ts` (gated by `KEYCHAIN_E2E=1`, hits the real macOS keychain)
- Create: `apps/desktop/main/ipc/auth.ts`
- Create: `shared/platform/desktop/DesktopAuthProvider.ts`
- Modify: `apps/desktop/main/index.ts`

- [ ] **Step 1: Map the `security` CLI surface**

The three subcommands in scope:

- `security add-generic-password -s <service> -a <account> -w` (password fed on stdin via `-w` with no value) — write/replace an entry.
- `security find-generic-password -w -s <service> -a <account>` — print the password to stdout. Exit 0 with stdout = password (trailing newline); exit 44 when the entry is missing.
- `security delete-generic-password -s <service> -a <account>` — delete. Exit 0 on success; exit 44 when nothing matched (treated as success — idempotent delete).

Two non-obvious specifics worth pinning in the implementation:

- **Always use the absolute path `/usr/bin/security`.** A `$PATH` override could substitute a malicious binary; absolute path closes that.
- **Never put the secret on argv.** `-w` accepts the value on argv OR (when omitted) reads from stdin. We use the stdin form: argv stays scrubbed of the secret so `ps`, audit logs, and shell history can never capture it.

- [ ] **Step 2: Write the failing pure-layer unit tests**

Create `apps/desktop/main/services/Keychain.test.ts`. Use vitest with mocked `Bun.spawn` so the suite stays hermetic and cross-platform (the pure layer has no platform check; the integration test does). Pin:

- Argv composition for `add` / `find` / `delete`. Assert: absolute path is `/usr/bin/security`; no `-w VALUE` form anywhere; service and account passed verbatim.
- Secret writing: `add` writes the password bytes to the child's stdin, then closes stdin. Assert via the mocked spawn's `stdin.write` calls.
- Exit-code parsing: `get` returns `null` on exit 44, the password on exit 0, throws on any other exit. `delete` returns silently on exit 0 or 44, throws on other exits.
- Stderr classification: a non-zero exit message must surface stderr's text in the thrown error, but the thrown error must NOT include the password argument (it isn't on argv anyway, but pin it as a property).

Run the suite (`pnpm --filter @avandar/desktop test`). Expected: every case FAILS.

- [ ] **Step 3: Write the failing integration test**

Create `apps/desktop/main/services/Keychain.integration.test.ts` (runs under `bun test`). Gate with:

```ts
const enabled =
  process.env.KEYCHAIN_E2E === "1" && process.platform === "darwin";
describe.skipIf(!enabled)("Keychain (real CLI)", () => { ... });
```

Cases (G2.14):

- set → get round-trips an ASCII password.
- set with non-ASCII payload (emoji + accented chars + a null-adjacent character `\u0001` that isn't a literal null) round-trips byte-for-byte.
- set → set (different value, same service/account) overwrites cleanly (the second `get` returns the new value).
- delete after set causes the next `get` to return `null`.
- delete on a missing entry is a no-op (doesn't throw).
- Negative assertion: across the full set→get→delete cycle, the password string never appears in any captured stdout or stderr the spawn surface produces (capture all child output and grep for the secret; assertion fails if found).

Run (`KEYCHAIN_E2E=1 pnpm --filter @avandar/desktop test:integration`). Expected: every case FAILS or skips until the implementation lands.

- [ ] **Step 4: Implement `Keychain.ts`**

Create `apps/desktop/main/services/Keychain.ts`:

```ts
/*
 * macOS Keychain wrapper. Shells out to `/usr/bin/security` instead of
 * binding `Security.framework` directly: the call frequency is ~1 read at
 * boot and ~1 write per Supabase access-token refresh, so `fork+exec`
 * overhead (~50-100ms) is invisible, and the trade buys us no FFI marshaling,
 * no segfault surface, and independence from Apple's deprecated `SecKeychain*`
 * C symbols. See the design spec's "Decisions Captured" section for the full
 * argument.
 *
 * The secret is fed via the child's stdin (never as a `-w VALUE` argv flag)
 * so it cannot leak to `ps`, audit logs, or shell history.
 */

const SECURITY_BIN = "/usr/bin/security";

if (process.platform !== "darwin") {
  // Windows lands in Phase 5 with the same shape against `cmdkey`. Throw
  // early on unsupported platforms so the failure is at boot, not on the
  // first sign-in.
  throw new Error(`Keychain not supported on ${process.platform}`);
}

export type Keychain = {
  set(serviceName: string, accountName: string, password: string): Promise<void>;
  get(serviceName: string, accountName: string): Promise<string | null>;
  delete(serviceName: string, accountName: string): Promise<void>;
};

// `Bun.spawn` injection seam — the unit tests replace it with a fake.
type Spawner = typeof Bun.spawn;

export function createKeychain(spawn: Spawner = Bun.spawn): Keychain {
  async function run(
    argv: ReadonlyArray<string>,
    stdinPayload?: string,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const child = spawn([SECURITY_BIN, ...argv], {
      stdin: stdinPayload === undefined ? "ignore" : "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    if (stdinPayload !== undefined && child.stdin) {
      child.stdin.write(stdinPayload);
      await child.stdin.end();
    }
    const [stdout, stderr] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    const exitCode = await child.exited;
    return { exitCode, stdout, stderr };
  }

  return {
    async set(serviceName, accountName, password) {
      // `-w` without a value forces `security` to read the password from
      // stdin. Keeps the secret off argv.
      const { exitCode, stderr } = await run(
        [
          "add-generic-password",
          "-U", // update if it exists
          "-s",
          serviceName,
          "-a",
          accountName,
          "-w",
        ],
        password,
      );
      if (exitCode !== 0) {
        throw new Error(`security add-generic-password exit ${exitCode}: ${stderr.trim()}`);
      }
    },

    async get(serviceName, accountName) {
      const { exitCode, stdout, stderr } = await run([
        "find-generic-password",
        "-w",
        "-s",
        serviceName,
        "-a",
        accountName,
      ]);
      if (exitCode === 44) {
        return null;
      }
      if (exitCode !== 0) {
        throw new Error(`security find-generic-password exit ${exitCode}: ${stderr.trim()}`);
      }
      // `security` always appends a newline.
      return stdout.replace(/\n$/, "");
    },

    async delete(serviceName, accountName) {
      const { exitCode, stderr } = await run([
        "delete-generic-password",
        "-s",
        serviceName,
        "-a",
        accountName,
      ]);
      // 44 = nothing matched; treat delete as idempotent.
      if (exitCode !== 0 && exitCode !== 44) {
        throw new Error(`security delete-generic-password exit ${exitCode}: ${stderr.trim()}`);
      }
    },
  };
}
```

Notes:

- `-U` on `add-generic-password` updates an existing entry in-place. The previous design's "delete-then-add" two-step is unnecessary and would leak a brief window where the entry is missing.
- The `Bun.spawn` injection seam lets the unit tests be hermetic. The integration test uses the default (real `Bun.spawn`).
- The wrapper is `async`; the previous FFI sketch was synchronous. The IPC handlers that consume Keychain are already `async`, so this is a non-issue. Keychain ops at boot are awaited just like the SQLite open already is.

- [ ] **Step 5: Run both test files and confirm green**

```bash
pnpm --filter @avandar/desktop test
KEYCHAIN_E2E=1 pnpm --filter @avandar/desktop test:integration
```

Expected: unit tests green; integration tests green on macOS, skipped otherwise. On the first integration-test run, macOS prompts "`bun` wants to access the Keychain" — click "Always Allow" for that binary.

- [ ] **Step 6: Implement auth IPC handlers**

Create `apps/desktop/main/ipc/auth.ts`. Note: per `defineIpcContract` / `IpcServer` paths in this repo, the real imports are `$/platform/ipc/contracts/AuthContracts` and the local `../ipc/createIpcServer/createIpcServer` — the `@avandar/platform` strings in earlier task snippets are a historical alias the rewrite never collapses.

```ts
import { AuthContracts } from "$/platform/ipc/contracts/AuthContracts";
import type { IpcServer } from "../createIpcServer/createIpcServer";
import type { Keychain } from "../../services/Keychain";

const KEYCHAIN_SERVICE = "com.avandarlabs.desktop";
const REFRESH_TOKEN_ACCOUNT = "supabase-refresh-token";

const SUPABASE_URL = process.env.AVA_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.AVA_SUPABASE_ANON_KEY ?? "";

// In-memory access token (never persisted).
let currentAccessToken: { token: string; expiresAt: number } | null = null;
let currentUser: { id: string; email: string } | null = null;

export function registerAuthHandlers(
  server: IpcServer,
  keychain: Keychain,
): void {
  server.handle(AuthContracts.signIn, async (req) => {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: req.email, password: req.password }),
      },
    );
    if (!res.ok) throw new Error(`Sign-in failed: ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      user: { id: string; email: string };
    };

    await keychain.set(KEYCHAIN_SERVICE, REFRESH_TOKEN_ACCOUNT, data.refresh_token);
    currentAccessToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    currentUser = { id: data.user.id, email: data.user.email };

    return {
      userId: data.user.id,
      email: data.user.email,
      accessToken: data.access_token,
      accessTokenExpiresAt: currentAccessToken.expiresAt,
    };
  });

  server.handle(AuthContracts.signOut, async () => {
    await keychain.delete(KEYCHAIN_SERVICE, REFRESH_TOKEN_ACCOUNT);
    currentAccessToken = null;
    currentUser = null;
    return { ok: true as const };
  });

  server.handle(AuthContracts.getSession, async () => {
    if (currentAccessToken && currentUser) {
      return {
        session: {
          userId: currentUser.id,
          email: currentUser.email,
          accessToken: currentAccessToken.token,
          accessTokenExpiresAt: currentAccessToken.expiresAt,
          mode: "online" as const,
        },
      };
    }
    // Try to refresh from keychain.
    const refreshToken = await keychain.get(KEYCHAIN_SERVICE, REFRESH_TOKEN_ACCOUNT);
    if (!refreshToken) return { session: null };
    try {
      const res = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        },
      );
      if (!res.ok) {
        // Offline or revoked. In offline mode we'd hydrate from local
        // `user_profiles` — Phase 2 stub returns null and lets the UI prompt
        // re-login. Phase 3 refines.
        return { session: null };
      }
      const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        user: { id: string; email: string };
      };
      await keychain.set(KEYCHAIN_SERVICE, REFRESH_TOKEN_ACCOUNT, data.refresh_token);
      currentAccessToken = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };
      currentUser = { id: data.user.id, email: data.user.email };
      return {
        session: {
          userId: data.user.id,
          email: data.user.email,
          accessToken: data.access_token,
          accessTokenExpiresAt: currentAccessToken.expiresAt,
          mode: "online" as const,
        },
      };
    } catch {
      return { session: null };
    }
  });

  server.handle(AuthContracts.refreshIfNeeded, async () => {
    if (
      currentAccessToken &&
      currentAccessToken.expiresAt > Date.now() + 60_000
    ) {
      return { refreshed: false };
    }
    const session = await getSessionViaRefresh(keychain);
    return { refreshed: session !== null };
  });
}

async function getSessionViaRefresh(keychain: Keychain) {
  const refreshToken = await keychain.get(KEYCHAIN_SERVICE, REFRESH_TOKEN_ACCOUNT);
  if (!refreshToken) return null;
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: { id: string; email: string };
  };
  Keychain.set(KEYCHAIN_SERVICE, REFRESH_TOKEN_ACCOUNT, data.refresh_token);
  currentAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  currentUser = { id: data.user.id, email: data.user.email };
  return currentAccessToken;
}

export function getCurrentAccessToken(): string | null {
  return currentAccessToken?.token ?? null;
}
```

- [ ] **Step 6: Implement webview-side `DesktopAuthProvider`**

Create `shared/platform/desktop/DesktopAuthProvider.ts`:

```ts
import { callIpc } from "../ipc/client.ts";
import { AuthContracts } from "../ipc/contracts.ts";
import type {
  AuthCredentials,
  AuthProvider,
  Session,
  Unsubscribe,
} from "../types/AuthProvider.types.ts";

const listeners = new Set<(session: Session | null) => void>();

export const DesktopAuthProvider: AuthProvider = {
  async getSession() {
    const r = await callIpc(AuthContracts.getSession, {});
    return r.session ?? null;
  },
  async signIn(credentials: AuthCredentials) {
    if (credentials.kind !== "password") {
      throw new Error("DesktopAuthProvider only supports password auth in V1");
    }
    const r = await callIpc(AuthContracts.signIn, {
      email: credentials.email,
      password: credentials.password,
    });
    const session: Session = {
      userId: r.userId,
      email: r.email,
      accessToken: r.accessToken,
      accessTokenExpiresAt: r.accessTokenExpiresAt,
      mode: "online",
    };
    listeners.forEach((cb) => cb(session));
    return session;
  },
  async signOut() {
    await callIpc(AuthContracts.signOut, {});
    listeners.forEach((cb) => cb(null));
  },
  async refreshIfNeeded() {
    await callIpc(AuthContracts.refreshIfNeeded, {});
  },
  onAuthChange(callback): Unsubscribe {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
};
```

- [ ] **Step 7: Register auth handlers in main**

Modify `apps/desktop/main/index.ts`:

```ts
import { createKeychain } from "./services/Keychain";
import { registerAuthHandlers } from "./ipc/registerAuthHandlers/registerAuthHandlers";

const keychain = createKeychain();

// ... after registerDuckDbHandlers:
registerAuthHandlers(ipcServer, keychain);
```

- [ ] **Step 8: Smoke test the desktop auth flow end-to-end**

```bash
pnpm dev:desktop
```

In the window: sign in, close the app, reopen. The second launch should reach the post-login state without prompting.

- [ ] **Step 9: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm --filter @avandar/desktop test
  KEYCHAIN_E2E=1 pnpm --filter @avandar/desktop test:integration
  pnpm --filter @avandar/desktop type-check
  pnpm type-check
  ```

  Expected: unit tests green (mocked-spawn pure-layer); integration tests green on macOS against the real `security` CLI; type-check clean.

  **Verify:**
  - `apps/desktop/main/services/Keychain.ts`:
    - shells out to the absolute path `/usr/bin/security` (no `$PATH` lookup),
    - feeds the secret through the child's stdin, never as an argv value (`-w` without a value, then `child.stdin.write(password)`),
    - never logs the secret in any code path (including thrown errors that quote stderr),
    - treats exit 44 from `find-generic-password` as `null`, exit 44 from `delete-generic-password` as a no-op (idempotent),
    - exposes a `Bun.spawn` injection seam so the unit tests can run hermetically.
  - `apps/desktop/main/ipc/auth.ts` registers `auth.*` handlers wired to an injected `Keychain` instance (not a module-level singleton).
  - `shared/platform/desktop/DesktopAuthProvider.ts` implements the same auth-provider interface the web side uses and persists the session via the auth IPC.
  - `apps/desktop/main/index.ts` constructs `keychain = createKeychain()` at boot and passes it into `registerAuthHandlers`. The snapshot bootstrap from Task 9 should now source its access token from the keychain-backed session rather than `AVA_DEV_ACCESS_TOKEN`.
  - Keychain service identifier is `com.avandarlabs.desktop` (unambiguous in Keychain Access.app).
  - Test groupings G2.13, G2.14 are authored, and each grouping's mutation-test step is recorded per the testing strategy.

  **Manual smoke test (desktop app — `pnpm dev:desktop`):**
  1. Wipe local state: `rm "$HOME/Library/Application Support/Avandar/metadata.sqlite"*` and ensure no prior Keychain entry for Avandar exists (delete it in Keychain Access.app if present).
  2. Launch the desktop app — it should land on the sign-in screen.
  3. Sign in with a real seeded user.
  4. Open `Keychain Access.app`, search for `Avandar`, and confirm:
     - exactly one entry exists for the signed-in account,
     - the entry's "Where" / service name matches what `Keychain.ts` writes,
     - the password is not stored in plaintext anywhere in `~/Library/Application Support/Avandar/`.
  5. Quit the app fully.
  6. Relaunch the app. Confirm it boots straight into the post-login state — no credential prompt.
  7. Trigger sign-out in the UI.
  8. Re-check Keychain Access — confirm the Avandar entry is gone.
  9. Relaunch one more time — confirm the app now lands on the sign-in screen again.

  Expected: session survives restarts via Keychain only; the Keychain entry is created on sign-in and removed on sign-out; no fallback file-based session store exists in userDataDir.

  **Greenlight criteria:** sign-in → quit → restart → restored, and sign-out → entry deleted, both verified against Keychain Access.app, before moving to Task 12.

---

## Task 12: `FileSystemDatasetBlobStore` + IPC

**Test groupings:** G2.15 (FileSystemDatasetBlobStore round-trip + listing + stat + delete); G2.16 (FileSystemDatasetBlobStore atomic-write crash simulation — monkey-patch renameSync to throw post-write; assert final key absent, partial .tmp may exist; path-traversal guard for ../ and ..\\; the test that proves the atomicity invariant the manual review can't).

**PR boundaries:** 2 PRs.

- PR 1: `FileSystemDatasetBlobStore` implementation + tests + DatasetBlob IPC handlers in `apps/desktop/main`; new desktop-only files, not yet wired.
- PR 2: Desktop adapter (`createIpcDatasetBlobStore`) + wiring into platform provider's desktop branch; web continues to use its existing store.

The desktop equivalent of `DatasetBlobStore`. Atomic writes, on-disk per-OS-user.

**Files:**

- Create: `apps/desktop/main/services/FileSystemDatasetBlobStore.ts`
- Test: `apps/desktop/main/services/FileSystemDatasetBlobStore.test.ts`
- Create: `apps/desktop/main/ipc/dataset-blob.ts`
- Create: `shared/platform/desktop/DesktopDatasetBlobStore.ts`
- Modify: `apps/desktop/main/index.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/main/services/FileSystemDatasetBlobStore.test.ts`:

```ts
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFileSystemDatasetBlobStore } from "./FileSystemDatasetBlobStore.ts";

describe("FileSystemDatasetBlobStore", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("put then get round-trips bytes", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-blob-test-"));
    const store = createFileSystemDatasetBlobStore(dir);
    const key = "workspaces/w/datasets/d/data.parquet";
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    await store.put(key, bytes);
    const out = await store.getBytes(key);
    expect(Array.from(out)).toEqual([1, 2, 3, 4, 5]);
  });

  it("exists / stat reflect state", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-blob-test-"));
    const store = createFileSystemDatasetBlobStore(dir);
    expect(await store.exists("missing")).toBe(false);
    await store.put("present", new Uint8Array([1, 2]));
    expect(await store.exists("present")).toBe(true);
    const stat = await store.stat("present");
    expect(stat?.sizeBytes).toBe(2);
  });

  it("delete removes the file", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-blob-test-"));
    const store = createFileSystemDatasetBlobStore(dir);
    await store.put("rm-me", new Uint8Array([9]));
    await store.delete("rm-me");
    expect(await store.exists("rm-me")).toBe(false);
  });

  it("put writes atomically — interrupted .tmp file should not be visible", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-blob-test-"));
    const store = createFileSystemDatasetBlobStore(dir);
    await store.put("k", new Uint8Array([1, 2, 3]));
    // Internal: ensure no .tmp remnant
    expect(() => statSync(join(dir, "k.tmp"))).toThrow();
  });

  it("list returns matching keys under a prefix", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-blob-test-"));
    const store = createFileSystemDatasetBlobStore(dir);
    await store.put("a/x", new Uint8Array([1]));
    await store.put("a/y", new Uint8Array([1]));
    await store.put("b/z", new Uint8Array([1]));
    const keys = await store.list("a/");
    expect([...keys].sort()).toEqual(["a/x", "a/y"]);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/desktop test
```

Expected: FAIL.

- [ ] **Step 3: Implement the store**

Create `apps/desktop/main/services/FileSystemDatasetBlobStore.ts`:

```ts
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

export type FileSystemDatasetBlobStore = {
  put(key: string, bytes: Uint8Array): Promise<void>;
  getBytes(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<ReadonlyArray<string>>;
  stat(key: string): Promise<{ sizeBytes: number; mtimeMs: number } | null>;
};

export function createFileSystemDatasetBlobStore(
  rootDir: string,
): FileSystemDatasetBlobStore {
  function pathFor(key: string): string {
    if (key.includes("..")) throw new Error(`Invalid key: ${key}`);
    return join(rootDir, key);
  }

  return {
    async put(key, bytes) {
      const dst = pathFor(key);
      mkdirSync(dirname(dst), { recursive: true });
      const tmp = `${dst}.tmp`;
      writeFileSync(tmp, bytes);
      renameSync(tmp, dst);
    },
    async getBytes(key) {
      return readFileSync(pathFor(key));
    },
    async delete(key) {
      const p = pathFor(key);
      if (existsSync(p)) unlinkSync(p);
    },
    async exists(key) {
      return existsSync(pathFor(key));
    },
    async stat(key) {
      const p = pathFor(key);
      if (!existsSync(p)) return null;
      const s = statSync(p);
      return { sizeBytes: s.size, mtimeMs: s.mtimeMs };
    },
    async list(prefix) {
      const base = pathFor(prefix);
      if (!existsSync(base)) return [];
      const out: string[] = [];
      function walk(dir: string) {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.isFile()) {
            const k = relative(rootDir, full).split("\\").join("/");
            // skip in-flight .tmp files
            if (!k.endsWith(".tmp")) out.push(k);
          }
        }
      }
      walk(base);
      return out;
    },
  };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
pnpm --filter @avandar/desktop test
```

Expected: green.

- [ ] **Step 5: Implement IPC handlers**

Create `apps/desktop/main/ipc/dataset-blob.ts`:

```ts
import { DatasetBlobContracts } from "@avandar/platform";
import type { FileSystemDatasetBlobStore } from "../services/FileSystemDatasetBlobStore.ts";
import type { IpcServer } from "@avandar/platform";

export function registerDatasetBlobHandlers(
  server: IpcServer,
  store: FileSystemDatasetBlobStore,
): void {
  server.handle(DatasetBlobContracts.put, async (req) => {
    const bytes = Buffer.from(req.bytesBase64, "base64");
    await store.put(req.key, bytes);
    return { bytesWritten: bytes.length };
  });

  server.handle(DatasetBlobContracts.get, async (req) => {
    const bytes = await store.getBytes(req.key);
    return { bytesBase64: Buffer.from(bytes).toString("base64") };
  });

  server.handle(DatasetBlobContracts.delete, async (req) => {
    await store.delete(req.key);
    return { deleted: true };
  });

  server.handle(DatasetBlobContracts.exists, async (req) => {
    return { exists: await store.exists(req.key) };
  });

  server.handle(DatasetBlobContracts.list, async (req) => {
    return { keys: await store.list(req.prefix) };
  });

  server.handle(DatasetBlobContracts.stat, async (req) => {
    return { stat: await store.stat(req.key) };
  });
}
```

- [ ] **Step 6: Implement webview-side `DesktopDatasetBlobStore`**

Create `shared/platform/desktop/DesktopDatasetBlobStore.ts`:

```ts
import { callIpc, DatasetBlobContracts } from "../ipc/contracts.ts";
import type {
  DatasetBlobKey,
  DatasetBlobStat,
  DatasetBlobStore,
} from "../types/DatasetBlobStore.types.ts";

export const DesktopDatasetBlobStore: DatasetBlobStore = {
  async put(key, bytes) {
    const arr =
      bytes instanceof Uint8Array ? bytes : await streamToUint8Array(bytes);
    const b64 = uint8ArrayToBase64(arr);
    await callIpc(DatasetBlobContracts.put, {
      key: key as string,
      bytesBase64: b64,
    });
  },
  async get(key) {
    const r = await callIpc(DatasetBlobContracts.get, { key: key as string });
    const bytes = base64ToUint8Array(r.bytesBase64);
    return new Response(bytes).body!;
  },
  async delete(key) {
    await callIpc(DatasetBlobContracts.delete, { key: key as string });
  },
  async exists(key) {
    return (await callIpc(DatasetBlobContracts.exists, { key: key as string }))
      .exists;
  },
  async list(prefix) {
    const r = await callIpc(DatasetBlobContracts.list, {
      prefix: prefix as string,
    });
    return r.keys as ReadonlyArray<DatasetBlobKey>;
  },
  async stat(key): Promise<DatasetBlobStat | null> {
    return (await callIpc(DatasetBlobContracts.stat, { key: key as string }))
      .stat;
  },
};

async function streamToUint8Array(s: ReadableStream<Uint8Array>) {
  const chunks: Uint8Array[] = [];
  const reader = s.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.byteLength;
  }
  return out;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let s = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(s);
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
```

- [ ] **Step 7: Register handlers in `index.ts`**

Modify `apps/desktop/main/index.ts`:

```ts
import { registerDatasetBlobHandlers } from "./ipc/dataset-blob.ts";
import { createFileSystemDatasetBlobStore } from "./services/FileSystemDatasetBlobStore.ts";

// ... after dataDir resolution:
const datasetBlobStore = createFileSystemDatasetBlobStore(
  join(dataDir, "blobs"),
);

// ... after registerAuthHandlers:
registerDatasetBlobHandlers(ipcServer, datasetBlobStore);
```

- [ ] **Step 8: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm --filter @avandar/desktop test
  pnpm --filter @avandar/desktop type-check
  pnpm type-check
  ```

  Expected: `FileSystemDatasetBlobStore.test.ts` covers happy path + crash-during-write + read-after-write, all pass; type-check clean.

  **Verify:**
  - `apps/desktop/main/services/FileSystemDatasetBlobStore.ts`:
    - writes go through `<final>.tmp` + `rename` for atomicity,
    - layout matches the spec: `workspaces/<wsId>/datasets/<dsId>/source.<ext>`, `data.parquet`, `meta.json`,
    - reads verify the file exists before returning a stream/handle,
    - delete is recursive and bounded to the dataset directory (cannot escape).
  - `apps/desktop/main/ipc/dataset-blob.ts` registers `dataset-blob.*` handlers from Task 1.
  - `shared/platform/desktop/DesktopDatasetBlobStore.ts` implements the same interface the web `DatasetBlobStore` implements (so consumers don't branch).
  - `apps/desktop/main/index.ts` constructs the store rooted at `<userDataDir>/blobs` and wires it into the IPC server.
  - Test groupings G2.15, G2.16 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test (desktop app — `pnpm dev:desktop`):**
  1. Sign in (Keychain path from Task 11) and navigate to a workspace.
  2. Upload a small CSV via the Datasets UI.
  3. Watch desktop logs for `[blob-store] wrote …` (or whatever log line the implementation emits).
  4. Locate the file on disk:
     ```bash
     ls -la "$HOME/Library/Application Support/Avandar/blobs/workspaces/"
     find "$HOME/Library/Application Support/Avandar/blobs/workspaces" -type f
     ```
  5. Confirm:
     - `source.csv` exists with the uploaded CSV's contents.
     - `data.parquet` exists (if dataset ingestion produces parquet at upload time).
     - `meta.json` exists and parses, with sane fields (size, mime, timestamps).
     - NO leftover `*.tmp` files in any dataset dir (atomicity proof).
  6. Quit the app, relaunch, reopen the dataset — confirm the preview still loads (proves disk persistence + read path).
  7. Delete the dataset from the UI and confirm the dataset directory is removed from disk.

  Expected: the upload lands at the documented path, atomic-write leaves no `.tmp` debris, restart still finds the data, and delete cleans up the directory.

  **Greenlight criteria:** at least one full upload → quit → restart → reload → delete cycle works through `DesktopDatasetBlobStore`, with the on-disk layout matching the spec, before moving to Task 13.

---

## Task 13: Wire the platform implementations into the React app

**Test groupings:** G2.17 (PlatformProvider React component — mocked isDesktop; both branches resolve to correct adapter; usePlatform outside provider throws); G2.18 (Fake-IPC harness scaffolding itself — proves the harness's exposeFunction bridge correctly routes a trivial echo contract; lands before any e2e test depends on it); G2.19 (First fake-IPC e2e — sign in → upload CSV → list datasets → harness restart → dataset still listed; replaces multiple manual smoke steps in Tasks 8/12/13).

**PR boundaries:** 4-5 PRs.

- PR 1: PlatformProvider scaffold + `usePlatform` hook + provider tests (no implementations wired yet — defaults to web for both branches).
- PR 2: Wire the desktop branch for DuckDbClient.
- PR 3: Wire the desktop branch for DatasetBlobStore.
- PR 4: Wire the desktop branch for AuthProvider.
- PR 5: Wire any remaining desktop adapters (e.g., RdbCrudClient if not already wired via Task 8's factory).
- Each PR is independently safe because Phase 1 established the factory pattern and desktop has no current users; web continues to use its existing implementations selected by `isDesktop() === false`. (ServerApiClient wiring lives in Task 14.)

The webview-side `Desktop*` implementations exist but aren't consumed yet. Wire them in via a `PlatformProvider` React context.

**Files:**

- Create: `packages/web/hooks/src/platform/PlatformProvider.tsx` (or wherever shared hooks live)
- Modify: `src/main.tsx` to wrap with PlatformProvider

- [ ] **Step 1: Create the PlatformProvider**

Locate `packages/web/hooks` or the equivalent. If unsure:

```bash
git grep -l "createContext" -- 'packages/web' 'src/'
```

Create the context at a location consistent with the codebase's conventions. The contract:

```ts
import { createContext, useContext, type ReactNode } from "react";
import { isDesktop } from "@avandar/platform";
import type {
  AuthProvider,
  DatasetBlobStore,
  DuckDbClient,
  RdbClient,
} from "@avandar/platform";
import { DesktopAuthProvider } from "@avandar/platform/desktop/DesktopAuthProvider.ts";
import { DesktopDuckDbClient } from "@avandar/platform/desktop/DesktopDuckDbClient.ts";
import { DesktopDatasetBlobStore } from "@avandar/platform/desktop/DesktopDatasetBlobStore.ts";

export type PlatformImpls = {
  readonly duckDb: DuckDbClient;
  readonly authProvider: AuthProvider;
  readonly datasetBlobStore: DatasetBlobStore;
};

const PlatformContext = createContext<PlatformImpls | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const impls = isDesktop() ? desktopImpls : webImpls;
  return (
    <PlatformContext.Provider value={impls}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformImpls {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}

const desktopImpls: PlatformImpls = {
  duckDb: DesktopDuckDbClient,
  authProvider: DesktopAuthProvider,
  datasetBlobStore: DesktopDatasetBlobStore,
};

// Web implementations: thin wrappers over today's code.
const webImpls: PlatformImpls = {
  // Phase 1 introduced the interfaces; Phase 2 wires the web adapters.
  // If the web adapters were stubbed in Phase 1, replace them here with the
  // actual references to existing code.
  duckDb: createWebDuckDbAdapter(),
  authProvider: createWebAuthProviderAdapter(),
  datasetBlobStore: createWebDatasetBlobStoreAdapter(),
};

function createWebDuckDbAdapter(): DuckDbClient {
  // Wrap existing src/clients/DuckDbClient/DuckDbClient.ts
  // For Phase 2, return the existing singleton instance behind the interface.
  // Implementation lives in src/, this file lives in packages/, so do not
  // import directly; instead, the *consumer* injects via Provider props.
  // Refactor opportunity: move PlatformProvider into src/ if cross-package
  // wiring causes friction. For Phase 2, keep the adapter inline at the
  // root `main.tsx`.
  throw new Error("createWebDuckDbAdapter: define in src/ where existing DuckDbClient is importable");
}

function createWebAuthProviderAdapter(): AuthProvider {
  throw new Error("createWebAuthProviderAdapter: same");
}

function createWebDatasetBlobStoreAdapter(): DatasetBlobStore {
  throw new Error("createWebDatasetBlobStoreAdapter: same");
}
```

**Note:** the web adapter wiring is intrinsically _in_ `src/` because that's where the existing concrete classes live. Move `PlatformProvider.tsx` to `src/config/platform/PlatformProvider.tsx` instead, where it can import existing modules without crossing the package boundary. Update imports accordingly.

- [ ] **Step 2: Wrap the React tree**

Edit `src/main.tsx` (or the equivalent root render file) to wrap the existing tree:

```tsx
import { PlatformProvider } from "@/config/platform/PlatformProvider.tsx";

createRoot(rootElement).render(
  <PlatformProvider>{/* existing root component */}</PlatformProvider>,
);
```

- [ ] **Step 3: Migrate the first consumer**

Pick one place that uses `DuckDbClient.getInstance()` today. Replace with `usePlatform().duckDb`. Verify behavior unchanged on web.

```bash
pnpm dev
```

Then on desktop:

```bash
pnpm dev:desktop
```

If the desktop fails because `runStructuredQuery` isn't implemented (Task 10 left it as a TODO), that's the signal that this consumer needs structured-query support before the migration completes. Either:

- Add structured-query support to `DesktopDuckDbClient` (porting the translator from `src/clients/DuckDbClient/`).
- Defer this particular consumer's desktop migration to Phase 3.

- [ ] **Step 4: Migrate remaining consumers in batches**

Repeat for every `DuckDbClient.getInstance()`, every direct `AvaSupabase` auth call, and every Dexie `LocalDataset` access. Each becomes a `usePlatform().*` call. Commit in batches of ~5 consumers.

- [ ] **Step 5: Full test sweep**

```bash
pnpm test
pnpm dev
pnpm dev:desktop
```

Expected: green; both shells work.

- [ ] **Step 6: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm test
  pnpm type-check
  pnpm dev
  pnpm dev:desktop
  ```

  Expected: all tests pass; both web (`pnpm dev`) and desktop (`pnpm dev:desktop`) shells boot without runtime errors or `usePlatform()` undefined warnings.

  **Verify:**
  - `PlatformProvider` is created in the documented location (`packages/web/hooks` or the equivalent) and exports a `usePlatform()` hook.
  - The provider picks the desktop implementations (`DesktopAuthProvider`, `DesktopDuckDbClient`, `DesktopDatasetBlobStore`, `createSqliteCrudClient`) when running under Electrobun, and the web implementations otherwise — gated by an `isDesktop()` check, not by NODE_ENV.
  - `src/main.tsx` wraps the React tree with `<PlatformProvider>` ABOVE any consumer.
  - Existing call sites that used to import the web implementations directly now read them from `usePlatform()` (audit at least the auth, dataset, and query call sites).
  - No web-only modules (Dexie, duckdb-wasm) execute on the desktop runtime path.
  - Test groupings G2.17, G2.18, G2.19 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test — full desktop happy path (`pnpm dev:desktop`):**
  1. Wipe userDataDir for a true cold start: `rm -rf "$HOME/Library/Application Support/Avandar"`.
  2. Launch the desktop app.
  3. Sign in as a seeded user — confirm the Keychain entry is created (Task 11 territory, re-verify here).
  4. Watch logs for snapshot bootstrap completing (Task 9).
  5. List workspaces — confirm rows appear (proves SQLite-backed CRUD client + bootstrap).
  6. Open a dataset and run a query — confirm DuckDB result renders (proves native DuckDB IPC).
  7. Upload a new CSV dataset — confirm `source.csv`, `data.parquet`, `meta.json` land on disk under `~/Library/Application Support/Avandar/blobs/workspaces/<wsId>/datasets/<dsId>/`.
  8. Quit the app fully.
  9. Relaunch — confirm:
     - lands in post-login state (no sign-in prompt),
     - snapshot bootstrap logs a "skip" message,
     - workspaces still listed,
     - newly-uploaded dataset still present and previewable.
  10. Open the same routes in `pnpm dev` (web shell) — confirm the web implementations still work (no accidental desktop-only imports leaking into web).

  Expected: every step renders without errors and survives restart; web shell is unaffected.

  **Greenlight criteria:** the full desktop happy path completes end-to-end on a cold userDataDir AND the web shell still works, before moving to Task 14.

---

## Task 14: ServerApi IPC handlers + desktop `ServerApiClient` implementation

**Test groupings:** G2.20 (ServerApi IPC round-trip — RPC and Edge Function calls dispatched via IPC, executed by Bun-main against a mocked Supabase REST via msw; offline path throws OfflineError; auth header is injected by the handler, not the React client).

**PR boundaries:** 2 PRs.

- PR 1: Bun-main `api.ts` IPC handler + ServerApi IPC server registration + tests; new desktop-only file, not yet consumed.
- PR 2: Replace the Phase 1 stub in `createIpcServerApiClient.ts` with the real IPC client implementation and wire it into the PlatformProvider's desktop branch; desktop-only code path, web continues using its existing ServerApiClient.

**Files:**

- Create: `apps/desktop/main/ipc/api.ts` — Bun-main IPC handler implementing `registerServerApiHandlers(ipcServer, { supabaseUrl, supabaseAnonKey, authProvider })`. The handler reads the current access token from the AuthProvider on every call.
- Modify: `packages/shared/clients/src/ServerApiClient/createIpcServerApiClient.ts` — replace the Phase 1 throwing stub with a real IPC client that issues `serverApi.rpc` / `serverApi.invokeFunction` calls over the IPC bridge.
- Test: `apps/desktop/main/ipc/api.test.ts` — integration test with msw + real IPC server.
- Test: `packages/shared/clients/src/ServerApiClient/createIpcServerApiClient.test.ts` — unit test with mocked IPC bridge.

**Steps:**

- [ ] **Step 1: Write the failing test for the IPC client**

Create `createIpcServerApiClient.test.ts`. Cases: rpc call dispatched on correct channel with correct envelope; invokeFunction same; error reply surfaces as a thrown Error in the caller; OfflineError surfaces when the handler reports offline.

- [ ] **Step 2: Implement the IPC client**

Replace the Phase 1 stub in `createIpcServerApiClient.ts` with a real implementation that uses the IPC bridge from Phase 2 Task 2. Methods proxy through the typed contracts defined in Task 1.

- [ ] **Step 3: Run the test and confirm green**

```bash
pnpm --filter @avandar/clients test ServerApiClient
```

- [ ] **Step 4: Write the failing test for the handler module**

Create `apps/desktop/main/ipc/api.test.ts` using `bun test`. Spin up a real `createIpcServer`, register the handler with a fake Supabase REST (msw). Cases:

- `serverApi.rpc("some_rpc", {...})` round-trips and returns the mocked response.
- `serverApi.invokeFunction({ route, method, body })` round-trips and returns `{ data, status }`.
- A 401 from Supabase surfaces as a typed error.
- An offline scenario (msw throws NetworkError) surfaces as `OfflineError`.
- The handler injects the current access token from AuthProvider on every call — verified by inspecting the msw request headers.

- [ ] **Step 5: Implement the handler module**

Create `apps/desktop/main/ipc/api.ts`. Use Bun's native `fetch` to call Supabase. The handler accepts `{ supabaseUrl, supabaseAnonKey, authProvider }` at construction. On each call it reads the current session from AuthProvider, builds the appropriate request (`/rest/v1/rpc/<name>` for rpc; `/functions/v1/<path>` for invokeFunction), and returns the deserialized response.

- [ ] **Step 6: Run the handler test and confirm green**

```bash
pnpm --filter @avandar/desktop test api
```

- [ ] **Step 7: Wire the new client into the platform implementations**

Update wherever Task 13 wires PlatformProvider's desktop branch — `createServerApiClient()` on desktop now resolves to `createIpcServerApiClient()` instead of the Phase 1 stub.

- [ ] **Step 8: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  pnpm --filter @avandar/desktop test api
  pnpm --filter @avandar/clients test ServerApiClient
  pnpm type-check
  ```

  Expected: all green.

  **Verify:**
  - `apps/desktop/main/ipc/api.ts` registers `serverApi.rpc` and `serverApi.invokeFunction` handlers
  - `createIpcServerApiClient.ts` no longer throws — it issues real IPC calls
  - Auth header injection happens in the Bun-main handler, not in the React client (grep the React code: `git grep "Bearer " -- src/`)
  - Test groupings G2.20 are authored (in this PR or as a separate PR to be merged before this checkpoint is greenlit), and the mutation-test step is recorded per the testing strategy

  **Manual smoke test (desktop app — `pnpm dev:desktop`):**
  1. Sign in as seeded user
  2. Navigate to a page that previously exercised an `APIClient` call (e.g. workspaces list, query execution)
  3. Watch Bun-main logs for `[ipc:serverApi.invokeFunction]` lines — proves the call routed through Bun main, not direct webview→Supabase
  4. Toggle Wi-Fi off; navigate to a page that calls a migrated RPC (the dataset/workspace flows); confirm the call fails with a typed `OfflineError`, not a generic `fetch` error
  5. Toggle Wi-Fi on; confirm the call succeeds again

  Expected: every Supabase call (CRUD, auth, RPC, Edge Function) is now visible from Bun-main logs — single network egress invariant holds.

  **Greenlight criteria:** all checks above pass before moving to Task 15 (acceptance).

---

## Task 15: Phase 2 acceptance checklist

**PR boundaries:** No code-change boundaries — verification-only. The spec annotation Step (if it ships a doc edit) is a single safe doc-only PR; remaining Steps are manual gates between prior PRs.

- [ ] **Step 1: Confirm migrations applied at startup**

```bash
pnpm dev:desktop
```

Inspect `~/Library/Application Support/Avandar/metadata.sqlite`:

```bash
sqlite3 ~/Library/Application\ Support/Avandar/metadata.sqlite "select name from sqlite_master where type='table';"
```

Expected: lists every table in `SYNCABLE_TABLES`.

- [ ] **Step 2: Confirm read-after-login works**

Log in via the desktop app. After login, navigate to a dataset list view. Confirm rows render. Quit the app. Disconnect from network. Relaunch.

Expected: app starts, session restored from keychain, data view _still renders_ (reading from local SQLite). This is the headline Phase 2 deliverable.

- [ ] **Step 3: Confirm upload writes to disk**

Upload a small CSV via the desktop app's dropzone. Expected files appear on disk:

```bash
ls ~/Library/Application\ Support/Avandar/blobs/workspaces/<wsId>/datasets/<dsId>/
```

- [ ] **Step 4: Confirm migration drift CI check**

```bash
pnpm check:sqlite-migrations
```

Expected: passes.

- [ ] **Step 5: Confirm tests green**

```bash
pnpm test
```

- [ ] **Step 6: Mark Phase 2 complete in the spec**

Edit `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md`, mark Phase 2 complete with today's date.

- [ ] **Step 7: Manual review checkpoint (do NOT commit)**

  **Run:**

  ```bash
  git status docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md
  git diff docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md
  ```

  Expected: the spec shows a Phase 2 completion marker with today's date and no other unrelated edits.

  **Final reviewer checklist — confirm every prior Task checkpoint passed before declaring Phase 2 done:**
  - [ ] Task 1 — IPC contracts: unit + type tests green, all Phase 2 contracts declared.
  - [ ] Task 2 — IPC client: tests green, `__setIpcBridgeForTests` seam works.
  - [ ] Task 3 — IPC server: tests green, contract types symmetric with client.
  - [ ] Task 4 — `userDataDir`: macOS branch returns `~/Library/Application Support/Avandar` on a real launch.
  - [ ] Task 5 — `SYNCABLE_TABLES`: manifest reviewed against live Supabase schema, shape tests pass.
  - [ ] Task 6 — migration generator: `pnpm check:sqlite-migrations` is clean and one generated migration was manually inspected.
  - [ ] Task 7 — Sqlite + runner: fresh launch produces `metadata.sqlite` with the expected schema; second launch is a no-op.
  - [ ] Task 8 — RDB IPC + `createSqliteCrudClient`: full create → restart → read cycle works on disk.
  - [ ] Task 9 — snapshot bootstrap: fresh userDataDir hydrates from Supabase; second launch skips.
  - [ ] Task 10 — native DuckDB: at least one query renders via the native binding with no `duckdb-wasm` activity on desktop.
  - [ ] Task 11 — Keychain: sign-in persists across restart via Keychain Access entry; sign-out deletes it.
  - [ ] Task 12 — `FileSystemDatasetBlobStore`: upload lands at the documented path with `source.<ext>`, `data.parquet`, `meta.json`; no `.tmp` debris; survives restart.
  - [ ] Task 13 — wired into React: full desktop happy path completes on cold userDataDir; web shell unaffected.
  - [ ] Task 14 — ServerApi IPC handler and desktop client are wired (G2.20 merged); single-network-egress invariant verified by inspecting Bun-main logs during a full desktop smoke.

  **Manual smoke test:** none beyond confirming the spec edit reads correctly. (No new code in this task.)

  Expected: the spec is the only modified file, the Phase 2 marker is accurate, and every prior task checkbox above has been ticked off based on real verification — not just inspection.

  **Greenlight criteria:** every prior checkpoint above is checked AND the spec edit is reviewed and ready for the user to commit themselves. Do NOT commit on the user's behalf.

---

## Out of Scope for Phase 2

- Sync engine (Phase 3): no push/pull loops, no outboxes, no parquet upload
- Realtime subscriptions
- Logger desktop sink (Phase 4)
- Code signing / notarization / auto-update (Phase 4)
- Windows port (Phase 5)
- LRU GC of parquets, disk-pressure heuristics (V2)

---

## Risks Specific to Phase 2

| Risk                                                                                 | Mitigation in this phase                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sqlglot output requires per-table touch-ups for Postgres-only features               | Hard-error generator + human review in Task 6 Step 9; fix the _generator_ not the output                                                                                                                               |
| `security` CLI output / exit-code format drifts on a new macOS release                | Pure-layer unit tests pin the expected argv shape, exit codes (0, 44), and stdout newline handling; gated integration test (G2.14) catches drift against the real binary on each supported macOS version; thrown errors quote stderr so a regression surfaces with the exact OS message instead of a silent wrong-result |
| Native `duckdb` Node binding fails to load under Bun                                 | Phase 2 Task 10 tests catch this; if blocked, evaluate `@duckdb/node-api` or compile against duckdb-bindings-node-bun. Worst case: stay on duckdb-wasm for desktop in Phase 2 and accept the memory limits temporarily |
| Webview ↔ Bun IPC pipeline mismatches Electrobun's actual API                        | Task 8 Step 2 explicitly calls out the `window.ipc` shim — engineer adapts to real names                                                                                                                               |
| Dropping duckdb-wasm from desktop bundle breaks if some code path imports it eagerly | Decision in Task 10 Step 9 — if blocked, accept the bundle bloat; do not delay Phase 2 on this optimization                                                                                                            |
