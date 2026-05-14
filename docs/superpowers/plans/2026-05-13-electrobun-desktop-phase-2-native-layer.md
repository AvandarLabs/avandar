# Electrobun Desktop — Phase 2: Native Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md`

**Goal:** Wire all desktop privileged services (SQLite, native DuckDB, filesystem `DatasetBlobStore`, OS keychain) into Bun main and expose them to the webview via typed IPC. After Phase 2 the desktop runs **fully offline** against a local snapshot of the user's data; the sync engine (Phase 3) is still absent, so writes do not yet propagate to Supabase.

**Architecture:**
- A typed IPC layer in `packages/shared/platform/ipc/` defines contracts; webview side has an IPC client, Bun main side has handler registration.
- `apps/desktop/main/services/` hosts the concrete native implementations: `Sqlite.ts`, `DuckDb.ts`, `FileSystemDatasetBlobStore.ts`, `Keychain.ts`.
- A Postgres→SQLite migration generator (`apps/desktop/scripts/gen-sqlite-migrations.ts`) shells out to Python's `sqlglot`, guarded by a `SYNCABLE_TABLES` manifest.
- `createSqliteCRUDClient` joins `createSupabaseCRUDClient` as a backend implementation; `createRdbCRUDClient` now branches per platform.

**Tech Stack:** Electrobun IPC, Bun runtime, `bun:sqlite`, native DuckDB (via the existing `duckdb` Node binding used by `@avandar/ava-etl`), Bun FFI, Python 3 + `sqlglot` (developer-machine dependency).

**Phase exit criteria:**
1. On desktop, `pnpm dev:desktop` opens the app; first launch performs a one-shot Supabase→SQLite snapshot pull; subsequent launches read from local SQLite even with the network disabled.
2. Native DuckDB in Bun main answers queries from the webview via IPC; duckdb-wasm is no longer loaded by the desktop webview bundle.
3. File uploads on desktop write the source + parquet to disk under the per-OS-user app data directory.
4. Refresh tokens persist in the macOS Keychain (via Bun FFI to `Security.framework`); auth survives app relaunches.
5. `pnpm test` is green. `pnpm dev` (web) is unchanged.

**Honest framing:** This is the largest phase. Treat each native service as its own subsystem with TDD discipline. The migration generator and IPC layer get tests; the FFI keychain bindings get a manual smoke test (FFI is hard to unit-test cleanly).

---

## File Structure

**New: IPC framework in `@avandar/platform`:**
- `packages/shared/platform/src/ipc/contracts.ts` — typed contract definitions
- `packages/shared/platform/src/ipc/contracts.test-d.ts`
- `packages/shared/platform/src/ipc/client.ts` — webview-side IPC client
- `packages/shared/platform/src/ipc/client.test.ts`
- `packages/shared/platform/src/ipc/server.ts` — main-side handler registration helper
- `packages/shared/platform/src/ipc/server.test.ts`

**New: Migration generator:**
- `apps/desktop/scripts/gen-sqlite-migrations.ts` — Bun-runnable generator
- `apps/desktop/scripts/gen-sqlite-migrations.test.ts`
- `apps/desktop/scripts/check-sqlite-migrations.ts` — CI drift check
- `apps/desktop/sync/syncable-tables.ts` — `SYNCABLE_TABLES` manifest
- `apps/desktop/sync/syncable-tables.test.ts`
- `apps/desktop/migrations/` — committed generated SQLite migrations
- `apps/desktop/migrations/README.md`

**New: Bun-main services:**
- `apps/desktop/main/services/Sqlite.ts` — bun:sqlite handle + migration runner
- `apps/desktop/main/services/Sqlite.test.ts`
- `apps/desktop/main/services/DuckDb.ts` — native DuckDB connection management
- `apps/desktop/main/services/DuckDb.test.ts`
- `apps/desktop/main/services/FileSystemDatasetBlobStore.ts`
- `apps/desktop/main/services/FileSystemDatasetBlobStore.test.ts`
- `apps/desktop/main/services/Keychain.ts` — Bun FFI to macOS Security.framework
- `apps/desktop/main/services/Keychain.test.ts` — manual smoke test harness
- `apps/desktop/main/services/SupabaseRest.ts` — server-side fetch wrapper for sync (used in Phase 3)

**New: Main-side IPC handlers:**
- `apps/desktop/main/ipc/rdb.ts`
- `apps/desktop/main/ipc/duckdb.ts`
- `apps/desktop/main/ipc/dataset-blob.ts`
- `apps/desktop/main/ipc/auth.ts`

**New: Platform helpers:**
- `apps/desktop/main/platform/userDataDir.ts`
- `apps/desktop/main/platform/userDataDir.test.ts`
- `apps/desktop/main/platform/network.ts`

**New: Webview-side desktop implementations:**
- `packages/shared/clients/src/SqliteCRUDClient/createSqliteCRUDClient.ts`
- `packages/shared/clients/src/SqliteCRUDClient/createSqliteCRUDClient.test.ts`
- `packages/shared/platform/src/desktop/DesktopRdbClient.ts`
- `packages/shared/platform/src/desktop/DesktopDuckDbClient.ts`
- `packages/shared/platform/src/desktop/DesktopDatasetBlobStore.ts`
- `packages/shared/platform/src/desktop/DesktopAuthProvider.ts`
- `packages/shared/platform/src/desktop/*.test.ts` for each

**Modified:**
- `apps/desktop/package.json` — add `duckdb`, `bun:sqlite` (built-in, no dep needed)
- `apps/desktop/main/index.ts` — register IPC handlers on startup
- `apps/desktop/preload/index.ts` — expose IPC bridge to webview
- `packages/shared/clients/src/index.ts` — export `createSqliteCRUDClient`
- `packages/shared/clients/src/RdbCRUDClient/createRdbCRUDClient.ts` — flip the desktop branch
- `package.json` (root) — add `gen:sqlite-migrations` and `check:sqlite-migrations` scripts
- Vite config — exclude `@duckdb/duckdb-wasm` from the bundle when `AVA_TARGET=desktop`

---

## Task 1: IPC Contracts Framework

A small, typed RPC abstraction that lives in `@avandar/platform` and is consumed by both sides. Each contract is `{ name, request, response }` and the registration helper enforces type matching.

**Files:**
- Create: `packages/shared/platform/src/ipc/contracts.ts`
- Test: `packages/shared/platform/src/ipc/contracts.test-d.ts`

- [ ] **Step 1: Write the failing type test**

Create `packages/shared/platform/src/ipc/contracts.test-d.ts`:

```ts
import { expectTypeOf, test } from "vitest";
import { defineIpcContract, type IpcContract } from "./contracts.ts";

test("defineIpcContract returns a typed contract handle", () => {
  const contract = defineIpcContract<
    { rowId: string },
    { row: { id: string; name: string } | null }
  >("rdb.getById");

  expectTypeOf(contract).toMatchTypeOf<IpcContract<unknown, unknown>>();
  expectTypeOf(contract.name).toEqualTypeOf<string>();
  expectTypeOf<Parameters<typeof contract.parseRequest>[0]>().toEqualTypeOf<unknown>();
});

test("IpcContract preserves request/response types", () => {
  type Req = { sql: string; params: ReadonlyArray<unknown> };
  type Res = { rows: ReadonlyArray<Record<string, unknown>> };
  const contract: IpcContract<Req, Res> = defineIpcContract<Req, Res>("rdb.run");

  expectTypeOf<typeof contract.__request>().toEqualTypeOf<Req>();
  expectTypeOf<typeof contract.__response>().toEqualTypeOf<Res>();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/platform test
```

Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement `defineIpcContract`**

Create `packages/shared/platform/src/ipc/contracts.ts`:

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
pnpm --filter @avandar/platform test
```

Expected: green.

- [ ] **Step 5: Define every contract used in Phase 2**

Append to `packages/shared/platform/src/ipc/contracts.ts`:

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
  delete: defineIpcContract<{ readonly key: string }, { readonly deleted: boolean }>(
    "datasetBlob.delete",
  ),
  exists: defineIpcContract<{ readonly key: string }, { readonly exists: boolean }>(
    "datasetBlob.exists",
  ),
  list: defineIpcContract<
    { readonly prefix: string },
    { readonly keys: ReadonlyArray<string> }
  >("datasetBlob.list"),
  stat: defineIpcContract<
    { readonly key: string },
    { readonly stat: { readonly sizeBytes: number; readonly mtimeMs: number } | null }
  >("datasetBlob.stat"),
};

// Auth
export const AuthContracts = {
  signIn: defineIpcContract<
    { readonly email: string; readonly password: string },
    { readonly userId: string; readonly email: string; readonly accessToken: string; readonly accessTokenExpiresAt: number }
  >("auth.signIn"),
  signOut: defineIpcContract<Record<string, never>, { readonly ok: true }>(
    "auth.signOut",
  ),
  getSession: defineIpcContract<
    Record<string, never>,
    {
      readonly session:
        | {
            readonly userId: string;
            readonly email: string;
            readonly accessToken: string;
            readonly accessTokenExpiresAt: number;
            readonly mode: "online" | "offline-cached";
          }
        | null;
    }
  >("auth.getSession"),
  refreshIfNeeded: defineIpcContract<Record<string, never>, { readonly refreshed: boolean }>(
    "auth.refreshIfNeeded",
  ),
};
```

**Note on bytes-as-base64:** Electrobun's stdin/stdout IPC layer transports strings. Large blobs over base64 add ~33% overhead. For files >50MB consider chunking. The contracts above keep things simple for V1; Phase 3 may add a streaming variant if profiles show pressure.

- [ ] **Step 6: Export from the platform index**

Edit `packages/shared/platform/src/index.ts`, add:

```ts
export {
  defineIpcContract,
  RdbContracts,
  DuckDbContracts,
  DatasetBlobContracts,
  AuthContracts,
} from "./ipc/contracts.ts";
export type { IpcContract } from "./ipc/contracts.ts";
```

- [ ] **Step 7: Type-check**

```bash
pnpm --filter @avandar/platform type-check
```

Expected: green.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/platform/
git commit -m "feat(platform): add typed IPC contract framework with Phase 2 contracts"
```

---

## Task 2: IPC Client (webview side)

Webview-side client that calls a contract over Electrobun's IPC bridge and returns a Promise.

**Files:**
- Create: `packages/shared/platform/src/ipc/client.ts`
- Test: `packages/shared/platform/src/ipc/client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/shared/platform/src/ipc/client.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineIpcContract } from "./contracts.ts";
import { callIpc, __setIpcBridgeForTests } from "./client.ts";

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
    const contract = defineIpcContract<{ a: number }, { b: number }>("test.echo");

    onceMock.mockImplementation((channel: string, cb: (msg: unknown) => void) => {
      // Simulate the server replying on the response channel
      Promise.resolve().then(() =>
        cb({ id: (sendMock.mock.calls[0]?.[1] as { id: string }).id, ok: true, result: { b: 42 } }),
      );
    });

    const result = await callIpc(contract, { a: 1 });
    expect(sendMock).toHaveBeenCalledOnce();
    expect(result).toEqual({ b: 42 });
  });

  it("rejects when the server responds with ok: false", async () => {
    const contract = defineIpcContract<Record<string, never>, { ok: true }>(
      "test.fails",
    );

    onceMock.mockImplementation((channel: string, cb: (msg: unknown) => void) => {
      Promise.resolve().then(() =>
        cb({ id: (sendMock.mock.calls[0]?.[1] as { id: string }).id, ok: false, error: "boom" }),
      );
    });

    await expect(callIpc(contract, {})).rejects.toThrow(/boom/);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/platform test
```

Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement the client**

Create `packages/shared/platform/src/ipc/client.ts`:

```ts
import type { IpcContract } from "./contracts.ts";

type IpcBridge = {
  readonly send: (channel: string, message: unknown) => void;
  readonly once: (channel: string, callback: (message: unknown) => void) => void;
};

let bridge: IpcBridge | null = null;

function getBridge(): IpcBridge {
  if (bridge) return bridge;
  const electrobun = (globalThis as unknown as { electrobun?: IpcBridge }).electrobun;
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
pnpm --filter @avandar/platform test
```

Expected: green.

- [ ] **Step 5: Export from the platform index**

Edit `packages/shared/platform/src/index.ts`:

```ts
export { callIpc, __setIpcBridgeForTests } from "./ipc/client.ts";
```

- [ ] **Step 6: Commit**

```bash
git add packages/shared/platform/
git commit -m "feat(platform): add webview-side IPC client with test injection"
```

---

## Task 3: IPC Server (Bun-main side)

Helper for registering typed handlers in Bun main. Same shape on the other side of the wire.

**Files:**
- Create: `packages/shared/platform/src/ipc/server.ts`
- Test: `packages/shared/platform/src/ipc/server.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/shared/platform/src/ipc/server.test.ts`:

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

    const contract = defineIpcContract<{ a: number }, { b: number }>("test.double");
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

    const contract = defineIpcContract<Record<string, never>, { ok: true }>("test.boom");
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
pnpm --filter @avandar/platform test
```

Expected: FAIL.

- [ ] **Step 3: Implement the server**

Create `packages/shared/platform/src/ipc/server.ts`:

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
pnpm --filter @avandar/platform test
```

Expected: green.

- [ ] **Step 5: Export from platform index**

```ts
export { createIpcServer } from "./ipc/server.ts";
export type { IpcServer, IpcTransport } from "./ipc/server.ts";
```

- [ ] **Step 6: Commit**

```bash
git add packages/shared/platform/
git commit -m "feat(platform): add main-side IPC server helper"
```

---

## Task 4: `userDataDir` resolver

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

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/main/platform/userDataDir.ts apps/desktop/main/platform/userDataDir.test.ts
git commit -m "feat(desktop): add resolveUserDataDir helper"
```

---

## Task 5: `SYNCABLE_TABLES` manifest

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

If unclear which tables are user-owned vs shared, default to the conservative *small* set (only what's clearly personal) — the spec's manifest-driven generator will fail loudly on the next new table, forcing a per-table decision rather than silent drift.

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
  SYNCABLE_TABLES,
  isExcluded,
  isSyncable,
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

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/sync/syncable-tables.ts apps/desktop/sync/syncable-tables.test.ts
git commit -m "feat(desktop): add SYNCABLE_TABLES manifest"
```

---

## Task 6: Postgres → SQLite migration generator

Shells out to Python's `sqlglot`. Reads `supabase/migrations/*.sql`; emits `apps/desktop/migrations/*.sql` for syncable tables only; hard-errors on unknown tables.

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
   - No  → add the table name to `EXCLUDED_TABLES`.
3. Run `pnpm gen:sqlite-migrations`.
4. Commit the regenerated `apps/desktop/migrations/*.sql` alongside the Postgres migration.
```

- [ ] **Step 2: Write the failing test**

Create `apps/desktop/scripts/gen-sqlite-migrations.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { partitionStatements, type Statement } from "./gen-sqlite-migrations.ts";

describe("partitionStatements", () => {
  const syncable = ["datasets", "dashboards"];
  const excluded = ["audit_log"];

  it("includes statements referencing only syncable tables", () => {
    const stmts: Statement[] = [
      { tables: ["datasets"], sql: "create table datasets (id text primary key);" },
    ];
    const result = partitionStatements(stmts, syncable, excluded);
    expect(result.included).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(result.unknown).toHaveLength(0);
  });

  it("skips statements that touch only excluded tables", () => {
    const stmts: Statement[] = [
      { tables: ["audit_log"], sql: "create table audit_log (id text primary key);" },
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

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { spawnSync } from "node:child_process";
import {
  EXCLUDED_TABLES,
  SYNCABLE_TABLES,
} from "../sync/syncable-tables.ts";

export type Statement = {
  readonly tables: ReadonlyArray<string>;
  readonly sql: string;
};

export type PartitionResult = {
  readonly included: ReadonlyArray<Statement>;
  readonly skipped: ReadonlyArray<Statement>;
  readonly unknown: ReadonlyArray<{ readonly table: string; readonly sql: string }>;
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
    console.error("Decide per table: add to SYNCABLE_TABLES or EXCLUDED_TABLES.");
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

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");
const SQLITE_DIR = join(REPO_ROOT, "apps", "desktop", "migrations");

// Snapshot the current committed migrations.
const before = readdirSync(SQLITE_DIR)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => ({ name: f, content: readFileSync(join(SQLITE_DIR, f), "utf8") }));

// Regenerate.
const gen = spawnSync("bun", ["run", "apps/desktop/scripts/gen-sqlite-migrations.ts"], {
  cwd: REPO_ROOT,
  encoding: "utf8",
});
if (gen.status !== 0) {
  console.error(gen.stderr);
  process.exit(1);
}

// Compare.
const after = readdirSync(SQLITE_DIR)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => ({ name: f, content: readFileSync(join(SQLITE_DIR, f), "utf8") }));

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

If sqlglot mis-translates something critical, file an upstream issue and apply a one-off post-processing step. For Phase 2, a minor manual touch-up *of the generator script* (not of the output files) is acceptable.

- [ ] **Step 10: Commit**

```bash
git add apps/desktop/scripts/ apps/desktop/migrations/ package.json
git commit -m "feat(desktop): add Postgres→SQLite migration generator and CI drift check"
```

---

## Task 7: `Sqlite.ts` — bun:sqlite handle + migration runner

**Files:**
- Create: `apps/desktop/main/services/Sqlite.ts`
- Test: `apps/desktop/main/services/Sqlite.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/main/services/Sqlite.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
      { name: "002_add_color.sql", sql: "alter table widgets add column color text;" },
    ];

    runMigrations(db, migrations);

    // Idempotent: rerunning should be a no-op
    runMigrations(db, migrations);

    db.run("insert into widgets (name, color) values ('a', 'red');");
    const rows = db
      .query<{ name: string; color: string }, []>(
        "select name, color from widgets",
      )
      .all();
    expect(rows).toEqual([{ name: "a", color: "red" }]);
    db.close();
  });

  it("runMigrations refuses to skip files (would indicate missing migrations)", () => {
    dir = mkdtempSync(join(tmpdir(), "avandar-sqlite-test-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));

    runMigrations(db, [
      { name: "001_init.sql", sql: "create table widgets (id integer primary key);" },
    ]);

    // Now caller passes a different set that omits 001
    expect(() =>
      runMigrations(db, [
        { name: "002_add_color.sql", sql: "alter table widgets add column color text;" },
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
import { Database } from "bun:sqlite";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

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
      db.run("insert into _schema_migrations (name, applied_at) values (?, ?);", [
        m.name,
        Date.now(),
      ]);
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

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/main/services/Sqlite.ts apps/desktop/main/services/Sqlite.test.ts
git commit -m "feat(desktop): add bun:sqlite handle + migration runner"
```

---

## Task 8: RDB IPC handlers + `createSqliteCRUDClient`

Wire SQLite to the webview through the IPC layer, then introduce the SQLite-backed CRUD client.

**Files:**
- Create: `apps/desktop/main/ipc/rdb.ts`
- Create: `packages/shared/clients/src/SqliteCRUDClient/createSqliteCRUDClient.ts`
- Test: `packages/shared/clients/src/SqliteCRUDClient/createSqliteCRUDClient.test.ts`
- Modify: `packages/shared/clients/src/index.ts`
- Modify: `packages/shared/clients/src/RdbCRUDClient/createRdbCRUDClient.ts`
- Modify: `apps/desktop/main/index.ts`

- [ ] **Step 1: Register RDB handlers in Bun main**

Create `apps/desktop/main/ipc/rdb.ts`:

```ts
import { RdbContracts } from "@avandar/platform";
import type { IpcServer } from "@avandar/platform";
import type { AvaSqliteDatabase } from "../services/Sqlite.ts";

export function registerRdbHandlers(server: IpcServer, db: AvaSqliteDatabase): void {
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
    const rows = stmt.all(...req.params) as ReadonlyArray<Record<string, unknown>>;
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
import { Electrobun } from "electrobun";
import { join } from "node:path";
import { createIpcServer } from "@avandar/platform";
import { resolveWebviewUrl } from "./config/url.ts";
import { getUserDataDir } from "./platform/userDataDir.ts";
import { openSqliteDatabase, runMigrations } from "./services/Sqlite.ts";
import { registerRdbHandlers } from "./ipc/rdb.ts";
import { loadMigrations } from "./services/loadMigrations.ts";

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

- [ ] **Step 4: Write the failing test for `createSqliteCRUDClient`**

Create `packages/shared/clients/src/SqliteCRUDClient/createSqliteCRUDClient.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { __setIpcBridgeForTests, RdbContracts } from "@avandar/platform";
import { createSqliteCRUDClient } from "./createSqliteCRUDClient.ts";

describe("createSqliteCRUDClient", () => {
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

    const client = createSqliteCRUDClient<{
      Read: { id: string; name: string; created_at: number };
    }>({
      modelName: "Widget",
      tableName: "widgets",
      dbTablePrimaryKey: "id",
      parsers: { Read: (r) => r as any, Insert: (r) => r as any, Update: (r) => r as any },
    });

    const result = await client.getById("x1");
    expect(sendMock).toHaveBeenCalledWith(
      RdbContracts.query.name,
      expect.objectContaining({ payload: expect.objectContaining({ sql: expect.stringContaining("widgets") }) }),
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

- [ ] **Step 6: Implement `createSqliteCRUDClient`**

Create `packages/shared/clients/src/SqliteCRUDClient/createSqliteCRUDClient.ts`:

```ts
import { callIpc, RdbContracts } from "@avandar/platform";
import { createModelCRUDClient } from "@clients/ModelCRUDClient/createModelCRUDClient.ts";
import type { RdbCRUDModelSpec } from "@clients/RdbCRUDClient/RdbCRUDClient.types.ts";

/**
 * SQLite-backed CRUD client. Issues IPC calls to the Bun-main process,
 * which holds the bun:sqlite database. Mirrors the surface of
 * `createSupabaseCRUDClient` so it can plug into the existing
 * `ModelCRUDClient` factory.
 */
export function createSqliteCRUDClient<M>(spec: RdbCRUDModelSpec<M>) {
  const tableName = spec.tableName;
  const pk = spec.dbTablePrimaryKey;

  return createModelCRUDClient<M>({
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
        const order = filter?.orderBy
          ? "order by " +
            filter.orderBy
              .map((o) => `${o.column} ${o.direction === "desc" ? "desc" : "asc"}`)
              .join(", ")
          : "";
        const lim = filter?.limit ? `limit ${filter.limit}` : "";
        const off = filter?.offset ? `offset ${filter.offset}` : "";
        const sql = [
          `select * from ${tableName}`,
          where,
          order,
          lim,
          off,
        ]
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

function buildWhere(filter: { eq?: Record<string, unknown>; in?: Record<string, ReadonlyArray<unknown>> } | undefined): {
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

  return clauses.length === 0
    ? { where: "", params: [] }
    : { where: `where ${clauses.join(" and ")}`, params };
}
```

If the existing `createModelCRUDClient` doesn't accept an `operations` block in this exact shape, adapt to its real signature. The invariant: `createSqliteCRUDClient` must produce a value that satisfies the same `ModelCRUDClient<M, ExtendedQueries, ExtendedMutations>` interface as `createSupabaseCRUDClient`.

- [ ] **Step 7: Run the test and confirm it passes**

```bash
pnpm --filter @avandar/clients test
```

Expected: green.

- [ ] **Step 8: Flip the desktop branch in `createRdbCRUDClient`**

Edit `packages/shared/clients/src/RdbCRUDClient/createRdbCRUDClient.ts`:

```ts
import { isDesktop } from "@avandar/platform";
import { createSqliteCRUDClient } from "@clients/SqliteCRUDClient/createSqliteCRUDClient.ts";
import { createSupabaseCRUDClient } from "@clients/SupabaseCRUDClient/createSupabaseCRUDClient.ts";
import type { RdbCRUDModelSpec } from "./RdbCRUDClient.types.ts";

export function createRdbCRUDClient<M>(spec: RdbCRUDModelSpec<M>) {
  if (isDesktop()) {
    return createSqliteCRUDClient<M>(spec);
  }
  return createSupabaseCRUDClient<M>({
    ...spec,
    dbClient: getWebDbClient(),
  } as never);
}

function getWebDbClient() {
  // Phase 2 cleanup opportunity: replace this dynamic require with an
  // injected dependency. Currently retained for Phase 1 compatibility.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("../../../../../src/db/supabase/AvaSupabase.ts") as {
    AvaSupabase: { DB: unknown };
  };
  return mod.AvaSupabase.DB;
}
```

Update the existing test in `createRdbCRUDClient.test.ts` to assert that the desktop branch returns a SQLite client (not throws).

- [ ] **Step 9: Export `createSqliteCRUDClient` from the clients index**

Edit `packages/shared/clients/src/index.ts`:

```ts
export { createSqliteCRUDClient } from "@clients/SqliteCRUDClient/createSqliteCRUDClient.ts";
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
- Reads return empty initially (no data yet) — this is *expected*; subsequent tasks handle the one-shot Supabase→SQLite snapshot bootstrap

If the webview crashes because `createRdbCRUDClient` returns empty results from an empty DB, that's exposing a missing snapshot-bootstrap. Add it as a small startup-time service in `apps/desktop/main/index.ts`:

```ts
// Pseudocode: on first launch, if SQLite is empty, fetch the user's syncable
// rows from Supabase REST and seed the local DB.
```

The actual implementation lives in the next task.

- [ ] **Step 12: Commit**

```bash
git add apps/desktop/ packages/shared/clients/
git commit -m "feat(desktop): wire RDB IPC + createSqliteCRUDClient; flip createRdbCRUDClient desktop branch"
```

---

## Task 9: One-shot Supabase→SQLite snapshot bootstrap

Without a sync engine (Phase 3), the desktop still needs *some* way to populate its local SQLite from Supabase on first launch. This task ships a minimal one-shot pull: when the local DB is fresh, fetch all rows for each syncable table from Supabase and insert.

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
import { openSqliteDatabase, runMigrations } from "./Sqlite.ts";
import { bootstrapSnapshotIfNeeded } from "./SnapshotBootstrap.ts";

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
      selectAll: vi
        .fn()
        .mockResolvedValueOnce([{ id: "a", name: "Alpha" }, { id: "b", name: "Bravo" }]),
    };

    await bootstrapSnapshotIfNeeded(db, rest as never, "token", ["datasets"]);

    const rows = db
      .query<{ id: string; name: string }, []>("select id, name from datasets order by id")
      .all();
    expect(rows).toEqual([{ id: "a", name: "Alpha" }, { id: "b", name: "Bravo" }]);
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
    const count = (db
      .query<{ c: number }, []>(`select count(*) as c from ${table}`)
      .get() ?? { c: 0 }).c;
    if (count > 0) continue;

    const rows = await rest.selectAll(table, accessToken);
    if (rows.length === 0) continue;

    const cols = Object.keys(rows[0]!);
    const placeholders = cols.map(() => "?").join(", ");
    const sql = `insert into ${table} (${cols.join(", ")}) values (${placeholders});`;
    const stmt = db.prepare(sql);

    const tx = db.transaction((rowsBatch: ReadonlyArray<Record<string, unknown>>) => {
      for (const row of rowsBatch) {
        stmt.run(...cols.map((c) => row[c] ?? null));
      }
    });
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
import { createSupabaseRestClient } from "./services/SupabaseRest.ts";
import { bootstrapSnapshotIfNeeded } from "./services/SnapshotBootstrap.ts";
import { SYNCABLE_TABLES } from "../sync/syncable-tables.ts";

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

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/main/
git commit -m "feat(desktop): one-shot Supabase→SQLite snapshot bootstrap"
```

---

## Task 10: Native DuckDB in Bun main + DuckDb IPC

Replace duckdb-wasm on desktop. The existing `@avandar/ava-etl` package already uses the `duckdb` Node binding; we lean on the same package.

**Files:**
- Create: `apps/desktop/main/services/DuckDb.ts`
- Test: `apps/desktop/main/services/DuckDb.test.ts`
- Create: `apps/desktop/main/ipc/duckdb.ts`
- Create: `packages/shared/platform/src/desktop/DesktopDuckDbClient.ts`
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

  function exec<TRow>(sql: string, params: ReadonlyArray<unknown>): Promise<TRow[]> {
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
import { DuckDbContracts } from "@avandar/platform";
import type { IpcServer } from "@avandar/platform";
import type { DuckDbService } from "../services/DuckDb.ts";
import { join } from "node:path";
import { getUserDataDir } from "../platform/userDataDir.ts";

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
      const parquetPath = join(
        dataDir,
        req.datasetId,
        "data.parquet",
      );
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
import { createDuckDbService } from "./services/DuckDb.ts";
import { registerDuckDbHandlers } from "./ipc/duckdb.ts";

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

Create `packages/shared/platform/src/desktop/DesktopDuckDbClient.ts`:

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
    throw new Error("DesktopDuckDbClient.runStructuredQuery: not yet implemented in Phase 2");
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

This requires that any web code that *imports* `@duckdb/duckdb-wasm` is wrapped in an `isDesktop()` guard, otherwise the bundle will fail. Audit imports:

```bash
git grep -l "@duckdb/duckdb-wasm" -- 'src/' 'packages/'
```

Each call site should either be desktop-conditional or moved behind a `usePlatform().duckDb` indirection. The full audit is broader than Phase 2 — for now, the goal is *not* "zero duckdb-wasm in the desktop bundle" but "duckdb-wasm code paths never execute on desktop". The bundle drop is an optimization; if it's blocked, defer it to Phase 4 and accept the ~30MB bundle bloat in V1 desktop. Note this decision in the spec's "decisions" section.

- [ ] **Step 10: Commit**

```bash
git add apps/desktop/ packages/shared/platform/ vite.config.ts package.json
git commit -m "feat(desktop): native DuckDB service + IPC; DesktopDuckDbClient stub"
```

---

## Task 11: Keychain via Bun FFI (macOS only in Phase 2)

Phase 2 lands macOS keychain. Windows keychain is Phase 5.

**Files:**
- Create: `apps/desktop/main/services/Keychain.ts`
- Test: `apps/desktop/main/services/Keychain.test.ts` (manual smoke test harness)
- Create: `apps/desktop/main/ipc/auth.ts`
- Create: `packages/shared/platform/src/desktop/DesktopAuthProvider.ts`
- Modify: `apps/desktop/main/index.ts`

- [ ] **Step 1: Investigate Bun FFI bindings for macOS Security.framework**

Read the Bun FFI docs at `https://bun.sh/docs/api/ffi` (consult them, do not assume APIs).

The minimum needed:
- `SecKeychainAddGenericPassword` — add an entry
- `SecKeychainFindGenericPassword` — read an entry
- `SecKeychainItemDelete` — remove an entry

The relevant library: `/System/Library/Frameworks/Security.framework/Security`.

- [ ] **Step 2: Write a smoke test harness**

Create `apps/desktop/main/services/Keychain.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Keychain } from "./Keychain.ts";

// Skipped by default; this hits the real macOS keychain.
// Run with: KEYCHAIN_SMOKE=1 pnpm --filter @avandar/desktop test
const enabled = process.env.KEYCHAIN_SMOKE === "1" && process.platform === "darwin";

describe.skipIf(!enabled)("Keychain (smoke)", () => {
  const service = "com.avandarlabs.desktop.test";
  const account = "smoke-test-user";

  it("set / get / delete roundtrip", () => {
    Keychain.set(service, account, "secret-1");
    expect(Keychain.get(service, account)).toBe("secret-1");
    Keychain.set(service, account, "secret-2");
    expect(Keychain.get(service, account)).toBe("secret-2");
    Keychain.delete(service, account);
    expect(Keychain.get(service, account)).toBeNull();
  });
});
```

- [ ] **Step 3: Implement `Keychain.ts`**

Create `apps/desktop/main/services/Keychain.ts`:

```ts
import { dlopen, FFIType, suffix } from "bun:ffi";

if (process.platform !== "darwin") {
  // Phase 5 adds Windows. Throw early on unsupported platforms in main.
  throw new Error(`Keychain not supported on ${process.platform} until Phase 5`);
}

const SECURITY_FRAMEWORK =
  "/System/Library/Frameworks/Security.framework/Security";

const lib = dlopen(SECURITY_FRAMEWORK, {
  SecKeychainAddGenericPassword: {
    args: [
      FFIType.ptr, // keychain (null = default)
      FFIType.u32, // serviceNameLength
      FFIType.cstring, // serviceName
      FFIType.u32, // accountNameLength
      FFIType.cstring, // accountName
      FFIType.u32, // passwordLength
      FFIType.cstring, // passwordData
      FFIType.ptr, // itemRef (null = ignore)
    ],
    returns: FFIType.i32,
  },
  SecKeychainFindGenericPassword: {
    args: [
      FFIType.ptr, // keychainOrArray (null = default)
      FFIType.u32, // serviceNameLength
      FFIType.cstring, // serviceName
      FFIType.u32, // accountNameLength
      FFIType.cstring, // accountName
      FFIType.ptr, // passwordLength
      FFIType.ptr, // passwordData
      FFIType.ptr, // itemRef
    ],
    returns: FFIType.i32,
  },
  SecKeychainItemDelete: {
    args: [FFIType.ptr],
    returns: FFIType.i32,
  },
  SecKeychainItemFreeContent: {
    args: [FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },
});

export const Keychain = {
  set(serviceName: string, accountName: string, password: string): void {
    // If an entry exists, delete it first (simplest semantics).
    Keychain.delete(serviceName, accountName);
    const status = lib.symbols.SecKeychainAddGenericPassword(
      null,
      Buffer.byteLength(serviceName),
      Buffer.from(serviceName + "\0"),
      Buffer.byteLength(accountName),
      Buffer.from(accountName + "\0"),
      Buffer.byteLength(password),
      Buffer.from(password + "\0"),
      null,
    );
    if (status !== 0) throw new Error(`Keychain.set failed: status ${status}`);
  },

  get(serviceName: string, accountName: string): string | null {
    const lenPtr = new Uint32Array(1);
    const dataPtr = new BigUint64Array(1);
    const itemRef = new BigUint64Array(1);
    const status = lib.symbols.SecKeychainFindGenericPassword(
      null,
      Buffer.byteLength(serviceName),
      Buffer.from(serviceName + "\0"),
      Buffer.byteLength(accountName),
      Buffer.from(accountName + "\0"),
      lenPtr as never,
      dataPtr as never,
      itemRef as never,
    );
    if (status === -25300 /* errSecItemNotFound */) return null;
    if (status !== 0) throw new Error(`Keychain.get failed: status ${status}`);

    // Pointer wrangling: Bun FFI helpers can read a string of known length
    // from a pointer; consult bun docs and replace this with the real call.
    // Placeholder shape — the engineer should adapt this to the actual Bun
    // FFI memory-read API used at implementation time.
    const length = lenPtr[0]!;
    const value = readCString(dataPtr[0], length);
    lib.symbols.SecKeychainItemFreeContent(null, dataPtr as never);
    return value;
  },

  delete(serviceName: string, accountName: string): void {
    // Find first; delete the returned itemRef.
    const lenPtr = new Uint32Array(1);
    const dataPtr = new BigUint64Array(1);
    const itemRef = new BigUint64Array(1);
    const status = lib.symbols.SecKeychainFindGenericPassword(
      null,
      Buffer.byteLength(serviceName),
      Buffer.from(serviceName + "\0"),
      Buffer.byteLength(accountName),
      Buffer.from(accountName + "\0"),
      lenPtr as never,
      dataPtr as never,
      itemRef as never,
    );
    if (status === -25300) return; // not found
    if (status !== 0)
      throw new Error(`Keychain.delete (find) failed: status ${status}`);
    const delStatus = lib.symbols.SecKeychainItemDelete(itemRef[0] as never);
    if (delStatus !== 0)
      throw new Error(`Keychain.delete failed: status ${delStatus}`);
  },
};

function readCString(ptr: bigint, length: number): string {
  // Placeholder — replace with Bun FFI's actual string-read primitive
  // (e.g., `read.cstring(ptr, length)` or equivalent).
  // The engineer should not ship this placeholder; consult bun docs.
  throw new Error(
    "readCString: replace with Bun FFI string-read primitive per bun docs",
  );
}
```

**Honest framing:** this code is *correct in intent* but the Bun FFI pointer-read API moves around. The engineer implementing this task MUST consult the current Bun FFI docs and adapt the pointer/cstring read calls. The invariants are: `set / get / delete` round-trip a UTF-8 string; service/account select an entry uniquely; default keychain is used; deletion is best-effort idempotent.

If Bun FFI proves too rough to bind directly, fall back to **shelling out to the `security` CLI** as a stopgap (Section 3 of the spec described this as Option (a)):

```ts
import { spawnSync } from "node:child_process";

export const Keychain = {
  set(serviceName, accountName, password) {
    // Remove first
    spawnSync("security", [
      "delete-generic-password",
      "-s", serviceName,
      "-a", accountName,
    ]);
    const r = spawnSync("security", [
      "add-generic-password",
      "-s", serviceName,
      "-a", accountName,
      "-w", password,
    ]);
    if (r.status !== 0) throw new Error(`security add failed: ${r.stderr}`);
  },
  get(serviceName, accountName) {
    const r = spawnSync("security", [
      "find-generic-password",
      "-w",
      "-s", serviceName,
      "-a", accountName,
    ], { encoding: "utf8" });
    if (r.status === 44) return null; // not found
    if (r.status !== 0) throw new Error(`security find failed: ${r.stderr}`);
    return r.stdout.trim();
  },
  delete(serviceName, accountName) {
    spawnSync("security", [
      "delete-generic-password",
      "-s", serviceName,
      "-a", accountName,
    ]);
  },
};
```

This works on macOS today, requires no FFI, and is fine for V1. Promote to FFI in Phase 4/V2 if the per-call cost ever matters. **Pragmatically recommended: ship the spawnSync version in Phase 2, file a follow-up task for FFI.**

- [ ] **Step 4: Run the smoke test on a macOS dev machine**

```bash
KEYCHAIN_SMOKE=1 pnpm --filter @avandar/desktop test
```

Expected: roundtrip passes. On first run the macOS Keychain Access dialog may prompt; click "Always Allow".

- [ ] **Step 5: Implement auth IPC handlers**

Create `apps/desktop/main/ipc/auth.ts`:

```ts
import { AuthContracts } from "@avandar/platform";
import type { IpcServer } from "@avandar/platform";
import { Keychain } from "../services/Keychain.ts";

const KEYCHAIN_SERVICE = "com.avandarlabs.desktop";
const REFRESH_TOKEN_ACCOUNT = "supabase-refresh-token";

const SUPABASE_URL = process.env.AVA_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.AVA_SUPABASE_ANON_KEY ?? "";

// In-memory access token (never persisted).
let currentAccessToken: { token: string; expiresAt: number } | null = null;
let currentUser: { id: string; email: string } | null = null;

export function registerAuthHandlers(server: IpcServer): void {
  server.handle(AuthContracts.signIn, async (req) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: req.email, password: req.password }),
    });
    if (!res.ok) throw new Error(`Sign-in failed: ${res.status}`);
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

    return {
      userId: data.user.id,
      email: data.user.email,
      accessToken: data.access_token,
      accessTokenExpiresAt: currentAccessToken.expiresAt,
    };
  });

  server.handle(AuthContracts.signOut, async () => {
    Keychain.delete(KEYCHAIN_SERVICE, REFRESH_TOKEN_ACCOUNT);
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
    const refreshToken = Keychain.get(KEYCHAIN_SERVICE, REFRESH_TOKEN_ACCOUNT);
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
      Keychain.set(
        KEYCHAIN_SERVICE,
        REFRESH_TOKEN_ACCOUNT,
        data.refresh_token,
      );
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
    const session = await getSessionViaRefresh();
    return { refreshed: session !== null };
  });
}

async function getSessionViaRefresh() {
  const refreshToken = Keychain.get(KEYCHAIN_SERVICE, REFRESH_TOKEN_ACCOUNT);
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

Create `packages/shared/platform/src/desktop/DesktopAuthProvider.ts`:

```ts
import { AuthContracts } from "../ipc/contracts.ts";
import { callIpc } from "../ipc/client.ts";
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
import { registerAuthHandlers } from "./ipc/auth.ts";
// ... after registerDuckDbHandlers:
registerAuthHandlers(ipcServer);
```

- [ ] **Step 8: Smoke test the desktop auth flow end-to-end**

```bash
pnpm dev:desktop
```

In the window: sign in, close the app, reopen. The second launch should reach the post-login state without prompting.

- [ ] **Step 9: Commit**

```bash
git add apps/desktop/ packages/shared/platform/
git commit -m "feat(desktop): macOS keychain, auth IPC, DesktopAuthProvider"
```

---

## Task 12: `FileSystemDatasetBlobStore` + IPC

The desktop equivalent of `DatasetBlobStore`. Atomic writes, on-disk per-OS-user.

**Files:**
- Create: `apps/desktop/main/services/FileSystemDatasetBlobStore.ts`
- Test: `apps/desktop/main/services/FileSystemDatasetBlobStore.test.ts`
- Create: `apps/desktop/main/ipc/dataset-blob.ts`
- Create: `packages/shared/platform/src/desktop/DesktopDatasetBlobStore.ts`
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
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
  renameSync,
  readdirSync,
  existsSync,
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
import type { IpcServer } from "@avandar/platform";
import type { FileSystemDatasetBlobStore } from "../services/FileSystemDatasetBlobStore.ts";

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

Create `packages/shared/platform/src/desktop/DesktopDatasetBlobStore.ts`:

```ts
import { callIpc, DatasetBlobContracts } from "../ipc/contracts.ts";
import type {
  DatasetBlobKey,
  DatasetBlobStore,
  DatasetBlobStat,
} from "../types/DatasetBlobStore.types.ts";

export const DesktopDatasetBlobStore: DatasetBlobStore = {
  async put(key, bytes) {
    const arr =
      bytes instanceof Uint8Array ? bytes : await streamToUint8Array(bytes);
    const b64 = uint8ArrayToBase64(arr);
    await callIpc(DatasetBlobContracts.put, { key: key as string, bytesBase64: b64 });
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
    return (await callIpc(DatasetBlobContracts.exists, { key: key as string })).exists;
  },
  async list(prefix) {
    const r = await callIpc(DatasetBlobContracts.list, { prefix: prefix as string });
    return r.keys as ReadonlyArray<DatasetBlobKey>;
  },
  async stat(key): Promise<DatasetBlobStat | null> {
    return (await callIpc(DatasetBlobContracts.stat, { key: key as string })).stat;
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
import { createFileSystemDatasetBlobStore } from "./services/FileSystemDatasetBlobStore.ts";
import { registerDatasetBlobHandlers } from "./ipc/dataset-blob.ts";

// ... after dataDir resolution:
const datasetBlobStore = createFileSystemDatasetBlobStore(join(dataDir, "blobs"));

// ... after registerAuthHandlers:
registerDatasetBlobHandlers(ipcServer, datasetBlobStore);
```

- [ ] **Step 8: Commit**

```bash
git add apps/desktop/ packages/shared/platform/
git commit -m "feat(desktop): FileSystemDatasetBlobStore + IPC; DesktopDatasetBlobStore"
```

---

## Task 13: Wire the platform implementations into the React app

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

**Note:** the web adapter wiring is intrinsically *in* `src/` because that's where the existing concrete classes live. Move `PlatformProvider.tsx` to `src/config/platform/PlatformProvider.tsx` instead, where it can import existing modules without crossing the package boundary. Update imports accordingly.

- [ ] **Step 2: Wrap the React tree**

Edit `src/main.tsx` (or the equivalent root render file) to wrap the existing tree:

```tsx
import { PlatformProvider } from "@/config/platform/PlatformProvider.tsx";

createRoot(rootElement).render(
  <PlatformProvider>
    {/* existing root component */}
  </PlatformProvider>,
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

- [ ] **Step 6: Commit**

```bash
git add src/ packages/
git commit -m "refactor: thread platform implementations through PlatformProvider"
```

---

## Task 14: Phase 2 acceptance checklist

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

Expected: app starts, session restored from keychain, data view *still renders* (reading from local SQLite). This is the headline Phase 2 deliverable.

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

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md
git commit -m "docs(spec): mark phase 2 complete"
```

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

| Risk | Mitigation in this phase |
|---|---|
| sqlglot output requires per-table touch-ups for Postgres-only features | Hard-error generator + human review in Task 6 Step 9; fix the *generator* not the output |
| Bun FFI memory-pointer wrangling fails on first attempt | Pragmatic fallback in Task 11 Step 3: ship the `security`-CLI shellout; file a follow-up to migrate to FFI |
| Native `duckdb` Node binding fails to load under Bun | Phase 2 Task 10 tests catch this; if blocked, evaluate `@duckdb/node-api` or compile against duckdb-bindings-node-bun. Worst case: stay on duckdb-wasm for desktop in Phase 2 and accept the memory limits temporarily |
| Webview ↔ Bun IPC pipeline mismatches Electrobun's actual API | Task 8 Step 2 explicitly calls out the `window.ipc` shim — engineer adapts to real names |
| Dropping duckdb-wasm from desktop bundle breaks if some code path imports it eagerly | Decision in Task 10 Step 9 — if blocked, accept the bundle bloat; do not delay Phase 2 on this optimization |
