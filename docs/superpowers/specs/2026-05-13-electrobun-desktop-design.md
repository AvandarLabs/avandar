# Electrobun Desktop App — V1 Design

**Date:** 2026-05-13
**Status:** Draft for review
**Author:** Pablo (with Claude)

## Summary

Avandar will be shipped as an **Electrobun desktop application** in addition to its existing web deployment. The desktop shell exists to give users **disk space as the canonical store** for uploaded data and DuckDB working files, so IndexedDB is no longer a storage bottleneck. The desktop app is **offline-first** with a custom-built sync engine that keeps a subset of relational data and user-permitted parquet uploads in sync with Supabase.

V1 ships macOS and Windows with sync limited to user-owned artifacts. V2 (planned, not built) extends sync to the full app and adds device management, richer error reporting, and CRDT/HLC-based conflict resolution.

## Goals

- Run the existing web app inside a native desktop shell with **maximal frontend code reuse** — the React app sees a clean platform abstraction layer and is otherwise unchanged.
- Make the user's hard disk the **canonical store** for bulk data (parquet files, raw source uploads).
- Use **native DuckDB** (in Bun main) on desktop, replacing in-memory `duckdb-wasm`, so analytical work can operate over persistent disk-backed databases.
- Provide a **custom offline-first sync engine** for relational data (no third-party sync service) — V1 covers user-owned artifacts only.
- Keep the implementation **shell-swappable** — abstractions are clean enough to swap Electrobun for Tauri or Electron if Electrobun's alpha status becomes a blocker.

## Non-Goals (V1)

- Linux support
- Full bidirectional sync of all Supabase tables (V2)
- CRDT or hybrid-logical-clock conflict resolution (V2)
- Source-file (CSV/XLSX) sync to Supabase Storage — only parquet uploads sync (V2 if requested)
- Device registration & remote revocation UI (V2)
- Third-party error reporting / session replay (V2 scoping later; do not lock into Sentry)
- App Store / Microsoft Store distribution (revisit post-launch)

## High-Level Architecture

The desktop app runs as two processes communicating over Electrobun's IPC channel.

```
┌──────────────────────────────────────────────────────────────────┐
│                     Electrobun App Bundle                        │
│                                                                  │
│  ┌──────────────────────────┐    ┌──────────────────────────┐    │
│  │   Webview (renderer)     │    │   Bun main (privileged)  │    │
│  │   - Native WKWebView /   │    │   - Bun runtime          │    │
│  │     WebView2             │    │   - native DuckDB        │    │
│  │   - Loads existing       │    │   - bun:sqlite           │    │
│  │     React app build      │    │   - node:fs, fetch       │    │
│  │   - duckdb-wasm DISABLED │◄──►│   - OS keychain (FFI)    │    │
│  │     (replaced by IPC     │IPC │   - Supabase REST/Realtime│   │
│  │     client to native)    │    │   - SyncEngine worker    │    │
│  │   - Dexie REMOVED on     │    │                          │    │
│  │     desktop              │    │                          │    │
│  └──────────────────────────┘    └──────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Key design moves:

1. **The webview loads the same Vite build as the web app.** Same `src/main.tsx`, same React, same router, same components. Platform differences are injected at runtime through a `PlatformProvider` React context that resolves to the appropriate `DuckDbClient` / `RdbClient` / `ServerApiClient` / `DatasetBlobStore` / `AuthProvider` / `SyncEngine` implementation. Detection via `window.__AVA_PLATFORM__` set by Electrobun's preload script.

2. **All privileged work happens in Bun main.** Native DuckDB, file IO, SQLite, keychain access, Supabase realtime/storage. The webview never touches the filesystem directly.

3. **IPC is the syscall surface.** Each platform abstraction has a typed RPC contract. Contracts live in `packages/shared/platform/ipc/contracts.ts` and are typed identically on both sides.

4. **Supabase access path differs by platform:**
   - Web: webview talks to Supabase directly (today's behavior).
   - Desktop: data reads/writes, Supabase RPC invocations (`supabase.rpc(...)`), and Edge Function calls (`supabase.functions.invoke(...)`) all route through Bun main, so Bun main is the only network egress for Supabase. The SyncEngine sees every mutation; auth still touches Supabase from Bun main; realtime subscriptions (V2) live in Bun main.

5. **Dexie is removed on desktop entirely.** On the web it remains as the parquet cache for `duckdb-wasm`. On desktop, parquet files live directly on disk and are loaded by native DuckDB.

## Platform Abstraction Layer

Six interfaces live in `packages/shared/platform/types.ts`. Each has a web implementation (existing behavior) and a desktop implementation (IPC client to Bun main).

```ts
export interface DuckDbClient {
  runStructuredQuery<T>(query: StructuredQuery): Promise<T[]>;
  runRawQuery<T>(sql: string, params?: unknown[]): Promise<T[]>;
  loadParquetFromDatasetBlobStore(datasetId: string): Promise<void>;
  loadFromUpload(
    file: File | { path: string },
    opts: ImportOptions,
  ): Promise<DatasetMeta>;
}

export interface DatasetBlobStore {
  put(key: DatasetBlobKey, bytes: Uint8Array | ReadableStream): Promise<void>;
  get(key: DatasetBlobKey): Promise<ReadableStream>;
  delete(key: DatasetBlobKey): Promise<void>;
  exists(key: DatasetBlobKey): Promise<boolean>;
  list(prefix: DatasetBlobKey): Promise<DatasetBlobKey[]>;
  stat(key: DatasetBlobKey): Promise<{ size: number; mtime: number } | null>;
}

export interface RdbClient {
  query<T>(model: ModelName, filter: Filter): Promise<T[]>;
  upsert<T>(model: ModelName, row: T): Promise<T>;
  delete(model: ModelName, id: string): Promise<void>;
  transaction<T>(fn: (tx: RdbTx) => Promise<T>): Promise<T>;
}

export interface ServerApiClient {
  // Supabase RPCs — Postgres functions invoked via PostgREST (`supabase.rpc(...)`)
  rpc<TName extends RpcName>(
    name: TName,
    args: RpcArgs<TName>,
  ): Promise<RpcResult<TName>>;
  // Edge Functions — typed by the existing `keyof API` route schema in `src/clients/APIClient.ts`
  invokeFunction<TRoute extends keyof API>(
    req: APIRequest<TRoute>,
  ): Promise<APIResult<TRoute>>;
}

export interface AuthProvider {
  getSession(): Promise<Session | null>;
  signIn(creds: Credentials): Promise<Session>;
  signOut(): Promise<void>;
  refreshIfNeeded(): Promise<void>;
  onAuthChange(cb: (s: Session | null) => void): Unsubscribe;
}

export interface SyncEngine {
  enqueue(mutation: Mutation): Promise<void>;
  status(): SyncStatus;
  forceSync(): Promise<void>;
  onStatusChange(cb: (s: SyncStatus) => void): Unsubscribe;
}
```

## CRUD Client Layer

The existing pattern (per `AGENTS.md` repository convention) already injects DB clients at factory time. We add **one umbrella factory** that selects per-platform:

```ts
// packages/shared/clients/createRdbCrudClient.ts
export function createRdbCrudClient<M>(spec: RdbCrudClientSpec<M>) {
  if (isDesktop()) {
    return createSqliteCrudClient(spec); // new: IPC → bun:sqlite
  }
  return createSupabaseCrudClient({ dbClient: AvaSupabase.DB, ...spec });
}
```

Migration of existing ~20 client files is mechanical (find/replace), no React-component changes. Existing `createDexieCrudClient` callers stay as-is (Dexie remains web-only for parquet caching).

Naming convention:

- `createRdbCrudClient(spec)` — top-level platform-aware factory used by every client file
- `createSqliteCrudClient(spec)` — desktop backend
- `createSupabaseCrudClient({ dbClient, ...spec })` — web backend (existing)

## ServerApiClient — RPCs & Edge Functions

`ServerApiClient` exists for two call surfaces the relational `RdbClient` doesn't cover: Supabase RPCs (`supabase.rpc(...)`) and Edge Functions (`supabase.functions.invoke(...)`). Both are server-side procedures with no local equivalent — they cannot be approximated against the local SQLite/DuckDB stores.

**Why a dedicated interface rather than letting consumers call Supabase directly:**

1. **Single network egress on desktop.** Design move #4 (above) requires all Supabase traffic to route through Bun main. If RPCs or Edge Functions bypass this, the SyncEngine's view of pending state is incomplete and observability is fragmented across two processes.
2. **WKWebView CORS.** WKWebView's CORS is stricter than Chrome. Routing every Supabase call through Bun's `fetch` avoids that class of webview-specific bugs.
3. **Unified offline error surface.** An unwrapped `supabase.rpc(...)` failing while offline throws a generic `fetch` error somewhere deep in a React component. Through `ServerApiClient`, it throws a typed `OfflineError` that the `SyncStatus` indicator already knows how to display.
4. **V2 forward-compatibility.** Some write RPCs and Edge Functions are queueable (e.g. "send invitation") — adding that later without an interface boundary is a much harder refactor than wiring it into an existing one.

**Naming convention:**

- `createServerApiClient()` — top-level platform-aware factory returning a `ServerApiClient`
- `createBrowserServerApiClient()` — web backend; thin wrapper over today's `src/clients/APIClient.ts` (which already centralizes Edge Function calls behind a typed `keyof API` schema) plus a `supabase.rpc(...)` passthrough
- `createIpcServerApiClient()` — desktop backend; an IPC client routing both `rpc(...)` and `invokeFunction(...)` calls to Bun main, where the actual Supabase fetch happens

**V1 behavior:**

- Both web and desktop: pass-through to Supabase when online.
- Desktop offline: throw `OfflineError`. The call is **not** queued in V1. Read-only RPCs (the common case in our codebase today: 2 call sites in `DatasetClient.ts` and `WorkspaceClient.ts`) fail loudly, exactly as a manual page reload would.
- Web offline: same as today (generic `fetch` error). Unchanged.

**V2 (not built):**

- Per-call queueing for specific write RPCs and Edge Functions via a marker on the `ServerApiClient` call site (e.g. `serverApi.invokeFunction({ ...req, queueWhenOffline: true })`). Queue lives in `sync_outbox` alongside relational mutations; replayed after reconnect.

**Migration scope (Phase 1 Task 5 extends to cover this):**

- 2 `supabase.rpc(...)` call sites: `src/clients/datasets/DatasetClient.ts`, `src/clients/WorkspaceClient.ts` → call `serverApi.rpc(...)` instead.
- `src/clients/APIClient.ts` → reimplement its `sendHTTPRequest` to delegate to `serverApi.invokeFunction(...)`. The public `APIClient.get/post/patch/put/delete` surface is unchanged; every consumer keeps working.

## RdbClient & Local Relational Store

**Where SQLite runs:** Bun main, via `bun:sqlite`. Single-writer / multi-reader (Bun main is the only process touching the file).

**Schema strategy:** local SQLite is a **deliberate near-mirror** of Supabase Postgres tables in `SYNCABLE_TABLES`, with three additions:

1. Per-row sync columns on every syncable table:
   ```
   _local_updated_at    INTEGER NOT NULL  -- ms epoch
   _server_updated_at   INTEGER           -- last-known server timestamp; NULL = never synced
   _sync_state          TEXT NOT NULL     -- 'clean' | 'dirty' | 'conflict'
   _deleted_at          INTEGER           -- soft-delete tombstone for sync
   ```
2. `sync_outbox` table — pending mutations the SyncEngine drains.
3. `sync_cursor` table — `last_pulled_server_updated_at` per table.

**Why a near-mirror, not a different shape:** the frontend already understands Supabase row shapes; RdbClient returns the same shapes (minus the `_sync_*` prefix). Sync becomes a per-row diff, which is far simpler than mapping between two schemas.

**Transaction model.** Reads and writes are async via IPC. Transactions are scoped:

```ts
await rdb.transaction(async tx => {
  const ds = await tx.upsert('datasets', {...});
  await tx.upsert('dataset_versions', { datasetId: ds.id, ... });
});
```

Outbox entries are appended **inside the same SQLite transaction** as the data write. Crash safety depends on this invariant.

## Migration Generation (Postgres → SQLite)

A `pnpm run gen:sqlite-migrations` script translates `supabase/migrations/*.sql` into `apps/desktop/migrations/*.gen.sql` via **`sqlglot`** (Python), invoked through **`uv`** (`uv run --with 'sqlglot>=26.0.0,<27.0.0' python -c "..."`). The only developer-machine prerequisite is `uv`; `sqlglot` is never an npm dependency and never reaches the runtime bundle. Generated SQLite migrations are **committed** to the repo, mirroring how Postgres migrations are committed today.

**Approach: classify-and-filter, schema-shape only, hand-edits for the rest.**

The generator runs every Postgres statement through a classifier that buckets it by intent rather than transpiling everything wholesale. Three buckets matter at runtime:

- _Schema-shape_ (CREATE/ALTER/DROP TABLE, CREATE/DROP INDEX) — kept, transpiled to SQLite, written to the per-migration `.gen.sql`.
- _Drop_ (RLS, GRANT/REVOKE, functions, triggers, types, COMMENT, SET, data-mutation statements, `ENABLE ROW LEVEL SECURITY`, `VALIDATE CONSTRAINT`, `DROP/RENAME CONSTRAINT`, `ADD CONSTRAINT … USING INDEX`) — silently discarded. SQLite either has no equivalent or treats the construct as a no-op for our use case.
- _Needs hand-edit_ — schema-relevant statements SQLite's `ALTER TABLE` cannot accept post-creation. Today this is `ADD CONSTRAINT` (FK, CHECK, PK, UNIQUE) and `ALTER COLUMN` (type change, set/drop default, set/drop NOT NULL). The generator drops them from the `.gen.sql` output and prints a yellow `⚠ needs hand-edit` warning at the end of the run listing each statement plus its source file. The developer inlines the change into the matching `CREATE TABLE` in the earlier `.gen.sql`. Same pattern Alembic uses when auto-generation falls short.

**Guarded generator behavior:**

- A `SYNCABLE_TABLES` manifest (`apps/desktop/sync/syncable-tables.ts`) is the source of truth for which Postgres tables become local SQLite tables.
- For each schema-shape statement: if its primary table is in `SYNCABLE_TABLES`, transpile via sqlglot and emit (with FK targets checked against the manifest — see below). If the primary table is in `EXCLUDED_TABLES`, silently skip.
- **Hard error** if a statement references a table that's neither in `SYNCABLE_TABLES` nor `EXCLUDED_TABLES`, or has a leading keyword the classifier does not recognise — forces a human decision (categorise the table, extend the classifier, or both).
- Post-transpile, a `_stripPostgresIsms` step removes residue sqlglot can't drop on its own (`"public".` schema prefixes, `NOT VALID`, `USING btree`, `NULLS FIRST/LAST` in index defs, `ARRAY<T>` → `TEXT`, `ADD COLUMN IF NOT EXISTS` → `ADD COLUMN`, `DEFAULT <fn>(...)` clauses whose function does not exist on SQLite like `UUID()` / `auth.uid()`).
- A CI check (`pnpm check:sqlite-migrations`) regenerates and diffs against committed output; fails on drift. Because hand-edited `.gen.sql` files would always diff against a fresh regen, the check is most useful as a "fresh-gen vs committed" ledger reviewer, not as a strict equality gate, until a preserve-hand-edits mechanism exists.

**Foreign-key handling.** SQLite enforces foreign keys natively when `PRAGMA foreign_keys = ON;` is set (Phase 2 Task 7's runner sets this at connection open). The generator preserves every FK whose target table is in `SYNCABLE_TABLES`:

- FKs declared _inline_ in `CREATE TABLE` (column-level `REFERENCES` or table-level `FOREIGN KEY (...) REFERENCES …`) are emitted verbatim — SQLite accepts them as-is.
- FKs declared as a separate `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY` are routed to the `needs hand-edit` warning because SQLite has no way to add a FK after table creation. The developer inlines them into the matching `CREATE TABLE`.
- FKs targeting a non-public schema (e.g. `references auth.users`) or an `EXCLUDED_TABLES` entry are dropped — the target table does not exist in the SQLite mirror, so the constraint can't be honoured.

RLS policies, functions, triggers, and GRANTs are intentionally dropped during translation — the local SQLite store is single-user (the local user), so RLS is unnecessary and the rest are Postgres-only constructs without SQLite equivalents.

## DatasetBlobStore & File Management

Bulk data (parquet, raw source files) lives outside SQLite.

**Implementations:**

- **Web** (`DexieDatasetBlobStore`): parquet files stored as blobs in Dexie keyed by `datasetId`. Source files are not kept (Dexie storage budget). Supabase Storage is the off-machine durable copy when uploaded.
- **Desktop** (`FileSystemDatasetBlobStore`): parquet **and** source files on disk under the per-OS-user app data directory. Bun main owns this; webview never has direct filesystem access. Supabase Storage upload is opt-in via the existing "online-storage-allowed" flag.

**`DatasetBlobKey` shape (used by both backends):**

```
workspaces/<workspaceId>/datasets/<datasetId>/source.<ext>
workspaces/<workspaceId>/datasets/<datasetId>/data.parquet
workspaces/<workspaceId>/datasets/<datasetId>/meta.json
```

**On disk (desktop)** — per-OS-user, OS-conventional paths:

```
macOS:   ~/Library/Application Support/Avandar/
Windows: %APPDATA%\Avandar\
```

```
<userDataDir>/
  ├── auth/                              # keychain references only
  ├── metadata.sqlite
  ├── metadata.sqlite-wal
  ├── workspaces/<wsId>/datasets/<dsId>/
  │   ├── source.<ext>                   # canonical
  │   ├── data.parquet                   # derived, regeneratable
  │   └── meta.json                      # parse options, schema, derivation timestamp
  └── logs/
```

**Atomic writes.** `put` writes to `<path>.tmp`, then `fsync` + `rename`. A partial write is never observable.

**Storage accounting.** A `dataset_blob_index` table in SQLite tracks per-key size, mtime, last-read-at, and a `derivable_from` reference so parquet files can be safely evicted (regeneratable from source).

**GC (V1):**

- On user-requested "free up space" or disk-pressure heuristic at startup: parquet blobs whose `last_read_at` exceeds N days and whose source still exists are deleted. Regenerated lazily on next read.
- Source files never auto-deleted; only removed when the user deletes the dataset.

## Auth (V1)

Webview owns UI; Bun main owns secrets and the network calls.

- **First launch (online):** sign-in form → IPC → Bun main calls Supabase Auth REST → refresh token written to OS keychain via Bun FFI (`Security.framework` on macOS, `wincred.dll` on Windows); access token held in memory only.
- **Subsequent launches (online):** Bun main refreshes via stored refresh token; emits `auth.onChange(session)` to webview.
- **Subsequent launches (offline):** Bun main reads refresh token; cannot refresh; emits offline-cached session built from the local `user_profiles` row. App is fully usable in offline mode; affordances requiring online (invites, etc.) are disabled.
- **Online resume:** OS network listener triggers `refreshIfNeeded`. If refresh succeeds, SyncEngine drains its outboxes. If "invalid refresh token", route to login.
- **Sign out:** revoke (if online) + clear keychain + emit null session.

**Keychain access** uses Bun FFI to the native APIs directly (no subprocess overhead, identical security to OS-keychain). The wrapper exposes `set / get / delete / list` semantics for app-scoped secrets.

**Risk:** there is no widely-adopted, battle-tested Bun-native keychain library today. The FFI bindings are small but greenfield — budget time during Phase 2 to develop and test them.

## SyncEngine (V1)

The SyncEngine has one job: **keep user-owned SQLite rows in sync with Supabase, and drain queued parquet uploads when online.** Lives in Bun main, runs continuously while the app is open, persists state in SQLite so a crash loses no pending writes.

### Relational Sync

**Push loop (local → Supabase)**, on `enqueue()` or periodic timer (~5s fallback) while online:

1. Read oldest N outbox entries.
2. Attempt the corresponding Supabase mutation.
3. On success: delete outbox row, update `_server_updated_at`, set `_sync_state = 'clean'`.
4. On transient failure: bump `attempts`, exponential backoff (1s → 2s → 4s → … cap 5min).
5. On permanent 4xx: mark `_sync_state = 'conflict'`, surface in UI.
6. On conflict (server `updated_at` is newer than expected): LWW — compare `_local_updated_at` vs server `updated_at`. Winner overwrites. Set `_sync_state = 'clean'`.

**Pull loop (Supabase → local)**, on app start when online and on a periodic timer (~30s active, slower idle):

1. For each syncable table, read `last_pulled_server_updated_at` cursor.
2. `SELECT * FROM <table> WHERE updated_at > $cursor ORDER BY updated_at LIMIT N`.
3. For each row: if local is `clean`, upsert. If local is `dirty`, LWW — winner overwrites, loser's outbox entry dropped (logged).
4. Advance cursor to max `updated_at` in the batch. Repeat until page is short.

**Why LWW for V1:** correct when conflicts are rare (true for user-owned artifacts in practice). Cases where it's wrong — concurrent edits to the same field on two devices — are the cases V2's HLC/CRDT approach is designed to handle. Acceptable trade-off for V1.

### Parquet Upload Sync

Datasets marked "online-storage-allowed" must have their parquet uploaded to Supabase Storage. When offline, the upload is queued; on reconnect, it drains.

**Outbox:**

```sql
parquet_blob_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dataset_id TEXT NOT NULL,
  parquet_blob_key TEXT NOT NULL,
  op TEXT NOT NULL, -- 'upload' | 'delete'
  online_storage_allowed BOOLEAN NOT NULL,
  created_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  tus_upload_url TEXT,
  bytes_uploaded INTEGER NOT NULL DEFAULT 0
)
```

**Push loop:**

1. Read oldest entry where `op = 'upload'` AND `online_storage_allowed = true`.
2. If `tus_upload_url` is null, initiate resumable upload to Supabase Storage (port the existing `DatasetParquetStorageClient` TUS pattern from web code, run it in Bun).
3. Stream from disk in chunks; persist `bytes_uploaded` after each chunk so a crash mid-upload resumes.
4. On completion: delete outbox row; set `parquet_uploaded_at` on the dataset row (which itself syncs via the relational engine).
5. On transient failure: exponential backoff with larger floors than relational sync (30s → 2min → 10min cap).
6. On permanent failure: mark `last_error`, surface in UI.

Toggling `online_storage_allowed` later enqueues `upload` or `delete` ops accordingly.

**Important policy:** dataset metadata (`datasets` row) **always** syncs to Supabase via the relational engine — Supabase always knows the dataset exists. Only the parquet bytes are gated by the opt-in flag. **Source files (CSV/XLSX) are never uploaded to Supabase Storage** in any case; they live only on local disk on desktop and are not represented on the web at all.

### Status Surface

```ts
type SyncStatus =
  | { kind: "offline" }
  | {
      kind: "online";
      state: "idle" | "syncing";
      lastSyncedAt: number;
      pendingRows: number;
      pendingParquets: number;
      bytesUploading?: number;
    }
  | {
      kind: "error";
      lastError: string;
      pendingRows: number;
      pendingParquets: number;
    };
```

Surfaced as a small persistent indicator in app chrome with a click-through detail panel showing the outboxes and conflict rows.

### Crash-Safety Invariant

Every CRUD client write enqueues its outbox entry **in the same SQLite transaction** as the data write. This is non-negotiable.

```ts
async function upsert(row) {
  return await rdbTx(async (tx) => {
    await tx.run("UPDATE/INSERT ...", row);
    await tx.run("INSERT INTO sync_outbox ...", { table, op, payload });
  });
}
```

## Observability (V1)

No third-party error reporting in V1. `console.error` plus structured JSONL log files in `<userDataDir>/logs/`.

**Logger:** the existing `packages/shared/logger` gets a platform-aware sink layer. Web sink = `console.error` (today). Desktop sink = `console.error` + JSONL file writes.

**Rotation & cleanup:**

- Rotate `current.log` → `YYYY-MM-DD.log` at midnight local time _or_ when the file exceeds 10 MB, whichever first.
- Delete files older than **14 days** on app startup.
- Hard cap total log dir size at **100 MB**; delete oldest until under cap.

**Privacy boundary — never log raw user data:**

- Logger API accepts only typed structured fields. No free-form `data` / `payload` / `row` / `rows` keys.
- A custom ESLint rule blocks `logger.*(...)` calls that include identifiers named `row`, `rows`, `payload`, `data`, `body`, `content`, `value`, `record`, `records`. Forces explicit review.
- A defensive redaction pass on write (strip anything matching email/URL/long-base64/JSON-blob heuristics) as belt-and-suspenders.

**In-app bug report:**

- Settings → "Report a problem" → dialog with description input and "Preview what gets sent" toggle.
- Auto-collects app version, OS + version, anonymized user ID, last N days of log files.
- Submits to a Supabase Edge Function (`bug-reports`) that writes to a bucket or forwards to the team support inbox. Not `mailto:` (unreliable).

## Codebase, Build & Packaging

### New monorepo additions

```
apps/desktop/
  ├── package.json
  ├── electrobun.config.ts
  ├── main/
  │   ├── index.ts                  # Bun main entry point
  │   ├── ipc/                      # IPC handler implementations
  │   ├── services/                 # DuckDb, Sqlite, Keychain, SupabaseRest, SyncEngine
  │   └── platform/                 # userDataDir, network
  ├── migrations/                   # committed, generated SQLite migrations
  ├── preload/index.ts              # injects window.__AVA_PLATFORM__ + IPC client
  └── scripts/
      ├── gen-sqlite-migrations.ts  # shells out to Python sqlglot
      └── check-migrations.ts       # CI drift check

packages/shared/platform/           # NEW directory
  ├── types.ts                      # all six interface definitions
  ├── isDesktop.ts
  └── ipc/
      ├── contracts.ts
      └── client.ts
```

### Build pipelines

| Target          | Tooling       | Entry                           | Output                                      |
| --------------- | ------------- | ------------------------------- | ------------------------------------------- |
| Web             | Existing Vite | `src/main.tsx`                  | `dist/`                                     |
| Desktop webview | Same Vite     | `src/main.tsx` (same!)          | Same `dist/`, consumed by Electrobun bundle |
| Desktop main    | `bun build`   | `apps/desktop/main/index.ts`    | Single Bun executable                       |
| Desktop preload | `bun build`   | `apps/desktop/preload/index.ts` | Tiny script injected into webview           |

The webview build is the **same** web build. Runtime platform detection is the primary mechanism; `AVA_TARGET` env var is an escape hatch for build-time tree-shaking (e.g. dropping `duckdb-wasm` from the desktop webview bundle to save ~30MB).

### Dev experience

```bash
pnpm dev                  # web app on localhost:5173 (unchanged)
pnpm dev:desktop          # Electrobun launches, webview at localhost:5173, Bun main running locally
pnpm gen:sqlite-migrations
pnpm check:sqlite-migrations
```

### Packaging

- `pnpm build:desktop` → signed `.app` (macOS) and `.exe`/`.msi` (Windows).
- macOS: Apple Developer ID + notarization via `xcrun notarytool`.
- Windows: EV cert strongly recommended to avoid SmartScreen warmup; OV cert acceptable with friction.
- Auto-update: Electrobun's built-in updater pointed at a manifest hosted on Supabase Storage (or similar). Single `stable` channel for V1.
- Distribution: signed downloads from the website. No App Store / Microsoft Store in V1.

## V2 Architecture Notes (Planned, Not Built)

Captured here so V1 design decisions stay forward-compatible.

| Area                                 | V1                                                    | V2 (planned)                                                                                                                                                                               |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sync scope                           | User-owned artifacts                                  | Full-app bidirectional sync of additional tables (collaborative state); each table classified as "LWW", "HLC field-level", or "CRDT"                                                       |
| Sync engine                          | Outbox + LWW                                          | Hybrid logical clocks per row; per-field timestamps for fine-grained merges; CRDTs (Yjs/Automerge/Loro) for concurrent-edit-prone fields                                                   |
| Sync transport                       | Periodic poll                                         | Supabase Realtime subscriptions per syncable table                                                                                                                                         |
| Auth                                 | Cached refresh token in OS keychain                   | + Device registration with `user_devices` table; remote revocation UI on web settings; optional biometric unlock (Touch ID / Windows Hello)                                                |
| Parquet sync                         | Push-only (upload-on-reconnect)                       | Pull-on-fresh-install; content-hash deduplication                                                                                                                                          |
| Source files                         | Local only, never uploaded                            | Optional source-file sync (separate opt-in) if user demand warrants                                                                                                                        |
| Storage GC                           | Manual + simple heuristic                             | LRU eviction with configurable disk budget; cloud-tier evicted parquet for cheap re-fetch                                                                                                  |
| Error reporting                      | console.error + JSONL log files + in-app email report | Scoped investigation: self-hosted (Glitchtip, Highlight.io self-hosted) or carefully-configured SaaS; session replay with strict masking. Do not lock into Sentry — evaluate alternatives. |
| Platforms                            | macOS + Windows                                       | macOS + Windows (Linux still out of scope unless explicitly added)                                                                                                                         |
| Shell                                | Electrobun                                            | Keep abstractions clean enough to swap to Tauri or Electron if Electrobun stalls                                                                                                           |
| Distribution                         | Signed direct download                                | + App Store / Microsoft Store if their distribution surface is needed                                                                                                                      |
| RPC / Edge Function offline behavior | `OfflineError` (no queueing)                          | Opt-in per-call queueing via `serverApi.invokeFunction({ ..., queueWhenOffline: true })`; queue lives in `sync_outbox` alongside relational mutations; replayed on reconnect               |

## Phased Rollout

**Phase 0 — Foundations (1–2 weeks).** `apps/desktop/` scaffolded; Electrobun hosts the existing web build as a shell; login works; smoke test of read-only browsing.

**Phase 1 — Platform abstractions, no behavior change (1–2 weeks).** Define the six interfaces in `packages/shared/platform/`; implement web-side adapters wrapping today's code; migrate ~20 client files to `createRdbCrudClient`; migrate the 2 `supabase.rpc(...)` call sites and `src/clients/APIClient.ts` to `createServerApiClient`. Both shells still behave identically to today.

**Phase 2 — Desktop native layer wired up (2–3 weeks).** IPC contracts; `bun:sqlite` + first migrations via `sqlglot`; `RdbClient` IPC live; native DuckDB in Bun main; `DatasetBlobStore` filesystem implementation; keychain via Bun FFI. Desktop runs offline against a snapshot, uploads persist to disk, no sync yet.

**Phase 3 — V1 SyncEngine (2–3 weeks).** `sync_outbox`, `parquet_blob_outbox`, `sync_cursor` plus per-row sync columns; push and pull loops; LWW resolution; TUS-resumable parquet upload from Bun; sync status indicator; minimal error/conflict review panel.

**Phase 4 — Hardening & macOS launch (2 weeks).** Code signing + notarization in CI; auto-update wired; local logger + in-app bug report flow; acceptance tests; internal dogfood.

**Phase 5 — Windows port (2–3 weeks).** Windows-specific keychain FFI; path resolution; code signing certificate + signing pipeline; regression sweep.

**Rough V1 timeline: 12–15 weeks of focused work for one engineer.** Add ~30% buffer for Electrobun rough edges and signing/notarization tooling debt.

## Risk Register

Ordered by _likelihood × impact_.

| #   | Risk                                                                                                                    | Likelihood      | Impact     | Mitigation                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------- | --------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Electrobun alpha — distribution tooling breaks** (signing, notarization, auto-update edge cases)                      | High            | High       | Validate full sign→notarize→install→auto-update loop in Phase 0/4. Budget time. Keep abstractions clean enough to swap shells.                                                                                                               |
| 2   | **Sync engine correctness bugs** (silent data loss from outbox/data write atomicity holes)                              | Medium          | Very High  | Hard invariant: outbox writes are in the same SQLite transaction as data writes. Comprehensive integration tests. Diagnostic tool that compares local vs server and reports drift.                                                           |
| 3   | **SQLite migration translator misses Postgres-specific features** silently                                              | Medium          | High       | Generator emits hard errors on unknown constructs. CI drift check on every PR. Human review of generated diffs in PR.                                                                                                                        |
| 4   | **Native DuckDB in Bun has compatibility gaps** vs duckdb-wasm (extensions, spatial, etc.)                              | Medium          | Medium     | Verify in Phase 2 against actual query workload before deeper investment. Document extension parity. Worst case: hybrid execution model for extension-dependent queries.                                                                     |
| 5   | **OS Keychain UX edge cases** (locked keychain, biometric prompts, signing identity changes invalidating saved entries) | Medium          | Medium     | Always have a re-authenticate fallback path. Surface keychain errors clearly.                                                                                                                                                                |
| 6   | **Windows code signing reputation warmup** (SmartScreen warning on first releases)                                      | High            | Low-Medium | Procure EV cert _or_ accept ~1–2 weeks of SmartScreen friction while OV cert builds reputation.                                                                                                                                              |
| 7   | **Disk pressure from uncapped growth** (kept source files + parquet)                                                    | Low (initially) | Medium     | V1: surface storage usage in settings + manual "free up space" action. V2: configurable disk budget + auto-GC.                                                                                                                               |
| 8   | **Supabase rate limits during sync storms** (e.g. first sync of a heavy user)                                           | Low             | Medium     | Push loop respects 429 responses with longer backoff. Bulk pull paginated.                                                                                                                                                                   |
| 9   | **Log files inadvertently contain user data**                                                                           | Medium          | High       | Logger API discipline (typed structured fields only); ESLint rule blocking `row/rows/payload/data/body/content/value/record/records` identifiers in log calls; defensive redaction pass on write; user preview before bug-report submission. |
| 10  | **Bun FFI keychain bindings are greenfield** (no widely-adopted reference implementation)                               | Medium          | Medium     | Budget time in Phase 2 to develop and test the FFI wrappers per platform. Encrypted-file fallback as last resort if FFI proves blocked (with full risk disclosure).                                                                          |

## Open Questions

- **V2 error reporting strategy** — investigate before Phase 4 of V2 work. Self-hosted (Glitchtip, Highlight.io) vs carefully-configured SaaS. Specifically: do not lock into Sentry; evaluate alternatives.
- **Disk-pressure heuristic threshold** — Phase 2 work; needs empirical tuning against real user data sizes.
- **Sync poll cadence in idle state** — start with 30s active / 5min idle; tune in Phase 4 based on dogfood.

## Decisions Captured

- Electrobun shell (alpha — flagged as Risk #1).
- Web + desktop share a single Vite build of `src/`.
- Web app lives in `src/`, desktop in new `apps/desktop/`. Web is unchanged structurally.
- Six platform abstractions in `packages/shared/platform/`: `DuckDbClient`, `RdbClient`, `ServerApiClient`, `DatasetBlobStore`, `AuthProvider`, `SyncEngine`.
- `bun:sqlite` + native DuckDB + filesystem + OS keychain (Bun FFI) on desktop.
- SQLite schema is a near-mirror of Postgres for tables in `SYNCABLE_TABLES`; generated via `sqlglot`; committed to repo.
- Naming: `createRdbCrudClient` (top-level), `createSqliteCrudClient` (desktop), `createSupabaseCrudClient` (web).
- Naming: `createServerApiClient` (top-level), `createIpcServerApiClient` (desktop), `createBrowserServerApiClient` (web). RPCs and Edge Functions both route through this on desktop; V1 throws `OfflineError` when offline (no queueing).
- Naming: `DatasetBlobStore`, `DatasetBlobKey`, `parquet_blob`, `source_file_blob` — no generic "blob" in user-facing identifiers.
- Custom sync engine; no third-party sync service.
- V1 sync: outbox + LWW for relational; parquet upload-on-reconnect (opt-in via `online_storage_allowed`).
- Dataset metadata always syncs to Supabase; only parquet bytes are gated by opt-in; source files never go to Supabase Storage.
- Per-OS-user app data directory; OS-conventional paths.
- macOS first, Windows next; Linux out of scope V1 and V2.
- Auth: cached refresh token in OS keychain via Bun FFI; 30-day default offline grace.
- V1 observability: `console.error` + JSONL local logs + in-app bug report; no third-party reporter.
- Phase 2 Task 10 keeps `@duckdb/duckdb-wasm` in the desktop bundle. The audit found a single importer (`src/clients/DuckDbClient/DuckDbClient.ts`) whose module-load side effects make a Vite-level drop unsafe before Task 13 wraps duckdb-wasm behind `usePlatform().duckDb`. Phase 4 owns the bundle drop; V1 ships the desktop binary with the wasm bytes inert in the bundle.
