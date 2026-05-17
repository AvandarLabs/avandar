# Avandar Desktop — Testing Strategy

**Date:** 2026-05-14
**Status:** Draft for review
**Author:** Pablo (with Claude)
**Companion to:** `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md`

## Summary

The desktop app introduces three high-risk testing problems the existing web suite was never designed for: a sync engine where silent data loss is the failure mode, a swap from `duckdb-wasm` to native DuckDB that no automated test currently exercises, and a webview shell (Electrobun / WKWebView) that cannot be driven by Playwright on macOS.

This spec defines a four-layer testing stack that mitigates those risks without pretending we can run real-desktop e2e on every PR. The workhorse is a **fake-IPC harness** that lets Playwright drive Chromium against the React app while real Bun-main code (bun:sqlite, native DuckDB, filesystem, sync engine) runs in the same process via the same `createIpcServer` dispatcher built in Phase 2.

It also defines a **per-PR review discipline** so the test suite doesn't grow as a pile of rubber-stamped commits.

## Why this spec exists

- **Alpha Electrobun + WKWebView is a testing dead end on macOS.** Playwright's "WebKit" target is a separate browser binary, not a Cocoa app's WKWebView. `safaridriver` only drives Safari.app. `isInspectable=true` enables Web Inspector for humans, not CDP. No open-source Electrobun project ships working e2e tests today. We accept this ceiling and design around it.
- **Native DuckDB ≠ `duckdb-wasm`.** Extensions, parquet I/O, large-query memory behavior, type coercions — all differ. Today's web test suite runs against wasm. The desktop ships native. Without a test layer that exercises native DuckDB through the real adapter chain, the swap is verified only by manual smoke.
- **Sync engines fail silently.** A race between PushLoop and PullLoop that drops a write, an outbox entry that commits without its data row, a TUS upload that resumes from offset 0 instead of `bytes_uploaded` — none of these surface as a crash. Manual review will not catch them. Property-based and convergence tests will.
- **Mechanical migrations (Phase 1 Task 5: ~20 CRUD client files) need an automated regression net** that exercises every migrated entity, not a manual click-through that misses lazy-loaded routes.
- **The ServerApi migration in Phase 1 Task 5 (2 RPC call sites + `APIClient.ts` internal rewire)** is smaller than the CRUD migration but the failure mode is the same — a missed call site silently bypasses the new abstraction. A Playwright regression suite hitting every page that exercises those code paths catches that automatically (G1.7).
- **The privacy invariant in Phase 4** (no raw user data in logs) is enforced by an ESLint rule with known blind spots (aliased imports, destructured methods, nested keys). A belt-and-suspenders runtime assertion is necessary.

## Testing layers

| Layer | Tool | Process | Where the code lives | Primary use |
|---|---|---|---|---|
| **Unit** | vitest | Node or Bun | `packages/*/src/**/*.test.ts`, `apps/desktop/main/**/*.test.ts` | Pure functions, type-level locks, state machines |
| **Bun-main integration** | `bun test` | Bun (real `bun:sqlite`, FS, FFI) | `apps/desktop/main/**/*.integration.test.ts` | IPC handlers against real Sqlite/FS, sync loops against mocked Supabase, native DuckDB against fixture parquet |
| **Fake-IPC e2e** | Playwright running under Bun | Bun + Chromium | `apps/desktop/tests/e2e/**/*.spec.ts` | Full React-through-IPC-through-real-services flows; offline scenarios; restart-persistence; sync convergence |
| **Real-desktop e2e** | Playwright CDP (Windows) / XCUITest smoke (macOS) | OS host | `apps/desktop/tests/desktop/**` | WebView2-specific paths on Windows; "does it launch + menus exist" on macOS; signing/notarize via CI |
| **Property-based** | `fast-check` | wherever it's hosted | colocated with unit/integration | LWW commutativity, sync convergence, log redaction, atomicity invariants |

**Tooling decisions:**

- **Test runner is Bun for Bun-main integration and for the fake-IPC e2e harness.** Reason: `bun:sqlite` is Bun-only. Running tests under Node forces `better-sqlite3`, which is a different driver and defeats the purpose of testing the production stack. Playwright supports being driven from Bun.
- **Unit tests can run under Node** (vitest) for packages that don't touch Bun-specific APIs. This keeps web-only `packages/*` tests fast and Bun-independent.
- **`fast-check` for property-based testing.** Used selectively — places where bug shape isn't enumerable (sync convergence, atomicity under random failure injection, log redaction over arbitrary nested objects).
- **`msw` (Mock Service Worker) for Supabase REST mocking.** Lets us write declarative `rest.get(...)` handlers that the real `fetch` flows through unmodified.
- **`@fast-check/vitest` integration** for ergonomic property tests inside the vitest runner.
- **ESLint `RuleTester`** for the no-raw-data-in-logger rule (already standard for ESLint plugins).
- **No new global test framework introduced** — vitest, bun test, Playwright already exist in the repo or are familiar.

## The fake-IPC harness

The single most leveraged piece of test infrastructure. One harness file unlocks Tasks 9–13 of Phase 2, all of Phase 3's end-to-end convergence tests, Phase 4's bug-report dialog flow, and the Phase 5 Windows regression sweep.

### Why it exists

Playwright drives Chromium beautifully. Playwright cannot drive WKWebView. The React app inside our Electrobun shell *is* the same code that runs in the web browser — but it branches on `window.__AVA_PLATFORM__` to pick desktop adapters that call `window.electrobun.callIpc(...)` to reach Bun-main services.

The harness reproduces the runtime contract Electrobun would provide (the `__AVA_PLATFORM__` flag and the IPC bridge), but routes the IPC calls directly to a real `createIpcServer` instance running in the test process. The result: Playwright drives the React app against the real desktop code path, on every PR, on every OS, in seconds.

### How it works

```
   ┌─────────────────────────────────────────────────────────────────┐
   │  Single Bun process (vitest / playwright runner)                │
   │                                                                 │
   │  ┌──────────────────────────────┐  ┌──────────────────────────┐ │
   │  │ Chromium via Playwright      │  │ "Bun-main" services      │ │
   │  │  - serves the real Vite      │  │  - createIpcServer({...})│ │
   │  │    dev build of src/         │  │    same handlers as prod │ │
   │  │  - addInitScript injects:    │  │  - real bun:sqlite on    │ │
   │  │     window.__AVA_PLATFORM__  │◄─►  tmpfile                 │ │
   │  │     window.electrobun = {    │  │  - real FS blob store on │ │
   │  │       callIpc: page-exposed  │  │    tmpdir                │ │
   │  │     }                        │  │  - real native DuckDB    │ │
   │  └──────────────────────────────┘  │  - mocked Supabase REST  │ │
   │              ▲                     │    via msw               │ │
   │              │                     │  - mocked keychain       │ │
   │              │  Playwright         │    (in-memory fake)      │ │
   │              │  exposeFunction:    │                          │ │
   │              │  in-process direct  │                          │ │
   │              │  call, no IPC,      │                          │ │
   │              │  no sockets         │                          │ │
   │              └─────────────────────┴──────────────────────────┘ │
   │                                                                 │
   │  Electrobun never runs.                                         │
   │  WKWebView / WebView2 never runs.                               │
   │  The same IPC handlers run.                                     │
   └─────────────────────────────────────────────────────────────────┘
```

The Phase 2 IPC server (`createIpcServer`) is a **dispatcher**, not a network server — it takes `(channel, message)` and routes to a handler. In production, Electrobun's framework is the transport between webview and Bun-main. In the harness, Playwright's `page.exposeFunction` is the transport between Chromium and the test process. The dispatcher and all handlers are unchanged.

### Minimal setup sketch

```ts
// apps/desktop/tests/e2e/fixtures/harness.ts
import { test as base } from "@playwright/test";
import { createIpcServer } from "@avandar/platform/ipc/server";
import { registerRdbHandlers }       from "../../main/ipc/rdb";
import { registerDuckDbHandlers }    from "../../main/ipc/duckdb";
import { registerBlobStoreHandlers } from "../../main/ipc/dataset-blob";
import { registerAuthHandlers }      from "../../main/ipc/auth";
import { openSqliteDatabase }        from "../../main/services/Sqlite";
import { createFakeKeychain }        from "./fakes/keychain";
import { createMockedSupabase }      from "./fakes/supabase";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

export const test = base.extend<{ harness: Harness }>({
  harness: async ({ page }, use) => {
    const dataDir    = `${tmpdir()}/avandar-${randomUUID()}`;
    const sqlitePath = `${dataDir}/metadata.sqlite`;
    const blobDir    = `${dataDir}/workspaces`;

    const db        = await openSqliteDatabase(sqlitePath);
    const supabase  = createMockedSupabase({ session: fixtureSession });
    const keychain  = createFakeKeychain();

    const ipcServer = createIpcServer();
    registerRdbHandlers      (ipcServer, { db });
    registerDuckDbHandlers   (ipcServer, { dbPath: sqlitePath });
    registerBlobStoreHandlers(ipcServer, { baseDir: blobDir });
    registerAuthHandlers     (ipcServer, { supabase, keychain });

    await page.exposeFunction("__avaCallIpc",
      (channel: string, msg: unknown) => ipcServer.dispatch(channel, msg)
    );

    await page.addInitScript(() => {
      (window as any).__AVA_PLATFORM__ = "desktop";
      (window as any).electrobun = {
        callIpc: (c: string, m: unknown) => (window as any).__avaCallIpc(c, m),
      };
    });

    await use({ page, dataDir, db, supabase, async restart() {
      // close db, re-open against same dataDir, rebuild ipcServer
      // proves on-disk persistence across "app restarts"
    }});

    await db.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  },
});
```

### What it covers

- React desktop-branch adapter selection (the right `DuckDbClient` / `RdbClient` / `DatasetBlobStore` get picked up)
- IPC contract round-trips (drift between contract types and handler implementations becomes a test failure)
- Real `bun:sqlite` reads/writes including transaction atomicity
- Real filesystem blob store including atomic-write semantics
- **Native DuckDB execution** — the same `@duckdb/node-api` binding the production app uses
- Sync engine convergence — speed up timers via `vi.useFakeTimers`, run thousands of cycles in milliseconds
- Offline scenarios — flip msw to throw `NetworkError`, watch sync transitions
- Restart persistence — `await harness.restart()` rebuilds the IPC server pointing at the same tmpdir

### What it doesn't cover

- WKWebView-specific rendering quirks (CSS, font metrics, scrollbar behavior, stricter CORS)
- The real Electrobun bundle layout and resource loading
- Native menus, dialogs, dock/tray, notifications
- The packaged binary's signing / Gatekeeper / SmartScreen interaction
- Cross-process crash isolation (in the harness, a "Bun-main" crash kills the test runner)

These gaps are filled by:
- **macOS:** XCUITest smoke ("app launches, main window appears, menu items exist") + Phase 4 manual dogfood
- **Windows:** real WebView2 via Playwright `connectOverCDP` — same test specs, different launch fixture, tagged `@windows-regression`
- **Packaging:** CI codesign/notarize jobs on every release tag

### Prerequisite

The test runner must be Bun, not Node, for the harness to use `bun:sqlite` and Bun FFI without divergence from production. CI runners must have Bun installed; existing GitHub Actions runners support this.

## Review discipline

**The non-negotiable rule:** test PRs follow the same scope discipline as production PRs. One invariant per PR. One reviewable diff. No "added test coverage" omnibus commits that nobody can meaningfully review.

A bulk test PR has the failure mode that a 500-line test diff gets a thumbs-up on shape alone — names look right, assertions look reasonable, nobody actually runs the tests with a broken implementation to confirm they'd catch the bug they claim to catch. A test that passes both with the correct and the broken implementation is worse than no test, because it gives false confidence.

### Test groupings

Tests are submitted as **groupings**, each scoped to a single behavioral cluster.

A good grouping:
- Tests one invariant or capability (e.g. "FileSystemDatasetBlobStore atomic-write semantics")
- Sits in one layer (don't mix unit and integration in the same PR)
- Contains ~5–15 cases, or ~100–300 lines of test code
- Has a single-sentence purpose statement in the PR description

A bad grouping:
- "All tests for the blob store"
- "Phase 3 test coverage"
- A test file with `describe('FileSystemDatasetBlobStore')` containing 40 `it`s

The phase-by-phase groupings below are sized to this rule. They're proposals — reviewers may split further during implementation, but never combine.

### Per-PR review checklist

**Code review:**
1. Test names read as behavioral specs: `it("rejects file:// URLs in dev mode")`, not `it("test 1")` or `it("works correctly")`.
2. Each `it` asserts one behavior. No compound tests that conflate multiple invariants.
3. No real-time `setTimeout` or `Date.now()` — use `vi.useFakeTimers` and inject a clock.
4. Tight assertions: `toBe`, `toEqual` with exact shapes. No `toBeDefined` / `toBeTruthy` unless that's literally the invariant.
5. No over-mocking. Specifically: a test for X must not mock X. Integration tests should use real Sqlite/FS/DuckDB — mock only the network and OS-keychain boundaries.
6. Failure messages are interpretable by someone who didn't write the test. Custom matcher messages or descriptive `expect(..., "...explanation...")` strings where the assertion alone is cryptic.
7. No commented-out tests. No `it.skip` without a tracked follow-up issue.

**Manual review (the mutation test):**
1. Reviewer runs the test suite locally — sees green.
2. Reviewer **intentionally breaks the production code** in a small, targeted way that the test claims to catch (one line, easily reverted).
3. Reviewer confirms the test goes red, with an interpretable failure message.
4. Reviewer reverts the break, confirms green again.
5. Reviewer records the mutation in the PR review: "Broke `Foo.bar()` to return `null` instead of throwing; test `it("throws when bar receives empty input")` failed as expected with message `...`."

This step is what prevents tautological tests from landing. It takes 60 seconds per PR and catches the failure mode that no amount of code review can catch on its own.

### What lives in the PR description

For every test grouping PR:

```
## Invariant under test
<one sentence>

## Layer
unit | bun-main integration | fake-IPC e2e | real-desktop e2e | property-based

## Cases
- <test name 1>
- <test name 2>
- ...

## Mutation test recorded by reviewer
Broke: <line / function>
Expected red: <test name>
Result: <actual failure message>
Reverted: yes
```

### Acceptable PR scope

- One grouping: yes
- One grouping + the production-code changes the tests assert on (when introduced together): yes
- Two unrelated groupings: no — split
- A grouping + unrelated refactors: no — split

## Test groupings by phase

The roadmap. Each row is one reviewable PR. Phase 0–1 are light because most of those tasks don't warrant tests. Phase 2–3 are dense because that's where the risk lives.

### Phase 0 — Foundations

| ID | Grouping | Layer | Cases | Notes |
|---|---|---|---|---|
| G0.1 | URL resolver edge cases (rejects `file://` viteDevUrl; handles spaces/unicode in bundledIndexPath; throws on unknown mode) | unit | 3 | Extension of existing 3 cases. |
| G0.2 | Env reader (`AVA_DESKTOP_MODE` default, invalid value throws, `AVA_VITE_DEV_URL` default) | unit | 3 | Requires extracting `readDesktopEnv()` from `main/index.ts`. |
| G0.3 | Bundle layout assertion (`pnpm build:desktop` produces `web/index.html` at the path `resolveWebviewUrl` computes) | integration | 1 | Catches Electrobun renaming its output dir between alpha versions. |

### Phase 1 — Platform abstractions

| ID | Grouping | Layer | Cases | Notes |
|---|---|---|---|---|
| G1.1 | `isDesktop()` branching + `Platform` type lock (`expectTypeOf<Platform>().toEqualTypeOf<"web" \| "desktop">()`) | unit + type-level | 4 | |
| G1.2 | Six interface signature locks via `expectTypeOf().parameters` (not just `toHaveProperty`) — one per interface, including `ServerApiClient.rpc` and `ServerApiClient.invokeFunction` | type-level | 6 | Breaks loudly when Phase 2 starts implementing handlers that drift. |
| G1.3 | `createRdbCrudClient` factory selection (web returns Supabase-backed; desktop throws in Phase 1; desktop returns Sqlite-backed in Phase 2 follow-up) | unit | 3 | Spy on `createSupabaseCrudClient`, assert `dbClient` injection. |
| G1.4 | **CRUD-migration regression suite** parameterized over every migrated entity (list → create → read → update → delete) | fake-IPC e2e (web mode) | ~20 entities × 1 parameterized spec | Highest-leverage PR in the phase. Single safety net for Task 5's mechanical edits. |
| G1.5 | Production build smoke (`pnpm build` + `pnpm build:desktop` both succeed; built bundles contain no `duckdb-wasm` for desktop) | integration / CI | 2 | Catches `require()` shim breakage under prod bundler that dev-mode hides. |
| G1.6 | `createServerApiClient` factory selection (web returns browser-backed wrapping today's `APIClient.ts` + a `supabase.rpc(...)` passthrough; desktop throws `Error("desktop ServerApiClient lands in Phase 2")` in Phase 1) | unit | 3 | Mirrors G1.3 for the new factory. Spy on the browser implementation, assert delegation. |
| G1.7 | ServerApi-migration regression — parameterized Playwright spec hitting every page that depends on the 2 migrated `supabase.rpc(...)` call sites and on `APIClient` consumers; snapshot test asserting `git grep "AvaSupabase\.DB\.rpc\(\|AvaSupabase\.DB\.functions\.invoke\("` over `src/` returns zero matches | fake-IPC e2e + unit | 1 Playwright spec + 1 grep snapshot | Mirrors G1.4 for the ServerApi surface. |

### Phase 2 — Native layer

| ID | Grouping | Layer | Cases | Notes |
|---|---|---|---|---|
| G2.1 | IPC contracts parity (handler-side type signatures match contract `__request`/`__response`) | type-level | 1 per contract group | Compile-time guard against drift between Tasks 1 and 8/10/11/12. |
| G2.2 | IPC client unit (happy path, error reply, concurrent calls to same channel get matched by id, bridge-missing throws, 5s timeout fires) | unit | 5 | The concurrency case will likely surface a bug in the `once`-listener pattern. |
| G2.3 | IPC server unit (dispatch, handler-throw → error reply, unknown channel) | unit | 3 | |
| G2.4 | IPC loopback (round-trip a real contract end-to-end via paired fake transport) | integration | 2 | Symmetry guard catching channel-name typos. |
| G2.5 | `userDataDir` resolver across platform fixtures (darwin, win32 happy, win32 with spaces, win32 missing APPDATA, linux throws) | unit | 5 | Uses `path/win32` directly to lock Windows behavior even on macOS CI. |
| G2.6 | `SYNCABLE_TABLES` manifest vs live Supabase schema (every `CREATE TABLE` in `supabase/migrations/*.sql` is in `SYNCABLE_TABLES ∪ EXCLUDED_TABLES`) | integration | 1 | Automates the human check in the Phase 2 Task 5 review. |
| G2.7 | PG→SQLite generator: fixture+golden snapshots (uuid→text, timestamptz→expected, RLS stripped, unknown table errors, idempotency) | integration | ~6 fixtures with golden output | Replaces the manual "spot-check the output" review step. |
| G2.8 | bun:sqlite migration runner (fresh DB applies all; idempotency on rerun; history mismatch detected; malformed migration rolls back without partial state) | integration | 4 | |
| G2.9 | `createSqliteCrudClient` round-trip on real bun:sqlite (insert→getById→list→update→delete; transaction rolls back on second-statement failure) | integration | 6 | |
| G2.10 | Outbox-in-same-transaction invariant (the data write + a manual `INSERT INTO _outbox` in the same tx commit atomically) | integration | 2 | Phase 3 prerequisite. Encoded in Phase 2 so Phase 3 doesn't redesign. |
| G2.11 | Snapshot bootstrap (empty→populated; populated→skip; partial-completion-per-table is recoverable; FK-ordered inserts; REST 401 → no partial state) | integration | 5 | Mocked Supabase REST via msw. |
| G2.12 | Native DuckDB happy path + parity (real `@duckdb/node-api` instance, SELECT 1, parquet round-trip, column types match a golden captured from duckdb-wasm) | integration | 3 + 1 golden | Catches BIGINT/INTEGER and TIMESTAMP_NS drift early. |
| G2.13 | Keychain pure-layer unit (argv construction for set/get/delete; status-code parsing including 44 = not found) | unit | 6 | |
| G2.14 | Keychain real-Security.framework round-trip (set → get → delete with non-ASCII payload; plaintext never appears in stdout/stderr) | gated integration | 3 | `it.skipIf(process.platform !== 'darwin' \|\| !process.env.KEYCHAIN_E2E)` |
| G2.15 | `FileSystemDatasetBlobStore` round-trip + listing + `stat` + delete | integration | 5 | |
| G2.16 | `FileSystemDatasetBlobStore` **atomic-write crash simulation** (monkey-patch `renameSync` to throw post-write; assert final key absent, partial `.tmp` may exist; path-traversal guard for `../` and `..\\`) | integration | 4 | The single test that proves the atomicity invariant the manual review can't. |
| G2.17 | `PlatformProvider` React component (mocked `isDesktop`; both branches resolve to correct adapter; `usePlatform` outside provider throws) | unit (RTL) | 3 | |
| G2.18 | **Fake-IPC harness scaffolding itself** (a test that proves the harness's `exposeFunction` bridge correctly routes a trivial echo contract) | infrastructure | 1 | This is "the test for the test harness." Lands before any Phase 2 e2e tests depend on it. |
| G2.19 | First fake-IPC e2e: sign in → upload CSV → list datasets → restart harness → dataset still listed (proves on-disk persistence through real IPC stack) | fake-IPC e2e | 1 | Replaces multiple manual smoke steps in Tasks 8/12/13. |
| G2.20 | ServerApi IPC round-trip (real `createIpcServer` + Bun-main `api.ts` handler against a mocked Supabase REST via msw): `rpc` round-trips; `invokeFunction` round-trips with `{ data, status }`; 401 surfaces as typed error; offline (msw NetworkError) surfaces as `OfflineError`; auth header injected by handler, not React client (verified via msw request inspection) | integration | 5 | Phase 2 Task 14. The single-network-egress invariant test. |

### Phase 3 — SyncEngine

This is the densest phase; silent data loss is the failure mode and property-based tests carry most of the weight.

| ID | Grouping | Layer | Cases | Notes |
|---|---|---|---|---|
| G3.1 | Sync schema migration (all `_sync_*` columns present per syncable table; bookkeeping tables exist; idempotent on rerun) | integration | 3 | |
| G3.2 | **Outbox/data atomicity property test** (`fast-check`: random sequences of writes with injected failures at each tx step; invariant: `count(outbox per row_id) ∈ {0, 1}` always — never partial) | property-based integration | 1 property × 1000 runs | Highest-leverage test in the entire project. |
| G3.3 | LWW pure-fn truth table (`{local, server} × {live, tombstone, missing} × {<, =, >}`, ~27 cases) | unit | 27 | |
| G3.4 | LWW property tests (`fast-check`: idempotency, tie-determinism, tombstone-monotonicity) | property-based unit | 3 properties | |
| G3.5 | NetworkProbe (fake timers; `start()` idempotent; rapid flap collapses to single transitions; `stop()` mid-flight aborts cleanly) | unit | 5 | |
| G3.6 | PushLoop drain order, batch boundary, backoff math, transient-vs-permanent classification | integration | 6 | |
| G3.7 | PushLoop duplicate-delivery idempotency (`fast-check`: crash after Supabase ack but before outbox delete; assert server-side row count = 1 after replay) | property-based integration | 1 property | |
| G3.8 | PullLoop cursor monotonicity, tombstone propagation, per-table cursor isolation, LWW-skipped-row still advances cursor | integration | 5 | |
| G3.9 | PullLoop ↔ PushLoop race (server-wins pull deletes outbox row; subsequent push response writes to a now-different row state) | integration | 2 | Specifically targets the race called out in the Phase 3 silent-data-loss list. |
| G3.10 | ParquetUploadLoop with **real mini-TUS server in vitest** (resume from `bytes_uploaded`; 404 on HEAD → restart at 0; 409 on PATCH → re-HEAD + adjust; toggling `online_storage_allowed=false` mid-upload enqueues delete) | integration | 5 | |
| G3.11 | SyncEngine orchestrator convergence (seed 50 outbox rows + 3 parquet uploads + 20 server-side changes; assert convergence within N ticks; local rows == server rows) | integration | 1 | |
| G3.12 | SyncEngine convergence under random network drops (`fast-check`: state-machine model; random sequence of `(local write, server write, network toggle, tick)`; assert eventual convergence) | property-based integration | 1 property | |
| G3.13 | Orchestrator mutex (concurrent `forceSync()` calls don't double-drain; assert `_server_updated_at` never regresses) | integration | 2 | |
| G3.14 | Status UI component (4 `SyncStatus` shapes render correctly; click → detail panel opens; unmount removes listener) | unit (RTL) | 6 | |
| G3.15 | Full end-to-end via fake-IPC harness: offline edits + offline upload → online → drain → desktop SQLite and mocked Supabase converge | fake-IPC e2e | 1 | Phase 3 acceptance criterion as a script. |

### Phase 4 — Hardening + macOS launch

| ID | Grouping | Layer | Cases | Notes |
|---|---|---|---|---|
| G4.1 | Logger rotation math (size boundary at `MAX_BYTES`; date boundary; collision append; injected clock + fs adapter) | unit | 6 | |
| G4.2 | Logger redaction unit (emails, URLs, base64 blobs, nested arrays, mixed-content strings, null/undefined short-circuits) | unit | 8 | |
| G4.3 | **Logger redaction property test** (`fast-check`: random row-like objects with sensitive leaves at depth ≤5; assert no email/JWT/blob pattern appears in serialized output) | property-based unit | 2 properties | Belt-and-suspenders for ESLint rule blind spots. |
| G4.4 | Logger FileSink integration (real tmp dir, faked clock; daily rotation; 14-day cleanup; 100MB total cap eviction) | integration | 4 | |
| G4.5 | ESLint rule cases (positive: `{ row }`, `{ payload }`, `{ data }`, nested; negative: structured fields, non-logger objects; documented limitations: aliased imports, destructured methods) | unit (`RuleTester`) | ~12 | |
| G4.6 | `BugReportBundle` selection (7 most-recent files; oversize file truncated; redacted content passes through) | unit | 4 | |
| G4.7 | Edge Function schema validation + auth (401 without header; 405 on GET; 400 on malformed body via Zod; 200 writes correct object path) | integration (Deno test) | 5 | |
| G4.8 | Bug report dialog flow (open Settings → preview → submit; mock Edge Function fetch; assert payload schema) | fake-IPC e2e | 1 | |
| G4.9 | Auto-updater version comparison + manifest parsing (semver edges; `1.0.0-beta`; missing fields; malformed JSON) | unit | 6 | |
| G4.10 | Codesign/notarize CI smoke (on release tag: `codesign --verify --deep --strict`, `spctl --assess`, `stapler validate`, fail build on non-zero) | CI infrastructure | 1 workflow job | |

### Phase 5 — Windows port

| ID | Grouping | Layer | Cases | Notes |
|---|---|---|---|---|
| G5.1 | `userDataDir` Windows fixtures (happy path, username with spaces, UNC path, missing APPDATA throws) | unit | 4 | Uses `path/win32` mode on macOS CI; also runs on actual Windows CI in G5.5. |
| G5.2 | wincred Keychain integration (set/get/delete with non-ASCII payload; plaintext absent from stdout/stderr) | gated integration | 3 | `it.skipIf(process.platform !== 'win32')` |
| G5.3 | signtool argv snapshot (`/fd SHA256`, `/tr`, `/td SHA256` present) + Windows CI sign-and-verify smoke against fixture binary | unit + CI infrastructure | 1 snapshot + 1 workflow job | |
| G5.4 | `@windows-regression` Playwright suite via WebView2 CDP — re-runs every prior phase's e2e specs against the built `.exe` | real-desktop e2e infrastructure | (suite, not new cases) | One-day spike first to verify Electrobun forwards `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`. |
| G5.5 | Cross-platform vitest matrix green on `windows-latest` runners (existing Phase 0–4 unit suite) | CI infrastructure | 1 matrix job | Phase 5 exit gate. |

## Known gaps

Tests this strategy does **not** cover. Documented so the team isn't surprised.

| Gap | Why not | Compensating control |
|---|---|---|
| macOS WKWebView rendering quirks | No automation hook exists | Phase 4 manual dogfood + Apple's `WKWebView.isInspectable` debugging for ad-hoc inspection |
| Native menus / dock / tray / OS dialogs on macOS | XCUITest can drive these but the investment isn't justified for V1 | Manual smoke per release |
| Packaging-level breakage (sign / notarize / stapler) | Real Apple infrastructure required | CI codesign smoke job G4.10 on every release tag |
| Cross-process crash isolation | Harness collapses both processes into the test runner | Manual force-quit tests during Phase 3 dogfood |
| Auto-update signature/integrity | V1 manifest has no checksum; flagged for V2 | Add `sha256` field to manifest now, even if verification lands later |
| Real Supabase Realtime subscriptions (V2 only) | Out of V1 scope | n/a |

## Open questions

- **WebView2 env-var passthrough.** Phase 5 G5.4 assumes Electrobun forwards `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` to the WebView2 host process. One-day spike at the start of Phase 5 to verify. Fallback: contribute the passthrough upstream, or build a thin shim in our Bun-main entry.
- **Test runtime selection.** Recommend Bun for harness + integration suites; vitest under Node for pure unit tests in `packages/*`. Confirm the team's preference before Phase 2 starts — switching later is non-trivial.
- **Property-test seed reproducibility.** `fast-check` runs are seeded; CI should print the seed on failure so a failing property test can be reproduced locally. Confirm CI log capture includes stderr from the test runner.
- **Coverage thresholds.** Recommend not setting hard coverage gates — they incentivize tautological tests, exactly the failure mode this spec is designed to avoid. The mutation-test review step is the substitute. Confirm before adoption.

## Decisions captured

- Four testing layers: unit, Bun-main integration, fake-IPC e2e, real-desktop e2e (platform-specific).
- `fast-check` adopted for property-based testing in sync engine and log redaction.
- Test runner is Bun for any suite touching `bun:sqlite`, Bun FFI, or the fake-IPC harness.
- Per-PR test groupings — one invariant, ~5–15 cases, single-layer.
- Mutation-test step is required on every test PR review (not optional).
- No coverage-percentage gates.
- macOS real-desktop e2e is limited to XCUITest smoke + manual dogfood by design.
- Windows real-desktop e2e via Playwright + WebView2 CDP, tagged `@windows-regression`.
- IPC server (`createIpcServer`) is a transport-agnostic dispatcher; the same instance runs under Electrobun in production and under Playwright in tests.
- `ServerApiClient` is the sixth platform abstraction; covers Supabase RPCs and Edge Functions; V1 desktop throws `OfflineError` when offline (no queueing); V2 may add per-call queueing.
