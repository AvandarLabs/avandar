# Electrobun Desktop — Phase 2.5: Consumer Migration & Phase 2 Acceptance

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Per-step test handoff:** After completing every Step in this plan, output an enumerated list (`1.`, `2.`, `3.`, …) of the exact actions the human partner should take to verify the just-completed Step — commands to run (copy-pasteable), files or UI to inspect, and the expected result for each. Do this for every Step, including "trivial" config/file-creation steps; never skip or summarize. The list is in addition to (not a replacement for) the Manual review checkpoint at the end of each Task.
>
> **PR rule:** Every Task ships as exactly **one PR**. Steps are progress markers _within_ a Task, not independent PR boundaries — never split a Task across multiple PRs, and never bundle two Tasks into one PR. When a per-Task `**PR boundaries:**` note below mentions multiple PRs (carried over from an earlier revision), treat that as a signal the Task should be **decomposed into multiple smaller Tasks**, not shipped as multi-PR work.

**Spec:** `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md`

**Testing strategy:** `docs/superpowers/specs/2026-05-14-testing-strategy.md` — defines per-PR test groupings; this phase reuses Phase 2's `G2.x` groupings where consumers are exercised end-to-end and introduces `G2.5.x` for the new web adapters and the IPC bridge smoke.

**Goal:** Make the native services that Phase 2 wired up _actually used_ by the React webview. Phase 2 landed all the privileged Bun-main services (SQLite, native DuckDB, OS keychain, filesystem blob store) plus the IPC contracts and bridge, but every React consumer still imports the legacy web modules directly. Phase 2.5 builds the missing pieces required to migrate consumers safely (real web adapters, a module-level platform accessor, an ESLint guardrail), migrates the four consumer domains in batches, and then runs the Phase 2 acceptance checklist that Phase 2 itself couldn't complete.

---

## Why Phase 2.5 exists

Phase 2 was originally planned to deliver both the native-service plumbing _and_ the consumer migration that flips the React tree onto it (the plan's Task 13 Steps 3–4: "Migrate the first consumer", "Migrate remaining consumers in batches"). The Phase 2 implementation work was bigger than fit in the session that ran it; the structural scaffold (PlatformProvider, hooks, the desktop-side adapters, the Bun-main IPC handlers, the Electrobun bridge) landed but the consumer migration step was deferred. The honest framing of where we are today:

- The native services exist, register at boot, and have integration tests.
- The desktop webview still imports `DuckDbClient`, `AvaSupabase`, and `AvaDexie` directly — none of the native services are exercised at runtime.
- The IPC bridge is type-checked but has not been verified end-to-end under `pnpm dev:desktop`.
- The Phase 2 acceptance checklist (Task 15 Steps 1–8) has not been run because most of its assertions require the migration to be done first.

Treating this as a separate, narrowly-scoped half-phase rather than reopening Phase 2 keeps the previously-merged Phase 2 PRs immutable and lets each consumer-migration batch land as a small, reviewable PR (the original plan's intent).

## What users can do today (without Phase 2.5)

- **Web (`pnpm dev`):** identical to before Phase 2. The PlatformProvider is mounted but `usePlatform()` is not yet consulted anywhere outside the provider itself, so every code path remains on its existing import.
- **Desktop (`pnpm dev:desktop`):** the binary boots, logs `sqlite ready`, `duckdb ready`, `keychain + blob store ready`, `ipc handlers registered`, and `webview loaded`. The webview is a thin wrapper over the same web bundle — it reads the legacy `DuckDbClient` (duckdb-wasm in the browser), authenticates straight to Supabase (refresh token in `localStorage`, not the keychain), and stores dataset bytes in Dexie. None of the desktop-only promises (offline-readable data, native DuckDB performance, single network egress, OS-keychain auth) are visible to the user. The native services are dead code at runtime.

## What users will be able to do once Phase 2.5 ships

- **Web:** unchanged. The web adapters wrap the same legacy modules consumers used to import directly, so behavior on `pnpm dev` is byte-identical to today.
- **Desktop happy path runs end-to-end on a cold `userDataDir`:**
  1. Cold-start the desktop app — lands on sign-in.
  2. Sign in as a seeded user — refresh token written to the macOS keychain via `/usr/bin/security`.
  3. Snapshot bootstrap pulls every `SYNCABLE_TABLES` entry into local SQLite.
  4. List workspaces — rows render from local SQLite via the IPC-backed `createSqliteCrudClient`.
  5. Open a dataset, run a query — DuckDB query runs on the native `duckdb` binding in Bun main, not duckdb-wasm in the webview.
  6. Upload a CSV — `source.csv`, `data.parquet`, `meta.json` land on disk under `~/Library/Application Support/Avandar/blobs/workspaces/<wsId>/datasets/<dsId>/`.
  7. Quit the app fully, disable network, relaunch — the session is restored from the keychain and all the data still renders from local state.
- **Single network egress invariant holds:** every Supabase call (RPC, Edge Function, REST CRUD, auth) is observable from Bun-main logs. Nothing reaches Supabase directly from the webview.

## Why we can't defer Phase 2.5 any further

- **Phase 3 (sync engine) is built on the assumption that data lives locally.** The sync engine drains an outbox of local SQLite mutations and uploads `parquet_blob` files from disk. If the webview is still routing through Dexie and Supabase directly, there is no outbox to drain and no parquet on disk to upload — Phase 3 has nothing to sync. Phase 2.5 is the prerequisite that makes the Phase 3 data-flow real.
- **Phase 4 (hardening + macOS launch) needs the Phase 2 acceptance test to pass.** The "desktop runs fully offline against a local snapshot" claim that anchors the user-facing description of the desktop app is currently false. Shipping a macOS binary that quietly behaves like the web shell is worse than shipping no binary: it sets an expectation the product doesn't meet.
- **Dead code rots.** The longer the native services sit unused, the more they drift away from the consumer interfaces they're meant to back. Each change to the legacy `DuckDbClient` / `AvaSupabase` / `AvaDexie` surface that doesn't simultaneously propagate to the platform interface widens the gap and makes the eventual migration harder.
- **The IPC bridge has not been runtime-verified.** It's the single piece of Phase 2 infrastructure that can't be unit-tested — it touches Electrobun internals (`__electrobun.rpc` lookup, wildcard message handler, the `rpc.send` proxy) that only exist at runtime. The longer we go between writing the bridge and exercising it, the more expensive the eventual fix becomes. Phase 2.5 puts the bridge under real traffic on day one.

---

## File Structure

> Paths reflect the **current** repo layout (post-Phase 2). The directory-module convention adopted during Phase 2 (`apps/desktop/main/services/<name>/<name>.ts`, `apps/desktop/main/ipc/<name>/<name>.ts`) applies to all new modules; web-side platform code lives under `src/config/platform/` and follows the same one-module-per-directory shape.

**New: real web adapters (replace today's throwing stubs):**

- Modify: `src/config/platform/createWebDuckDbClient.ts` — wrap the legacy `DuckDbClient` singleton (`@/clients/DuckDbClient/DuckDbClient`) so `usePlatform().duckDb` works on web.
- Modify: `src/config/platform/createWebDatasetBlobStore.ts` — wrap the existing Dexie-backed dataset storage (`AvaDexie.localDatasets` + `DatasetParquetStorageClient`) so `usePlatform().datasetBlobStore` works on web.
- Modify: `src/config/platform/createWebAuthProvider.ts` — already wraps `AuthClient`; revisit only if a consumer migration surfaces a missing method.
- Test: `src/config/platform/createWebDuckDbClient.test.ts`, `src/config/platform/createWebDatasetBlobStore.test.ts`.

**New: module-level platform accessor for non-React callers:**

- Create: `src/config/platform/platformRegistry.ts` — `setPlatformImpls(impls)`, `getPlatformImpls()`, throws if read before set.
- Modify: `src/config/platform/PlatformProvider.tsx` — call `setPlatformImpls(impls)` at provider mount.

**New: ESLint guardrail:**

- Modify: `eslint.config.js` — `no-restricted-imports` rule blocking `@/clients/DuckDbClient/DuckDbClient`, direct `AvaSupabase` auth calls, and direct `AvaDexie.localDatasets` access outside the `src/config/platform/` and `src/clients/DuckDbClient/` adapter files.

**Migrated (touched per consumer-domain task):**

- ~20 files under `src/` importing `DuckDbClient` directly (Task 6).
- ~12 files under `src/` calling `AvaSupabase.db().auth.*` (Task 5).
- ~4 files under `src/` reading from Dexie's `localDatasets` (Task 7).
- Any `AvaSupabase.db().rpc(...)` and direct Edge Function callers (Task 8).

**Updated test groupings (see testing strategy):**

- G2.5.1 — IPC bridge round-trip smoke (a trivial echo request from the webview reaches the bun-main handler and returns).
- G2.5.2 — Web `DuckDbClient` adapter parity (mocked legacy client; the adapter forwards correctly and surfaces the legacy client's error envelope).
- G2.5.3 — Web `DatasetBlobStore` adapter parity (mocked Dexie + storage client; round-trip put/get/delete/exists/list/stat).
- G2.5.4 — `platformRegistry` init-order: throws when read before `setPlatformImpls`, returns the registered value once set, idempotent reset between tests.

---

## Milestones

Three milestones, each landing as ~2–4 PRs. Tasks within a milestone can run in parallel where noted; cross-milestone dependencies are called out per Task.

### Milestone A — Pre-flight (Tasks 1, 2, 3, 4)

Everything that has to land before consumer migration is safe.

**Includes:**

- Task 1 — IPC bridge runtime verification + any fixes the first `pnpm dev:desktop` exposes.
- Task 2 — real web `DuckDbClient` adapter (so migrated consumers don't regress on web).
- Task 3 — real web `DatasetBlobStore` adapter (same reason; the auth adapter already wraps the real `AuthClient`).
- Task 4 — module-level `platformRegistry` + ESLint guardrail.

**Consistency at milestone end:**

- A trivial round-trip call through the bridge works on a real desktop run.
- `usePlatform().duckDb.runRawQuery(...)` and `usePlatform().datasetBlobStore.get(...)` return correct results on both web and desktop.
- New direct imports of the banned legacy modules fail `pnpm lint`.

**Watch out for:**

- Task 1 is the one place this plan can fall over. The bridge integrates with Electrobun internals (`__electrobun.rpc` on the preload window, `rpc.send` proxy semantics, `addMessageListener("*", ...)` wildcard fan-out). Plan for one iteration of "boot, observe failure, patch, reboot" before the rest of Milestone A can ship.
- The web `DuckDbClient` adapter has a real impedance mismatch with the legacy client's signature (legacy `loadCsv` takes `tableName`; platform `loadFromUpload` doesn't). Resolve by giving the adapter access to the dataset's intended `tableName` via the `DatasetImportOptions.datasetId` field, or by extending the platform interface; do not paper over with `undefined`.

**Review surface:** ~4 PRs. Tasks can land in parallel after Task 1 lands first.

---

### Milestone B — Consumer migration (Tasks 5, 6, 7, 8)

Each task migrates one consumer domain in batches of ~5 files per PR per the original Phase 2 plan's guidance.

**Includes:**

- Task 5 — Auth migration: `AvaSupabase.db().auth.*` and `AuthClient.*` callers move to `usePlatform().authProvider` (or `getPlatformImpls().authProvider` for non-React modules).
- Task 6 — DuckDB migration: every `DuckDbClient.runRawQuery / runStructuredQuery / loadCsv / loadXlsx / loadParquet` caller moves to `usePlatform().duckDb`.
- Task 7 — Dataset blob migration: every `AvaDexie.localDatasets.*` reader/writer and `DatasetParquetStorageClient.*` upload caller moves to `usePlatform().datasetBlobStore`.
- Task 8 — ServerApi migration: every `AvaSupabase.db().rpc(...)` and direct `supabase.functions.invoke(...)` caller moves to `usePlatform().serverApiClient` (already wired by Phase 2 Task 14).

**Consistency at milestone end:**

- On desktop, every DuckDB query, every auth call, every dataset blob read/write, and every Supabase RPC/Edge Function call routes through IPC to Bun-main. The webview makes no direct outbound Supabase calls.
- On web, behavior is unchanged (the web adapters preserve the legacy semantics).

**Watch out for:**

- **Non-React call sites.** Files under `src/clients/` are plain TypeScript modules — they can't call `usePlatform()`. Use the `platformRegistry.getPlatformImpls()` accessor introduced in Task 4. Ordering: the React tree mounts the PlatformProvider before any non-React module is exercised; the registry's "read-before-write throws" behavior surfaces any violation loudly.
- **Test files** that mock `DuckDbClient` / `AvaSupabase` need their mocks adjusted to mock through the platform layer instead.
- **The legacy `AuthClient` surface is wider than `AuthProvider`** (password reset, email update, registration). Methods that don't fit on `AuthProvider` should stay reachable through `AuthClient` directly until they're folded into the platform interface (out of Phase 2.5 scope; track as a follow-up if needed).

**Review surface:** ~6–8 PRs (one batch ≈ 5 consumer files; some domains have ~20 callers).

---

### Milestone C — Phase 2 acceptance (Task 9)

The Phase 2 Task 15 checklist that couldn't run earlier. Verification-only, ends with a doc-only PR marking Phase 2 complete in the spec.

**Includes:**

- Task 9 — Run every step in the Phase 2 plan's Task 15 ("Phase 2 acceptance checklist") against a cold `userDataDir`, then edit `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` to mark Phase 2 complete.

**Review surface:** 1 PR (doc only).

---

### Milestone summary table

| Milestone                   | Tasks      | Approx. PRs | Risk                                                                  | After this, desktop behavior…                                       |
| --------------------------- | ---------- | ----------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| A — Pre-flight              | 1, 2, 3, 4 | ~4          | Medium-High (the IPC bridge has never run end-to-end)                 | unchanged (consumers still on legacy paths)                         |
| B — Consumer migration      | 5, 6, 7, 8 | ~6-8        | Medium (broad consumer changes; web parity is the regression vector)  | every Supabase / DuckDB / blob call routes through Bun-main         |
| C — Phase 2 acceptance      | 9          | 1           | None                                                                  | Phase 2 marked complete in the spec; doc-only                       |

---

## Task 1: IPC bridge runtime verification

**Test groupings:** G2.5.1 (IPC bridge round-trip smoke — a trivial `RdbContracts.query` call from the webview reaches the bun-main handler and returns the expected rows).

**PR boundaries:** 1 PR.

The bridge is wired in `apps/desktop/main/ipc/createElectrobunIpcTransport/`, the page-world shim is `apps/desktop/main/ipc/desktopIpcBridgeScript/`, and the preload-world relay is in `apps/desktop/preload/index.ts`. None of it has been exercised at runtime. Make a trivial round-trip work, then pin it with a smoke test.

**Files:**

- Likely modify: `apps/desktop/main/ipc/createElectrobunIpcTransport/createElectrobunIpcTransport.ts` — if `webview.rpc.send` isn't a proxy / wildcard receive doesn't fire.
- Likely modify: `apps/desktop/preload/index.ts` — if `__electrobun.rpc` isn't where the preload code looks for it.
- Likely modify: `apps/desktop/main/ipc/desktopIpcBridgeScript/desktopIpcBridgeScript.ts` — if the page-world shim's DOM-event names collide or the load-order hits before the preload installs its listener.
- Create: `apps/desktop/main/ipc/createElectrobunIpcTransport/createElectrobunIpcTransport.smoke.md` — a runbook documenting the verified round-trip, so a future regression has a known-good reference.

- [ ] **Step 1: Boot the desktop binary and capture logs**

```bash
pnpm dev:desktop
```

Expected at minimum:

- `[avandar-desktop] sqlite ready at …`
- `[avandar-desktop] duckdb ready at …`
- `[avandar-desktop] keychain + blob store ready`
- `[avandar-desktop] ipc handlers registered`
- `[avandar-desktop] webview loaded …`

If the boot crashes before any of these, that's the first failure to fix. The most likely culprits are listed in Step 2.

- [ ] **Step 2: Trigger a round-trip from the page main world**

With the dev tools open in the desktop window, paste into the console:

```js
window.electrobun.send("rdb.query", {
  id: "smoke-1",
  payload: { sql: "select 1 as one", params: [] },
});
window.electrobun.once("rdb.query.reply", (reply) => {
  console.log("ipc reply:", reply);
});
```

Expected: `ipc reply: { id: "smoke-1", ok: true, result: { rows: [{ one: 1 }] } }`.

Failure modes to diagnose:

- **Nothing happens (page world hangs):** the bridge script didn't install; check that `executeJavascript(DESKTOP_IPC_BRIDGE_SCRIPT)` ran on `dom-ready` and that `window.electrobun` exists in the page world.
- **`ava-ipc-out` fires but no `ava-ipc-in`:** the preload's `addMessageListener("*", …)` didn't see the message, or the preload's `__electrobun.rpc` lookup returned `null`. Trace from `apps/desktop/preload/index.ts`.
- **`__electrobun.rpc` is `undefined` on the preload window:** the preload looked at the wrong global. Inspect `window.__electrobun` in the preload's dev-tools context; adjust the lookup in `getPreloadRpc`.
- **`rpc.send.rdb.query` is not a function:** Electrobun's `rpc.send` may not be a dynamic Proxy. Patch `createElectrobunIpcTransport` to use whichever broadcast API Electrobun's rpc actually exposes (look at `defineElectrobunRPC` in `node_modules/electrobun/dist/api/shared/rpc.ts`).

- [ ] **Step 3: Record the verified round-trip**

Write `apps/desktop/main/ipc/createElectrobunIpcTransport/createElectrobunIpcTransport.smoke.md` with the exact console snippet from Step 2 and the observed reply. Keep it short; this is the "this worked once" anchor for the next regression.

- [ ] **Step 4: Manual review checkpoint (do NOT commit)**

**Run:**

```bash
pnpm --filter @avandar/desktop type-check
pnpm type-check
pnpm dev:desktop
```

**Verify:**

- The Step 2 console snippet returns the expected reply on a fresh boot of a clean `userDataDir`.
- The smoke runbook is written and references the exact reply shape.
- No regression in the unrelated `apps/desktop` tests.
- Test grouping G2.5.1 is authored as either an inline runbook (acceptable) or an automated harness (preferred when Playwright is available in Phase 2.5; otherwise defer the automation to Phase 4).

**Greenlight criteria:** at least one real IPC round-trip succeeds, before moving to Task 2.

---

## Task 2: Real web `DuckDbClient` adapter

**Test groupings:** G2.5.2 (Web `DuckDbClient` adapter parity — mocked legacy client; the adapter forwards `runRawQuery`, `runStructuredQuery`, `loadFromUpload` correctly and surfaces the legacy client's error envelope unmodified).

**PR boundaries:** 1 PR.

Today's `src/config/platform/createWebDuckDbClient.ts` is a stub that throws. Replace it with a real wrapper around `DuckDbClient` (the singleton at `src/clients/DuckDbClient/DuckDbClient.ts`) so the web branch of `usePlatform().duckDb` returns sane results after consumer migration.

**Files:**

- Modify: `src/config/platform/createWebDuckDbClient.ts`
- Test: `src/config/platform/createWebDuckDbClient.test.ts`

- [ ] **Step 1: Map the legacy → platform method surface**

The platform `DuckDbClient` interface (`shared/platform/types/DuckDbClient.types.ts`) declares:

- `runRawQuery<TRow>(sql, params?)` → `TRow[]`
- `runStructuredQuery<TRow>(query)` → `TRow[]`
- `loadParquetFromDatasetBlobStore(datasetId)` → `void`
- `loadFromUpload(source, options)` → `DatasetImportResult`

The legacy `DuckDbClient` (singleton at `src/clients/DuckDbClient/DuckDbClient.ts`) exposes a wider surface:

- `runRawQuery<TRow extends UnknownRow>(sql, options)` → `QueryResult<TRow>` (different return shape; `data` is the array).
- `runStructuredQuery<TRow extends UnknownRow>(query: DuckDbStructuredQuery)` → `QueryResult<TRow>`.
- `loadCsv({file, tableName, ...})` → `DuckDbLoadCsvResult`.
- `loadXlsx({file, tableName, ...})` → `DuckDbLoadXlsxResult`.
- `loadParquet({file, tableName, ...})` → `DuckDbLoadParquetResult`.

Pin the mapping decisions before writing the adapter:

- **`runRawQuery`**: forward; extract the `.data` array from the legacy result.
- **`runStructuredQuery`**: forward with a `StructuredQuery → DuckDbStructuredQuery` cast (the platform type is still a placeholder per `DuckDbClient.types.ts`); extract `.data`.
- **`loadFromUpload`**: dispatch on `options.format`, derive `tableName` from `options.datasetId` (use the existing `_safeTableName`-style sanitiser or copy the legacy convention), pass through `delimiter` / `hasHeader` for CSV. Map the legacy result to `DatasetImportResult` (drop `rejectedScans`, `rejectedRows`, `sniffResult`; preserve `rowCount` and `schema`).
- **`loadParquetFromDatasetBlobStore`**: on web there is no separate blob store yet — Task 3 introduces the Dexie-backed adapter. Until then, throw with a clear pointer; this method is desktop-only in V1 and no web consumer calls it yet.

- [ ] **Step 2: Write the failing test**

Create `createWebDuckDbClient.test.ts`. Use vitest with a mocked legacy `DuckDbClient` (vi.mock the singleton). Pin:

- `runRawQuery(sql, params)` calls `LegacyDuckDbClient.runRawQuery(sql, options)` with the right shape and returns `result.data`.
- `runStructuredQuery(query)` forwards and returns `result.data`.
- `loadFromUpload({kind: "browser-file", file}, {datasetId, format: "csv", delimiter, hasHeader})` calls `LegacyDuckDbClient.loadCsv({file, tableName, delimiter, hasHeader})` with a sanitised `tableName` derived from `datasetId`.
- Same for `xlsx` and `parquet` formats.
- `loadFromUpload({kind: "filesystem-path", ...})` throws on web (filesystem paths are desktop-only).
- `loadParquetFromDatasetBlobStore` throws with the migration-pointer message.
- Legacy client errors propagate verbatim (no wrapping).

- [ ] **Step 3: Implement the adapter**

Replace the throw-stub in `createWebDuckDbClient.ts`. Keep the file under 100 lines; if it grows past that, the surface is wider than the interface — flag it.

- [ ] **Step 4: Run the test and confirm green**

```bash
pnpm test src/config/platform/createWebDuckDbClient
```

- [ ] **Step 5: Confirm web shell behavior unchanged**

```bash
pnpm dev
```

Open a page that runs a DuckDB query (the workspace query workbench is a good one). Confirm rows render. Open dev tools, verify no console errors.

- [ ] **Step 6: Manual review checkpoint (do NOT commit)**

**Verify:**

- `usePlatform().duckDb.runRawQuery("select 1 as one")` returns `[{ one: 1 }]` on web (try via a one-off page or vitest harness).
- The adapter never imports from `@duckdb/duckdb-wasm` directly — it goes through the legacy singleton only.
- `loadFromUpload`'s tableName derivation is deterministic and matches the legacy callers' expectations (audit `src/clients/datasets/` for the existing `datasetId → tableName` convention).
- Test grouping G2.5.2 is authored and the mutation-test step is recorded.

**Greenlight criteria:** `createWebDuckDbClient` no longer throws on the four interface methods that have a legacy equivalent, web tests pass, before moving to Task 3.

---

## Task 3: Real web `DatasetBlobStore` adapter

**Test groupings:** G2.5.3 (Web `DatasetBlobStore` adapter parity — mocked Dexie + storage client; round-trip put/get/delete/exists/list/stat returns the expected shapes).

**PR boundaries:** 1 PR.

Today's `src/config/platform/createWebDatasetBlobStore.ts` is a stub that throws. The web doesn't have a single existing module that fits the `DatasetBlobStore` interface — dataset bytes are scattered across Dexie (`AvaDexie.localDatasets`) and `DatasetParquetStorageClient` (Supabase Storage). The adapter wraps both behind the unified interface.

**Files:**

- Modify: `src/config/platform/createWebDatasetBlobStore.ts`
- Test: `src/config/platform/createWebDatasetBlobStore.test.ts`

- [ ] **Step 1: Decide the on-web storage strategy**

Two reasonable shapes:

- **(A) Dexie-only:** every blob key maps to a row in `AvaDexie.localDatasets`. Simple; `put`/`get` are blob-store-ish already. Doesn't cover the Supabase-Storage parquet upload path — but that path is Phase 3 (sync) work; for now web `put` writing to Dexie only is fine.
- **(B) Dexie + lazy Supabase fetch:** read tries Dexie first, falls back to Supabase Storage. More work; necessary for sharing parquets across browsers / users. Out of scope for Phase 2.5; document as a follow-up.

Pick (A). The interface stays the same; only `put`'s "where to write" decision changes if/when (B) lands.

- [ ] **Step 2: Map keys to Dexie**

`DatasetBlobKey` follows the `workspaces/<wsId>/datasets/<dsId>/...` shape (see `shared/platform/types/DatasetBlobStore.types.ts`'s `DatasetBlobKeys`). Dexie's `localDatasets` is keyed by `datasetId` (or similar); the adapter picks one of:

- Parse the key, extract `datasetId`, look up by `datasetId`. Lossy for keys that don't conform.
- Store the full key alongside the Dexie row in a new index. Cleaner.

Pin the choice in the test setup; the adapter shouldn't have to guess at runtime.

- [ ] **Step 3: Write the failing test**

Cases:

- `put(key, bytes)` writes a Dexie row keyed by the parsed `datasetId`; `get(key)` returns a `ReadableStream` over the same bytes.
- `exists(key)` returns `true` after `put`, `false` otherwise.
- `stat(key)` returns `{sizeBytes, mtimeMs}` for an existing key; `null` for a missing one.
- `list(prefix)` filters Dexie rows by the workspace/dataset segments of the prefix.
- `delete(key)` removes the Dexie row.
- Non-conforming keys throw with a clear message (do not write).

- [ ] **Step 4: Implement the adapter**

Wrap `AvaDexie.localDatasets`. Keep the adapter under 150 lines.

- [ ] **Step 5: Run tests and confirm green**

```bash
pnpm test src/config/platform/createWebDatasetBlobStore
```

- [ ] **Step 6: Manual review checkpoint (do NOT commit)**

**Verify:**

- `usePlatform().datasetBlobStore` round-trips bytes on web via Dexie (one-off harness or browser console smoke).
- The adapter doesn't reach into `DatasetParquetStorageClient` — Supabase-Storage interaction stays where it is, untouched, until Phase 3.
- The key-parsing logic rejects malformed keys instead of silently dropping them.
- Test grouping G2.5.3 is authored and the mutation-test step is recorded.

**Greenlight criteria:** the adapter passes its test suite and the web shell still behaves identically on `pnpm dev`, before moving to Task 4.

---

## Task 4: `platformRegistry` + ESLint guardrail

**Test groupings:** G2.5.4 (`platformRegistry` init-order — throws when read before `setPlatformImpls`, returns the registered value once set, idempotent reset between tests).

**PR boundaries:** 1 PR.

Non-React modules (clients under `src/clients/`, utilities, plain TS files) cannot call `usePlatform()`. Introduce a module-level accessor that the `PlatformProvider` populates at mount and that non-React code reads from. Pair with an ESLint rule that blocks new direct imports of the banned legacy modules outside the adapter files, so consumer migration is a one-way ratchet.

**Files:**

- Create: `src/config/platform/platformRegistry.ts`
- Create: `src/config/platform/platformRegistry.test.ts`
- Modify: `src/config/platform/PlatformProvider.tsx` — call `setPlatformImpls(impls)` on mount.
- Modify: `eslint.config.js` — add the `no-restricted-imports` rule.

- [ ] **Step 1: Implement `platformRegistry`**

Module shape:

```ts
let impls: PlatformImpls | null = null;

export function setPlatformImpls(next: PlatformImpls): void {
  impls = next;
}

export function getPlatformImpls(): PlatformImpls {
  if (impls === null) {
    throw new Error(
      "platformRegistry.getPlatformImpls called before PlatformProvider mounted. " +
        "Move the call inside a component / hook, or defer it until after first render.",
    );
  }
  return impls;
}

export function __resetPlatformImplsForTests(): void {
  impls = null;
}
```

- [ ] **Step 2: Wire from `PlatformProvider`**

In `PlatformProvider.tsx`, after the `useMemo` resolves `impls`, call `setPlatformImpls(impls)` inside a `useEffect` (or via `useLayoutEffect` to guarantee non-React module reads after the first render see the value). Document the ordering in a code comment.

- [ ] **Step 3: Add the ESLint guardrail**

In `eslint.config.js`, add a `no-restricted-imports` rule scoped to `src/**/*.{ts,tsx}` that flags:

- `@/clients/DuckDbClient/DuckDbClient` (allow only from `src/config/platform/createWebDuckDbClient.ts` and `src/clients/DuckDbClient/**`).
- Direct `AvaSupabase.db().auth.*` usage (a `no-restricted-syntax` rule may be more accurate than `no-restricted-imports` here; use the syntax form).
- `@/db/dexie/AvaDexie` direct imports (allow only from `src/config/platform/createWebDatasetBlobStore.ts` and `src/db/dexie/**`).

The rule blocks _new_ direct imports; the existing call sites continue to lint clean while they're being migrated (each migration removes the violation it carried). Add a one-line override exempting the files being actively migrated if needed.

- [ ] **Step 4: Run tests**

```bash
pnpm test src/config/platform/platformRegistry
pnpm lint
```

The lint should still pass on the existing codebase. If it doesn't, the rule's allow-list is wrong; narrow until it does.

- [ ] **Step 5: Manual review checkpoint (do NOT commit)**

**Verify:**

- `getPlatformImpls()` throws when called outside a mounted React tree (verify via vitest).
- `setPlatformImpls(impls)` from `PlatformProvider`'s mount makes `getPlatformImpls()` return the same impls (verify with a render harness).
- `pnpm lint` is green on the current codebase.
- A test file or scratch module that imports `@/clients/DuckDbClient/DuckDbClient` outside the adapter triggers the ESLint rule.
- Test grouping G2.5.4 is authored and the mutation-test step is recorded.

**Greenlight criteria:** all four Milestone A checks pass, before starting Milestone B.

---

## Task 5: Auth consumer migration

**Test groupings:** existing auth-related vitest suites (`src/lib/hooks/auth/useAuth.test.tsx`, `src/clients/AuthClient.test.ts`) are the contract; the migration must keep them green.

**PR boundaries:** 1 PR per ~5-consumer batch (initially 2–3 PRs depending on shape).

Migrate every caller of `AvaSupabase.db().auth.*` (and direct `AuthClient.*` consumers where the call is one of the methods `AuthProvider` covers) to `usePlatform().authProvider` (React) or `getPlatformImpls().authProvider` (non-React).

**Files:** the ~12 files identified by `grep -rln "AvaSupabase\." src/`. Audit the full list at the start of each PR — the count shifts as other PRs land.

**Steps (repeat per batch):**

- [ ] **Step 1: Pick a batch of ~5 consumers**

Group by sub-domain when natural (e.g., all `permissions/*` clients together; the `useAuth` hook on its own). Smaller is better — a 3-file PR is fine.

- [ ] **Step 2: Migrate each call site**

For a React component or hook:

```diff
- import { AvaSupabase } from "$/db/supabase/AvaSupabase";
+ import { usePlatform } from "@/config/platform/PlatformProvider";

   function Component() {
-    const session = await AvaSupabase.db().auth.getSession();
+    const { authProvider } = usePlatform();
+    const session = await authProvider.getSession();
   }
```

For a non-React module:

```diff
- import { AvaSupabase } from "$/db/supabase/AvaSupabase";
+ import { getPlatformImpls } from "@/config/platform/platformRegistry";

   export async function fetchSomething() {
-    const session = await AvaSupabase.db().auth.getSession();
+    const session = await getPlatformImpls().authProvider.getSession();
   }
```

**Skip** any call that uses a method outside the `AuthProvider` interface (e.g., `requestPasswordResetEmail`, `updatePassword`). Those keep calling `AuthClient` directly until the platform interface is widened (out of scope; file as a follow-up if the count is non-trivial).

- [ ] **Step 3: Update mocks in the touched tests**

Tests that mocked `AvaSupabase.db().auth.*` need to mock `usePlatform()` (or the platform impls registered via `__setPlatformImplsForTests`) instead. The test changes are mechanical but mandatory — without them the suite green-lights code that no longer exists.

- [ ] **Step 4: Run tests and lint**

```bash
pnpm test
pnpm lint
pnpm type-check
```

- [ ] **Step 5: Manual smoke on both shells**

```bash
pnpm dev          # web shell — sign-in flow still works
pnpm dev:desktop  # desktop — sign-in writes to the keychain (verify via Keychain Access.app)
```

- [ ] **Step 6: Manual review checkpoint (do NOT commit) — per batch**

**Verify:**

- Every file in the batch no longer imports `$/db/supabase/AvaSupabase` for the migrated methods.
- ESLint guardrail count of violations dropped by exactly the batch size (`pnpm lint` before/after).
- Sign-in / sign-out / session restore work on both web and desktop.

**Greenlight criteria:** the batch's tests are green and both shells smoke-test cleanly, before the next batch starts.

---

## Task 6: DuckDB consumer migration

**Test groupings:** the existing vitest suites in `src/clients/datasets/`, `src/views/DataManagerApp/`, etc. — keep them green.

**PR boundaries:** 1 PR per ~5-consumer batch (4 PRs expected; ~20 files identified).

Migrate every caller of `DuckDbClient.runRawQuery / runStructuredQuery / loadCsv / loadXlsx / loadParquet` to `usePlatform().duckDb` (React) or `getPlatformImpls().duckDb` (non-React).

**Files:** the ~20 files identified by `grep -rln "DuckDbClient\." src/`.

**Steps:** identical shape to Task 5 — pick a batch, migrate, fix mocks, run tests, smoke both shells, manual review.

**Watch out for:**

- Some consumers depend on the legacy `QueryResult<TRow>` shape (which has `.data` plus metadata); the platform interface returns `TRow[]` directly. Each migrated call site needs the `.data` unwrap removed.
- `loadCsv` / `loadXlsx` / `loadParquet` call sites with a `tableName` parameter need to route through `loadFromUpload`'s `datasetId`-derived table name (see Task 2 Step 1). Confirm the derivation matches whatever the existing caller chose for `tableName`.

---

## Task 7: Dataset blob consumer migration

**Test groupings:** existing dataset-flow tests under `src/views/DataManagerApp/` and `src/clients/datasets/`.

**PR boundaries:** 1 PR per ~5-consumer batch (1–2 PRs expected; ~4 files identified).

Migrate every direct `AvaDexie.localDatasets.*` and direct `DatasetParquetStorageClient.*` upload call to `usePlatform().datasetBlobStore` (React) or `getPlatformImpls().datasetBlobStore` (non-React).

**Files:** the ~4 files identified by `grep -rln "AvaDexie\." src/` plus any `DatasetParquetStorageClient` callers identified during the batch.

**Steps:** same shape as Tasks 5/6.

**Watch out for:**

- The legacy Dexie store and the platform `DatasetBlobStore` have different key shapes (Dexie keys by `datasetId`, the blob store keys by full path). Use `DatasetBlobKeys.parquet(workspaceId, datasetId)` etc. from `shared/platform/types/DatasetBlobStore.types.ts` at the call site.
- Reads return a `ReadableStream<Uint8Array>`; the legacy Dexie path returned the bytes directly. Each migrated reader needs a `new Response(stream).arrayBuffer()` (or equivalent) at the call site.

---

## Task 8: ServerApi consumer migration

**Test groupings:** existing tests covering RPC / Edge Function callers.

**PR boundaries:** 1 PR per ~5-consumer batch.

Migrate every direct `AvaSupabase.db().rpc(...)` call and every `supabase.functions.invoke(...)` call (often surfaced through `APIClient.sendHTTPRequest`) to `createServerApiClient()` (or its already-mounted platform-aware factory). The factory was flipped during Phase 2 Task 14 — this task is the consumer-side cleanup.

**Files:** identified by `grep -rn "supabase.functions.invoke\|\.rpc(" src/` and `grep -rln "APIClient" src/`.

**Steps:** same shape as Tasks 5–7.

**Watch out for:**

- `APIClient.sendHTTPRequest` is the existing route-typed wrapper for Edge Function calls. Migrating it once (so `APIClient.sendHTTPRequest` internally calls `createServerApiClient().invokeFunction`) automatically migrates every downstream caller. This is the single biggest leverage point in the task — do it first.
- RPC callers often live in `react-query` mutation hooks. Migrate the mutation, not every component that triggers it.

---

## Task 9: Phase 2 acceptance checklist

**PR boundaries:** 1 PR (doc-only).

The Phase 2 Task 15 checklist couldn't run before Phase 2.5; it should pass cleanly now. Walk through every step, fix any straggling issues with targeted PRs (file them as additional Task 9 sub-PRs only if absolutely necessary; the expectation is zero code changes here), and then mark Phase 2 complete in the spec.

**Steps:** see `docs/superpowers/plans/2026-05-13-electrobun-desktop-phase-2-native-layer.md`'s "Task 15: Phase 2 acceptance checklist" — Steps 1 through 8. Run them in order.

- [ ] Step 1: Confirm migrations applied at startup.
- [ ] Step 2: Confirm read-after-login works (the headline deliverable: sign in → quit → offline → relaunch → data still renders).
- [ ] Step 3: Confirm upload writes to disk.
- [ ] Step 4: Confirm migration drift CI check.
- [ ] Step 5: Confirm tests green.
- [ ] Step 6: Edit `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` to mark Phase 2 complete with today's date.
- [ ] Step 7: Manual review checkpoint (same shape as Phase 2's, but with the additional confirmation that Phase 2.5 is also implicitly complete).

**Greenlight criteria:** every step in the Phase 2 Task 15 checklist passes against a cold `userDataDir`; the spec is updated; Phase 2 is officially shippable.

---

## Out of Scope for Phase 2.5

- Widening the `AuthProvider` interface to cover password reset / email update / registration (the methods on `AuthClient` that aren't on `AuthProvider`). Track as a follow-up if needed; not required for the Phase 2 acceptance criteria.
- The "(B) Dexie + lazy Supabase fetch" web blob store strategy from Task 3 Step 1.
- Sync engine work (Phase 3).
- Migration generator improvements.
- Any work on the Windows port (Phase 5).

## Risks Specific to Phase 2.5

| Risk                                                                                                                            | Mitigation in this phase                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The IPC bridge needs more than one round of fixes to reach round-trip parity                                                    | Task 1 is gated by a working round-trip; budget time for iteration. If the integration is harder than expected (e.g., Electrobun's `rpc.send` is not a Proxy), fall back to a single-message wrapper schema declared via `BrowserView.defineRPC` and re-test.     |
| A migrated consumer regresses behavior on web because the legacy / platform shapes diverge                                       | The web adapters (Tasks 2, 3) are written first specifically to surface mismatches at the adapter layer, not at the call site. Each migration PR runs `pnpm test` and includes a manual smoke note on both shells.                                                |
| Non-React modules read `getPlatformImpls()` before `PlatformProvider` mounts (init-order race)                                  | The registry throws loudly with a clear message; tests in G2.5.4 pin the throw; manual smoke catches the boot-time variant. If the count of legitimate pre-mount call sites is non-zero, fold them into a `usePlatform()`-wrapping hook instead.                  |
| A consumer batch unintentionally bundles unrelated refactors and balloons the PR                                                | Batches of ~5; reject PRs that exceed the threshold without justification. The migration is a mechanical rewrite; resist the urge to "clean up while you're in there".                                                                                            |
| The Phase 2 acceptance test (Task 9) surfaces unrelated bugs that need code changes                                              | File those as their own follow-up tasks (still inside Phase 2.5 scope if they block the checklist; otherwise as their own follow-up plan). Task 9 itself remains doc-only.                                                                                        |

---

## Phase 2.5 outcome — what will exist after the phase ships

- `usePlatform()` is the documented and enforced entrypoint for cross-platform service access from React; `getPlatformImpls()` from `platformRegistry` is the documented entrypoint for non-React modules.
- The web shell behaves identically to before (verified by `pnpm dev` + the existing test suite); the desktop shell now delivers every Phase 2 promise (native DuckDB, OS-keychain auth, on-disk uploads, single network egress, offline-readable data).
- The Phase 2 spec is annotated as complete with the acceptance date.
- Phase 3 (sync engine) is unblocked: the outbox can drain real local mutations; parquet uploads have real on-disk files to push.
