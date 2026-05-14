# Electrobun Desktop — Phase 3: V1 SyncEngine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` (sections "RdbClient & Local Relational Store" and "SyncEngine (V1)")

**Goal:** Wire a complete V1 sync engine: every SQLite write enqueues an outbox row in the same transaction; a push loop drains the outbox to Supabase; a pull loop fetches deltas back; LWW resolves conflicts. Parquet files marked `online_storage_allowed` upload on reconnect via resumable TUS. UI shows sync status.

**Architecture:**
- Per-row sync columns (`_local_updated_at`, `_server_updated_at`, `_sync_state`, `_deleted_at`) are added to every syncable SQLite table via a migration.
- Three new sync tables: `sync_outbox` (relational mutations queued for push), `parquet_blob_outbox` (queued blob uploads), `sync_cursor` (per-table pull cursor).
- `createSqliteCRUDClient` wraps every write so the data write + outbox row are in **one** SQLite transaction. Non-negotiable invariant for crash safety.
- `SyncEngine` runs as a worker in Bun main, draining queues and pulling deltas on a timer when online.
- `DesktopSyncEngine` (webview side) exposes status to React via the existing `usePlatform()` and a small status indicator component.

**Tech Stack:** bun:sqlite, Bun's `fetch`, TUS protocol for resumable uploads (port the existing `DatasetParquetStorageClient` TUS logic from web to Bun), `node:net` for network online detection.

**Phase exit criteria:**
1. Mutating a row on desktop while offline → enqueues to `sync_outbox`; on reconnect, observed on Supabase.
2. Updating the same row on Supabase (web) → observed on desktop within ~30s when online.
3. Concurrent edits resolved by LWW (the later `_local_updated_at`/`updated_at` wins) and `_sync_state` is `clean` afterward.
4. Uploading a parquet with `online_storage_allowed = true` while offline → present in Supabase Storage after reconnect (verifiable by querying the storage bucket).
5. UI shows a sync indicator with status (idle/syncing/offline/error), pending count.
6. Acceptance: `pnpm test` green; manual offline→online round-trip works.

**Honest framing:** This is the hardest correctness work in the project. Test relentlessly. The transaction-atomicity invariant is the single thing that can quietly drop user data — protect it with both integration tests and a runtime invariant check.

---

## File Structure

**New: SQLite migration adding sync columns + sync tables**
- `apps/desktop/migrations/9999_phase3_sync_schema.sql` — appended *after* generated migrations (filename chosen to sort last; rename when integrating with the generator's numbering)
- `apps/desktop/sync/sync-schema.test.ts` — verifies sync columns exist on every `SYNCABLE_TABLES` entry

**New: Sync types**
- `apps/desktop/main/services/sync/types.ts` — `OutboxRow`, `ParquetOutboxRow`, `SyncCursorRow`

**New: Outbox-aware write helper**
- `packages/shared/clients/src/SqliteCRUDClient/withOutbox.ts` — wraps a write in a transaction that also inserts to `sync_outbox`
- `packages/shared/clients/src/SqliteCRUDClient/withOutbox.test.ts`
- Modify: `packages/shared/clients/src/SqliteCRUDClient/createSqliteCRUDClient.ts` — use `withOutbox`

**New: Sync engine in Bun main**
- `apps/desktop/main/services/sync/SyncEngine.ts` — orchestrator
- `apps/desktop/main/services/sync/SyncEngine.test.ts`
- `apps/desktop/main/services/sync/PushLoop.ts` — relational push
- `apps/desktop/main/services/sync/PushLoop.test.ts`
- `apps/desktop/main/services/sync/PullLoop.ts` — relational pull
- `apps/desktop/main/services/sync/PullLoop.test.ts`
- `apps/desktop/main/services/sync/ParquetUploadLoop.ts` — TUS uploads
- `apps/desktop/main/services/sync/ParquetUploadLoop.test.ts`
- `apps/desktop/main/services/sync/Lww.ts` — pure conflict resolution
- `apps/desktop/main/services/sync/Lww.test.ts`
- `apps/desktop/main/services/sync/NetworkProbe.ts` — online detection
- `apps/desktop/main/platform/network.ts` — OS network change events

**New: Sync IPC**
- `packages/shared/platform/src/ipc/contracts.ts` — add `SyncContracts` block
- `apps/desktop/main/ipc/sync.ts` — register handlers

**New: Desktop sync provider**
- `packages/shared/platform/src/desktop/DesktopSyncEngine.ts`

**New: UI**
- `packages/web/components/src/SyncStatusIndicator/SyncStatusIndicator.tsx` (or matching location in the codebase)
- `packages/web/components/src/SyncStatusIndicator/SyncStatusIndicator.test.tsx`

**Modified:**
- `apps/desktop/main/index.ts` — start the sync engine after services initialize
- Root layout (`src/routes/__root.tsx` or equivalent) — mount the `SyncStatusIndicator`

---

## Task 1: Sync schema migration

Add per-row sync columns to every `SYNCABLE_TABLES` table, plus the three sync engine tables.

**Files:**
- Create: `apps/desktop/migrations/9999_phase3_sync_schema.sql`
- Test: `apps/desktop/sync/sync-schema.test.ts`

- [ ] **Step 1: Generate the migration content from the manifest**

The migration is generated mechanically from `SYNCABLE_TABLES`. Write it as static SQL since it'll be applied once; alternatively make it a generator script. For Phase 3, hand-write it from the current manifest.

Create `apps/desktop/migrations/9999_phase3_sync_schema.sql`. Substitute the real `SYNCABLE_TABLES` list:

```sql
-- generated for Phase 3 sync engine
-- DO NOT EDIT unless updating SYNCABLE_TABLES; regenerate then

-- Per-row sync columns
alter table datasets             add column _local_updated_at integer not null default 0;
alter table datasets             add column _server_updated_at integer;
alter table datasets             add column _sync_state text not null default 'clean';
alter table datasets             add column _deleted_at integer;

alter table dataset_versions     add column _local_updated_at integer not null default 0;
alter table dataset_versions     add column _server_updated_at integer;
alter table dataset_versions     add column _sync_state text not null default 'clean';
alter table dataset_versions     add column _deleted_at integer;

alter table dashboards           add column _local_updated_at integer not null default 0;
alter table dashboards           add column _server_updated_at integer;
alter table dashboards           add column _sync_state text not null default 'clean';
alter table dashboards           add column _deleted_at integer;

alter table saved_queries        add column _local_updated_at integer not null default 0;
alter table saved_queries        add column _server_updated_at integer;
alter table saved_queries        add column _sync_state text not null default 'clean';
alter table saved_queries        add column _deleted_at integer;

alter table entity_configs       add column _local_updated_at integer not null default 0;
alter table entity_configs       add column _server_updated_at integer;
alter table entity_configs       add column _sync_state text not null default 'clean';
alter table entity_configs       add column _deleted_at integer;

alter table user_profiles        add column _local_updated_at integer not null default 0;
alter table user_profiles        add column _server_updated_at integer;
alter table user_profiles        add column _sync_state text not null default 'clean';
alter table user_profiles        add column _deleted_at integer;

alter table workspace_memberships add column _local_updated_at integer not null default 0;
alter table workspace_memberships add column _server_updated_at integer;
alter table workspace_memberships add column _sync_state text not null default 'clean';
alter table workspace_memberships add column _deleted_at integer;

-- Sync engine bookkeeping
create table if not exists sync_outbox (
  id integer primary key autoincrement,
  table_name text not null,
  row_id text not null,
  op text not null check (op in ('insert','update','delete')),
  payload text not null,           -- JSON snapshot
  created_at integer not null,
  attempts integer not null default 0,
  last_error text
);

create index if not exists sync_outbox_table_row on sync_outbox(table_name, row_id);

create table if not exists parquet_blob_outbox (
  id integer primary key autoincrement,
  dataset_id text not null,
  parquet_blob_key text not null,
  op text not null check (op in ('upload','delete')),
  online_storage_allowed integer not null default 0,  -- bool
  created_at integer not null,
  attempts integer not null default 0,
  last_error text,
  tus_upload_url text,
  bytes_uploaded integer not null default 0
);

create table if not exists sync_cursor (
  table_name text primary key,
  last_pulled_server_updated_at integer not null default 0
);

-- DatasetBlobStore accounting (referenced by GC; Phase 2 deferred this)
create table if not exists dataset_blob_index (
  blob_key text primary key,
  size_bytes integer not null,
  written_at integer not null,
  last_read_at integer,
  derivable_from text
);
```

If `SYNCABLE_TABLES` changes, regenerate this file (consider replacing with a generator script). For Phase 3, manual maintenance is fine.

- [ ] **Step 2: Write the schema verification test**

Create `apps/desktop/sync/sync-schema.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openSqliteDatabase, runMigrations } from "../main/services/Sqlite.ts";
import { loadMigrations } from "../main/services/loadMigrations.ts";
import { SYNCABLE_TABLES } from "./syncable-tables.ts";

describe("sync schema", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("every syncable table has the sync columns", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-sync-schema-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, await loadMigrations());

    for (const table of SYNCABLE_TABLES) {
      const cols = db
        .query<{ name: string }, []>(`pragma table_info(${table})`)
        .all()
        .map((r) => r.name);
      expect(cols, `${table} missing _local_updated_at`).toContain("_local_updated_at");
      expect(cols, `${table} missing _server_updated_at`).toContain("_server_updated_at");
      expect(cols, `${table} missing _sync_state`).toContain("_sync_state");
      expect(cols, `${table} missing _deleted_at`).toContain("_deleted_at");
    }
    db.close();
  });

  it("creates the sync engine bookkeeping tables", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-sync-schema-"));
    const db = openSqliteDatabase(join(dir, "test.sqlite"));
    runMigrations(db, await loadMigrations());

    const tables = db
      .query<{ name: string }, []>(
        "select name from sqlite_master where type='table' order by name",
      )
      .all()
      .map((r) => r.name);

    expect(tables).toContain("sync_outbox");
    expect(tables).toContain("parquet_blob_outbox");
    expect(tables).toContain("sync_cursor");
    expect(tables).toContain("dataset_blob_index");
    db.close();
  });
});
```

- [ ] **Step 3: Run the test and confirm pass**

```bash
pnpm --filter @avandar/desktop test
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/migrations/9999_phase3_sync_schema.sql apps/desktop/sync/sync-schema.test.ts
git commit -m "feat(desktop): add Phase 3 sync schema migration"
```

---

## Task 2: Transactional outbox-aware writes

The critical invariant: every CRUD mutation appends to `sync_outbox` **in the same SQLite transaction** as the data write. Implement once in a helper; call from every mutation path.

**Files:**
- Create: `packages/shared/clients/src/SqliteCRUDClient/withOutbox.ts`
- Test: `packages/shared/clients/src/SqliteCRUDClient/withOutbox.test.ts`
- Modify: `packages/shared/clients/src/SqliteCRUDClient/createSqliteCRUDClient.ts`
- Add: `packages/shared/platform/src/ipc/contracts.ts` — `RdbContracts.runWithOutbox`

- [ ] **Step 1: Extend the IPC contracts**

Edit `packages/shared/platform/src/ipc/contracts.ts`, add to `RdbContracts`:

```ts
runWithOutbox: defineIpcContract<
  {
    readonly tableName: string;
    readonly rowId: string;
    readonly op: "insert" | "update" | "delete";
    readonly dataSql: string;
    readonly dataParams: ReadonlyArray<unknown>;
    readonly payloadJson: string;
  },
  { readonly changes: number }
>("rdb.runWithOutbox"),
```

- [ ] **Step 2: Add the main-side handler**

In `apps/desktop/main/ipc/rdb.ts`, add:

```ts
server.handle(RdbContracts.runWithOutbox, (req) => {
  const tx = db.transaction(() => {
    const dataStmt = db.prepare(req.dataSql);
    const r = dataStmt.run(...req.dataParams);
    db.prepare(
      "insert into sync_outbox (table_name, row_id, op, payload, created_at) values (?, ?, ?, ?, ?)",
    ).run(req.tableName, req.rowId, req.op, req.payloadJson, Date.now());
    return r.changes;
  });
  return { changes: tx() };
});
```

- [ ] **Step 3: Write the failing test for `withOutbox`**

Create `packages/shared/clients/src/SqliteCRUDClient/withOutbox.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { __setIpcBridgeForTests, RdbContracts } from "@avandar/platform";
import { writeWithOutbox } from "./withOutbox.ts";

describe("writeWithOutbox", () => {
  const sendMock = vi.fn();
  const onceMock = vi.fn();

  afterEach(() => {
    sendMock.mockReset();
    onceMock.mockReset();
    __setIpcBridgeForTests(null);
  });

  it("issues a single runWithOutbox IPC call with a JSON payload", async () => {
    __setIpcBridgeForTests({ send: sendMock, once: onceMock });
    onceMock.mockImplementation((_channel, cb) => {
      Promise.resolve().then(() =>
        cb({ id: (sendMock.mock.calls[0]?.[1] as { id: string }).id, ok: true, result: { changes: 1 } }),
      );
    });

    await writeWithOutbox({
      tableName: "datasets",
      rowId: "d1",
      op: "insert",
      dataSql: "insert into datasets (id, name) values (?, ?)",
      dataParams: ["d1", "Demo"],
      payload: { id: "d1", name: "Demo" },
    });

    expect(sendMock).toHaveBeenCalledWith(
      RdbContracts.runWithOutbox.name,
      expect.objectContaining({
        payload: expect.objectContaining({
          tableName: "datasets",
          rowId: "d1",
          op: "insert",
          payloadJson: '{"id":"d1","name":"Demo"}',
        }),
      }),
    );
  });
});
```

- [ ] **Step 4: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/clients test
```

- [ ] **Step 5: Implement `writeWithOutbox`**

Create `packages/shared/clients/src/SqliteCRUDClient/withOutbox.ts`:

```ts
import { callIpc, RdbContracts } from "@avandar/platform";

export type WriteWithOutboxArgs = {
  readonly tableName: string;
  readonly rowId: string;
  readonly op: "insert" | "update" | "delete";
  readonly dataSql: string;
  readonly dataParams: ReadonlyArray<unknown>;
  readonly payload: Readonly<Record<string, unknown>>;
};

export async function writeWithOutbox(args: WriteWithOutboxArgs): Promise<void> {
  await callIpc(RdbContracts.runWithOutbox, {
    tableName: args.tableName,
    rowId: args.rowId,
    op: args.op,
    dataSql: args.dataSql,
    dataParams: args.dataParams,
    payloadJson: JSON.stringify(args.payload),
  });
}
```

- [ ] **Step 6: Wire `writeWithOutbox` into `createSqliteCRUDClient`**

Replace the existing `upsert` and `delete` implementations in `packages/shared/clients/src/SqliteCRUDClient/createSqliteCRUDClient.ts` with versions that include the `_local_updated_at` column and route through `writeWithOutbox`:

```ts
import { writeWithOutbox } from "./withOutbox.ts";

// inside operations:
async upsert(row) {
  const now = Date.now();
  const rowWithMeta = {
    ...(row as Record<string, unknown>),
    _local_updated_at: now,
    _sync_state: "dirty",
  };
  const cols = Object.keys(rowWithMeta);
  const placeholders = cols.map(() => "?").join(", ");
  const updates = cols
    .filter((c) => c !== pk)
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  const sql = `insert into ${tableName} (${cols.join(", ")}) values (${placeholders}) on conflict(${pk}) do update set ${updates};`;
  const params = cols.map((c) => (rowWithMeta as Record<string, unknown>)[c]);

  await writeWithOutbox({
    tableName,
    rowId: String((row as Record<string, unknown>)[pk]),
    op: "update", // upsert is treated as 'update'; the server-side handler does its own merging
    dataSql: sql,
    dataParams: params,
    payload: row as Record<string, unknown>,
  });
  return row;
},

async delete(id) {
  const now = Date.now();
  // Soft-delete via tombstone: mark and let the sync engine push the delete
  await writeWithOutbox({
    tableName,
    rowId: id,
    op: "delete",
    dataSql: `update ${tableName} set _deleted_at = ?, _local_updated_at = ?, _sync_state = 'dirty' where ${pk} = ?`,
    dataParams: [now, now, id],
    payload: { [pk]: id, _deleted_at: now },
  });
},
```

Adjust the read paths (`getById`, `list`) to filter out tombstoned rows (`where _deleted_at is null`):

```ts
async getById(id) {
  const { rows } = await callIpc(RdbContracts.query, {
    sql: `select * from ${tableName} where ${pk} = ? and _deleted_at is null limit 1`,
    params: [id],
  });
  return rows[0] ?? null;
},
async list(filter) {
  // ... append `and _deleted_at is null` to the where clause
}
```

- [ ] **Step 7: Run client tests**

```bash
pnpm --filter @avandar/clients test
```

Expected: green.

- [ ] **Step 8: Integration test the invariant**

Create `apps/desktop/main/services/sync/atomicity.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openSqliteDatabase, runMigrations } from "../Sqlite.ts";
import { loadMigrations } from "../loadMigrations.ts";

describe("write atomicity (integration)", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("a successful write inserts both the data row and the outbox row", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-atomic-test-"));
    const db = openSqliteDatabase(join(dir, "t.sqlite"));
    runMigrations(db, await loadMigrations());

    const tx = db.transaction(() => {
      db.prepare(
        "insert into datasets (id, name, _local_updated_at, _sync_state) values (?, ?, ?, 'dirty')",
      ).run("d1", "Demo", Date.now());
      db.prepare(
        "insert into sync_outbox (table_name, row_id, op, payload, created_at) values (?, ?, ?, ?, ?)",
      ).run("datasets", "d1", "insert", '{"id":"d1","name":"Demo"}', Date.now());
    });
    tx();

    const dataRows = db
      .query<{ id: string }, []>("select id from datasets where id = 'd1'")
      .all();
    const outboxRows = db
      .query<{ row_id: string }, []>(
        "select row_id from sync_outbox where row_id = 'd1'",
      )
      .all();

    expect(dataRows).toHaveLength(1);
    expect(outboxRows).toHaveLength(1);
    db.close();
  });

  it("a failure in the data write rolls back the outbox insert too", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-atomic-test-"));
    const db = openSqliteDatabase(join(dir, "t.sqlite"));
    runMigrations(db, await loadMigrations());

    const tx = db.transaction(() => {
      db.prepare(
        "insert into sync_outbox (table_name, row_id, op, payload, created_at) values (?, ?, ?, ?, ?)",
      ).run("datasets", "x", "insert", "{}", Date.now());
      // Force a failure
      db.prepare("insert into datasets (id) values (?)").run(null); // PK NULL — fails
    });

    expect(() => tx()).toThrow();
    const outboxRows = db
      .query<{ row_id: string }, []>(
        "select row_id from sync_outbox where row_id = 'x'",
      )
      .all();
    expect(outboxRows).toEqual([]);
    db.close();
  });
});
```

```bash
pnpm --filter @avandar/desktop test
```

Expected: green.

- [ ] **Step 9: Commit**

```bash
git add packages/shared/ apps/desktop/
git commit -m "feat(sync): transactional outbox-aware writes; integrate into createSqliteCRUDClient"
```

---

## Task 3: LWW pure function

The conflict-resolution rule is a small pure function — testable without IO.

**Files:**
- Create: `apps/desktop/main/services/sync/Lww.ts`
- Test: `apps/desktop/main/services/sync/Lww.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/main/services/sync/Lww.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveLww } from "./Lww.ts";

describe("resolveLww", () => {
  it("server wins when its updated_at is later", () => {
    const r = resolveLww({
      localUpdatedAt: 100,
      serverUpdatedAt: 200,
      localRow: { id: "a", name: "local" },
      serverRow: { id: "a", name: "server" },
    });
    expect(r.winner).toBe("server");
    expect(r.row).toEqual({ id: "a", name: "server" });
  });

  it("local wins when its updated_at is later", () => {
    const r = resolveLww({
      localUpdatedAt: 300,
      serverUpdatedAt: 200,
      localRow: { id: "a", name: "local" },
      serverRow: { id: "a", name: "server" },
    });
    expect(r.winner).toBe("local");
    expect(r.row).toEqual({ id: "a", name: "local" });
  });

  it("server wins on tie (server is canonical)", () => {
    const r = resolveLww({
      localUpdatedAt: 200,
      serverUpdatedAt: 200,
      localRow: { id: "a", name: "local" },
      serverRow: { id: "a", name: "server" },
    });
    expect(r.winner).toBe("server");
  });

  it("server tombstone always wins (deletes propagate)", () => {
    const r = resolveLww({
      localUpdatedAt: 500,
      serverUpdatedAt: 100,
      localRow: { id: "a", name: "local" },
      serverRow: { id: "a", _deleted_at: 100 },
    });
    expect(r.winner).toBe("server");
    expect(r.tombstoned).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/desktop test
```

- [ ] **Step 3: Implement `resolveLww`**

Create `apps/desktop/main/services/sync/Lww.ts`:

```ts
export type LwwArgs = {
  readonly localUpdatedAt: number;
  readonly serverUpdatedAt: number;
  readonly localRow: Readonly<Record<string, unknown>>;
  readonly serverRow: Readonly<Record<string, unknown>>;
};

export type LwwResult = {
  readonly winner: "local" | "server";
  readonly row: Readonly<Record<string, unknown>>;
  readonly tombstoned: boolean;
};

export function resolveLww(args: LwwArgs): LwwResult {
  const serverDeleted = typeof args.serverRow._deleted_at === "number";

  // Tombstones are always authoritative — a delete must propagate even when
  // a concurrent local edit has a later timestamp. This is the conservative
  // choice for V1; revisit in V2 if user feedback flags real "I unintentionally
  // lost an edit" cases.
  if (serverDeleted) {
    return { winner: "server", row: args.serverRow, tombstoned: true };
  }

  if (args.localUpdatedAt > args.serverUpdatedAt) {
    return { winner: "local", row: args.localRow, tombstoned: false };
  }
  return { winner: "server", row: args.serverRow, tombstoned: false };
}
```

- [ ] **Step 4: Run the test and confirm pass**

```bash
pnpm --filter @avandar/desktop test
```

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/main/services/sync/Lww.ts apps/desktop/main/services/sync/Lww.test.ts
git commit -m "feat(sync): LWW resolver with tombstone precedence"
```

---

## Task 4: NetworkProbe

Detect online/offline state. Simple poll-based for V1; OS-level network change events as a V2 nicety.

**Files:**
- Create: `apps/desktop/main/services/sync/NetworkProbe.ts`
- Test: `apps/desktop/main/services/sync/NetworkProbe.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/main/services/sync/NetworkProbe.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNetworkProbe } from "./NetworkProbe.ts";

describe("NetworkProbe", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emits online when the probe succeeds, offline when it fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const probe = createNetworkProbe({
      url: "http://example.invalid/ping",
      fetchImpl: fetchMock as unknown as typeof fetch,
      intervalMs: 1000,
    });

    const events: string[] = [];
    const unsub = probe.onChange((s) => events.push(s));

    await probe.checkOnce();
    await probe.checkOnce();
    expect(events).toEqual(["online", "offline"]);

    unsub();
    probe.stop();
  });

  it("does not duplicate events on stable state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));

    const probe = createNetworkProbe({
      url: "http://x/ping",
      fetchImpl: fetchMock as unknown as typeof fetch,
      intervalMs: 1000,
    });
    const events: string[] = [];
    probe.onChange((s) => events.push(s));

    await probe.checkOnce();
    await probe.checkOnce();
    expect(events).toEqual(["online"]); // only one event for "still online"
    probe.stop();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/desktop test
```

- [ ] **Step 3: Implement `NetworkProbe`**

Create `apps/desktop/main/services/sync/NetworkProbe.ts`:

```ts
export type NetworkState = "online" | "offline";

export type NetworkProbe = {
  start(): void;
  stop(): void;
  checkOnce(): Promise<void>;
  state(): NetworkState;
  onChange(cb: (s: NetworkState) => void): () => void;
};

export type NetworkProbeArgs = {
  readonly url: string;
  readonly fetchImpl?: typeof fetch;
  readonly intervalMs: number;
};

export function createNetworkProbe(args: NetworkProbeArgs): NetworkProbe {
  const fetchImpl = args.fetchImpl ?? fetch;
  let state: NetworkState = "offline";
  const listeners = new Set<(s: NetworkState) => void>();
  let timer: ReturnType<typeof setInterval> | null = null;

  async function checkOnce(): Promise<void> {
    let next: NetworkState;
    try {
      const res = await fetchImpl(args.url, { method: "HEAD" });
      next = res.ok || res.status < 500 ? "online" : "offline";
    } catch {
      next = "offline";
    }
    if (next !== state) {
      state = next;
      listeners.forEach((l) => l(state));
    }
  }

  return {
    start() {
      if (timer) return;
      timer = setInterval(() => void checkOnce(), args.intervalMs);
      void checkOnce();
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    checkOnce,
    state: () => state,
    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
```

- [ ] **Step 4: Run the test and confirm pass**

```bash
pnpm --filter @avandar/desktop test
```

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/main/services/sync/NetworkProbe.ts apps/desktop/main/services/sync/NetworkProbe.test.ts
git commit -m "feat(sync): polling-based NetworkProbe"
```

---

## Task 5: PushLoop (relational)

Drains `sync_outbox` to Supabase.

**Files:**
- Create: `apps/desktop/main/services/sync/PushLoop.ts`
- Test: `apps/desktop/main/services/sync/PushLoop.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/main/services/sync/PushLoop.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openSqliteDatabase, runMigrations } from "../Sqlite.ts";
import { loadMigrations } from "../loadMigrations.ts";
import { drainPushQueue } from "./PushLoop.ts";

describe("drainPushQueue", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("pushes one outbox row and removes it on success", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-push-"));
    const db = openSqliteDatabase(join(dir, "t.sqlite"));
    runMigrations(db, await loadMigrations());

    db.run(
      "insert into datasets (id, name, _local_updated_at, _sync_state) values ('d1', 'Demo', 1000, 'dirty')",
    );
    db.run(
      "insert into sync_outbox (table_name, row_id, op, payload, created_at) values ('datasets', 'd1', 'insert', ?, 1000)",
      ['{"id":"d1","name":"Demo"}'],
    );

    const rest = {
      apply: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, serverUpdatedAt: 1500 }),
    };
    const result = await drainPushQueue({
      db,
      rest: rest as never,
      accessToken: "tok",
      batchSize: 10,
    });

    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(0);
    const remaining = db.query<{ id: number }, []>("select id from sync_outbox").all();
    expect(remaining).toEqual([]);

    const row = db
      .query<{ _sync_state: string; _server_updated_at: number }, []>(
        "select _sync_state, _server_updated_at from datasets where id = 'd1'",
      )
      .get()!;
    expect(row._sync_state).toBe("clean");
    expect(row._server_updated_at).toBe(1500);
    db.close();
  });

  it("retains the outbox row on transient (5xx) failure with attempts++", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-push-"));
    const db = openSqliteDatabase(join(dir, "t.sqlite"));
    runMigrations(db, await loadMigrations());

    db.run(
      "insert into sync_outbox (table_name, row_id, op, payload, created_at) values ('datasets', 'd1', 'insert', '{}', 1000)",
    );

    const rest = {
      apply: vi.fn().mockResolvedValueOnce({ ok: false, transient: true, error: "503" }),
    };
    const result = await drainPushQueue({
      db,
      rest: rest as never,
      accessToken: "tok",
      batchSize: 10,
    });

    expect(result.successCount).toBe(0);
    expect(result.errorCount).toBe(1);
    const row = db.query<{ attempts: number; last_error: string }, []>("select attempts, last_error from sync_outbox").get()!;
    expect(row.attempts).toBe(1);
    expect(row.last_error).toContain("503");
    db.close();
  });

  it("marks _sync_state=conflict on permanent (4xx) failure", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-push-"));
    const db = openSqliteDatabase(join(dir, "t.sqlite"));
    runMigrations(db, await loadMigrations());

    db.run(
      "insert into datasets (id, name, _local_updated_at, _sync_state) values ('d1', 'Demo', 1000, 'dirty')",
    );
    db.run(
      "insert into sync_outbox (table_name, row_id, op, payload, created_at) values ('datasets', 'd1', 'insert', '{}', 1000)",
    );

    const rest = {
      apply: vi.fn().mockResolvedValueOnce({ ok: false, transient: false, error: "FK violation" }),
    };
    await drainPushQueue({
      db,
      rest: rest as never,
      accessToken: "tok",
      batchSize: 10,
    });

    const row = db.query<{ _sync_state: string }, []>("select _sync_state from datasets where id='d1'").get()!;
    expect(row._sync_state).toBe("conflict");
    db.close();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/desktop test
```

- [ ] **Step 3: Implement `drainPushQueue`**

Create `apps/desktop/main/services/sync/PushLoop.ts`:

```ts
import type { AvaSqliteDatabase } from "../Sqlite.ts";

export type ApplyResult =
  | { ok: true; serverUpdatedAt: number }
  | { ok: false; transient: boolean; error: string };

export type SupabaseSyncClient = {
  apply(args: {
    tableName: string;
    rowId: string;
    op: "insert" | "update" | "delete";
    payload: unknown;
    accessToken: string;
  }): Promise<ApplyResult>;
};

export type DrainPushQueueArgs = {
  readonly db: AvaSqliteDatabase;
  readonly rest: SupabaseSyncClient;
  readonly accessToken: string;
  readonly batchSize: number;
};

export type DrainPushQueueResult = {
  readonly successCount: number;
  readonly errorCount: number;
};

export async function drainPushQueue(
  args: DrainPushQueueArgs,
): Promise<DrainPushQueueResult> {
  const { db, rest, accessToken, batchSize } = args;

  type OutboxRow = {
    id: number;
    table_name: string;
    row_id: string;
    op: "insert" | "update" | "delete";
    payload: string;
    attempts: number;
  };

  const batch = db
    .query<OutboxRow, []>(
      "select id, table_name, row_id, op, payload, attempts from sync_outbox order by id asc limit ?",
    )
    .all(batchSize);

  let successCount = 0;
  let errorCount = 0;

  for (const entry of batch) {
    const payload = JSON.parse(entry.payload) as Record<string, unknown>;
    const r = await rest.apply({
      tableName: entry.table_name,
      rowId: entry.row_id,
      op: entry.op,
      payload,
      accessToken,
    });

    if (r.ok) {
      const tx = db.transaction(() => {
        db.prepare("delete from sync_outbox where id = ?").run(entry.id);
        db.prepare(
          `update ${entry.table_name} set _sync_state = 'clean', _server_updated_at = ? where ${primaryKeyFor(entry.table_name)} = ?`,
        ).run(r.serverUpdatedAt, entry.row_id);
      });
      tx();
      successCount++;
    } else if (r.transient) {
      db.prepare(
        "update sync_outbox set attempts = attempts + 1, last_error = ? where id = ?",
      ).run(r.error, entry.id);
      errorCount++;
    } else {
      // Permanent failure — leave in outbox but flag the row
      db.prepare(
        "update sync_outbox set attempts = attempts + 1, last_error = ? where id = ?",
      ).run(r.error, entry.id);
      db.prepare(
        `update ${entry.table_name} set _sync_state = 'conflict' where ${primaryKeyFor(entry.table_name)} = ?`,
      ).run(entry.row_id);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

/**
 * Look up the primary-key column for a given syncable table. In V1 we hardcode
 * 'id' for every syncable table (all current ones use 'id'). If a future
 * table uses a different PK name, extend this lookup.
 */
function primaryKeyFor(tableName: string): string {
  return "id";
}
```

- [ ] **Step 4: Run the test and confirm pass**

```bash
pnpm --filter @avandar/desktop test
```

- [ ] **Step 5: Implement `SupabaseSyncClient` (apply method)**

Extend `apps/desktop/main/services/SupabaseRest.ts`:

```ts
export type SupabaseRestClient = {
  selectAll(
    table: string,
    accessToken: string,
  ): Promise<ReadonlyArray<Record<string, unknown>>>;
  selectChangedSince(
    table: string,
    since: number,
    accessToken: string,
  ): Promise<ReadonlyArray<Record<string, unknown>>>;
  apply(args: {
    tableName: string;
    rowId: string;
    op: "insert" | "update" | "delete";
    payload: unknown;
    accessToken: string;
  }): Promise<
    | { ok: true; serverUpdatedAt: number }
    | { ok: false; transient: boolean; error: string }
  >;
};

export function createSupabaseRestClient(): SupabaseRestClient {
  // ... existing selectAll ...

  async function apply(args) {
    const { tableName, rowId, op, payload, accessToken } = args;
    const url = `${SUPABASE_URL}/rest/v1/${tableName}`;

    let res: Response;
    if (op === "delete") {
      res = await fetch(`${url}?id=eq.${encodeURIComponent(rowId)}`, {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          Prefer: "return=representation",
        },
      });
    } else {
      res = await fetch(url, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(payload),
      });
    }

    if (res.ok) {
      const body = (await res.json()) as Array<{ updated_at?: string | number }>;
      const updatedAt =
        body[0]?.updated_at !== undefined
          ? Number(new Date(body[0]!.updated_at as string).getTime())
          : Date.now();
      return { ok: true, serverUpdatedAt: updatedAt };
    }
    if (res.status >= 500 || res.status === 429) {
      return { ok: false, transient: true, error: `${res.status}` };
    }
    return { ok: false, transient: false, error: `${res.status} ${await res.text()}` };
  }

  return { selectAll, selectChangedSince, apply };
}
```

`selectChangedSince` is implemented in the PullLoop task; stub it for now if unused.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/main/
git commit -m "feat(sync): relational push loop with transient/permanent failure handling"
```

---

## Task 6: PullLoop (relational)

Pulls Supabase deltas into local SQLite; resolves conflicts via LWW.

**Files:**
- Create: `apps/desktop/main/services/sync/PullLoop.ts`
- Test: `apps/desktop/main/services/sync/PullLoop.test.ts`

- [ ] **Step 1: Add `selectChangedSince` to `SupabaseRest`**

In `apps/desktop/main/services/SupabaseRest.ts`:

```ts
async function selectChangedSince(
  table: string,
  since: number,
  accessToken: string,
) {
  // Supabase Postgres exposes `updated_at` column; filter via PostgREST
  const url = `${SUPABASE_URL}/rest/v1/${table}?updated_at=gt.${new Date(since).toISOString()}&order=updated_at.asc&select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`selectChangedSince ${table}: ${res.status}`);
  return (await res.json()) as ReadonlyArray<Record<string, unknown>>;
}
```

- [ ] **Step 2: Write the failing test**

Create `apps/desktop/main/services/sync/PullLoop.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openSqliteDatabase, runMigrations } from "../Sqlite.ts";
import { loadMigrations } from "../loadMigrations.ts";
import { drainPullQueue } from "./PullLoop.ts";

describe("drainPullQueue", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("inserts new rows from the server", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-pull-"));
    const db = openSqliteDatabase(join(dir, "t.sqlite"));
    runMigrations(db, await loadMigrations());

    const rest = {
      selectChangedSince: vi
        .fn()
        .mockResolvedValueOnce([
          { id: "a", name: "Alpha", updated_at: 1500 },
          { id: "b", name: "Bravo", updated_at: 1600 },
        ])
        .mockResolvedValue([]),
    };

    const result = await drainPullQueue({
      db,
      rest: rest as never,
      accessToken: "tok",
      tables: ["datasets"],
    });

    expect(result.totalInserted).toBe(2);
    const rows = db
      .query<{ id: string; name: string }, []>("select id, name from datasets order by id")
      .all();
    expect(rows).toEqual([{ id: "a", name: "Alpha" }, { id: "b", name: "Bravo" }]);
    const cursor = db
      .query<{ last_pulled_server_updated_at: number }, []>(
        "select last_pulled_server_updated_at from sync_cursor where table_name='datasets'",
      )
      .get();
    expect(cursor?.last_pulled_server_updated_at).toBe(1600);
    db.close();
  });

  it("LWW: server wins when its updated_at is later than local _local_updated_at", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-pull-"));
    const db = openSqliteDatabase(join(dir, "t.sqlite"));
    runMigrations(db, await loadMigrations());

    db.run(
      "insert into datasets (id, name, _local_updated_at, _sync_state) values ('a', 'Local', 100, 'dirty')",
    );

    const rest = {
      selectChangedSince: vi
        .fn()
        .mockResolvedValueOnce([{ id: "a", name: "Server", updated_at: 500 }])
        .mockResolvedValue([]),
    };

    await drainPullQueue({ db, rest: rest as never, accessToken: "tok", tables: ["datasets"] });

    const row = db.query<{ name: string; _sync_state: string }, []>("select name, _sync_state from datasets where id='a'").get()!;
    expect(row.name).toBe("Server");
    expect(row._sync_state).toBe("clean");
  });

  it("LWW: local wins when its _local_updated_at is later", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-pull-"));
    const db = openSqliteDatabase(join(dir, "t.sqlite"));
    runMigrations(db, await loadMigrations());

    db.run(
      "insert into datasets (id, name, _local_updated_at, _sync_state) values ('a', 'Local', 800, 'dirty')",
    );

    const rest = {
      selectChangedSince: vi
        .fn()
        .mockResolvedValueOnce([{ id: "a", name: "Server", updated_at: 500 }])
        .mockResolvedValue([]),
    };

    await drainPullQueue({ db, rest: rest as never, accessToken: "tok", tables: ["datasets"] });

    const row = db.query<{ name: string }, []>("select name from datasets where id='a'").get()!;
    expect(row.name).toBe("Local");
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/desktop test
```

- [ ] **Step 4: Implement `drainPullQueue`**

Create `apps/desktop/main/services/sync/PullLoop.ts`:

```ts
import type { AvaSqliteDatabase } from "../Sqlite.ts";
import type { SupabaseRestClient } from "../SupabaseRest.ts";
import { resolveLww } from "./Lww.ts";

export type DrainPullQueueArgs = {
  readonly db: AvaSqliteDatabase;
  readonly rest: Pick<SupabaseRestClient, "selectChangedSince">;
  readonly accessToken: string;
  readonly tables: ReadonlyArray<string>;
};

export type DrainPullQueueResult = {
  readonly totalInserted: number;
  readonly totalUpdated: number;
  readonly totalSkipped: number;
};

export async function drainPullQueue(
  args: DrainPullQueueArgs,
): Promise<DrainPullQueueResult> {
  const { db, rest, accessToken, tables } = args;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const table of tables) {
    const cursor = (db
      .query<{ ts: number }, []>(
        "select coalesce((select last_pulled_server_updated_at from sync_cursor where table_name = ?), 0) as ts",
      )
      .get(table) ?? { ts: 0 }).ts;

    const incoming = await rest.selectChangedSince(table, cursor, accessToken);
    if (incoming.length === 0) continue;

    let maxUpdatedAt = cursor;
    const tx = db.transaction(() => {
      for (const rawRow of incoming) {
        const rowId = String((rawRow as Record<string, unknown>).id);
        const updatedAtRaw = (rawRow as Record<string, unknown>).updated_at;
        const serverUpdatedAt =
          typeof updatedAtRaw === "string"
            ? new Date(updatedAtRaw).getTime()
            : Number(updatedAtRaw ?? Date.now());
        if (serverUpdatedAt > maxUpdatedAt) maxUpdatedAt = serverUpdatedAt;

        const local = db
          .query<{
            _local_updated_at: number;
            _sync_state: string;
            _deleted_at: number | null;
          } & Record<string, unknown>, []>(
            `select * from ${table} where id = ? limit 1`,
          )
          .get(rowId);

        if (!local) {
          // New row from server
          const row = stripUpdatedAt({
            ...rawRow,
            _server_updated_at: serverUpdatedAt,
            _sync_state: "clean",
            _local_updated_at: serverUpdatedAt,
          });
          const cols = Object.keys(row);
          const placeholders = cols.map(() => "?").join(", ");
          db.prepare(
            `insert into ${table} (${cols.join(", ")}) values (${placeholders})`,
          ).run(...cols.map((c) => (row as Record<string, unknown>)[c]));
          totalInserted++;
          continue;
        }

        if (local._sync_state === "clean") {
          // overwrite
          const row = stripUpdatedAt({
            ...rawRow,
            _server_updated_at: serverUpdatedAt,
            _sync_state: "clean",
            _local_updated_at: serverUpdatedAt,
          });
          updateRow(db, table, rowId, row);
          totalUpdated++;
          continue;
        }

        // dirty: LWW
        const decision = resolveLww({
          localUpdatedAt: local._local_updated_at,
          serverUpdatedAt,
          localRow: local,
          serverRow: rawRow,
        });
        if (decision.winner === "server") {
          // drop pending outbox entry for this row so we don't re-push stale data
          db.prepare(
            "delete from sync_outbox where table_name = ? and row_id = ?",
          ).run(table, rowId);
          const row = stripUpdatedAt({
            ...decision.row,
            _server_updated_at: serverUpdatedAt,
            _sync_state: "clean",
            _local_updated_at: serverUpdatedAt,
          });
          updateRow(db, table, rowId, row);
          totalUpdated++;
        } else {
          // local wins — leave row alone; the next push will overwrite server
          totalSkipped++;
        }
      }

      db.prepare(
        "insert into sync_cursor (table_name, last_pulled_server_updated_at) values (?, ?) on conflict(table_name) do update set last_pulled_server_updated_at = excluded.last_pulled_server_updated_at",
      ).run(table, maxUpdatedAt);
    });

    tx();
  }

  return { totalInserted, totalUpdated, totalSkipped };
}

function stripUpdatedAt(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const { updated_at, ...rest } = row;
  return rest;
}

function updateRow(
  db: AvaSqliteDatabase,
  table: string,
  rowId: string,
  row: Record<string, unknown>,
): void {
  const cols = Object.keys(row).filter((c) => c !== "id");
  const set = cols.map((c) => `${c} = ?`).join(", ");
  db.prepare(`update ${table} set ${set} where id = ?`).run(
    ...cols.map((c) => row[c]),
    rowId,
  );
}
```

- [ ] **Step 5: Run the test and confirm pass**

```bash
pnpm --filter @avandar/desktop test
```

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/main/
git commit -m "feat(sync): relational pull loop with LWW conflict resolution"
```

---

## Task 7: ParquetUploadLoop (TUS resumable)

Drains `parquet_blob_outbox` to Supabase Storage. Port the existing TUS pattern from `src/clients/DatasetParquetStorageClient`.

**Files:**
- Create: `apps/desktop/main/services/sync/ParquetUploadLoop.ts`
- Test: `apps/desktop/main/services/sync/ParquetUploadLoop.test.ts`

- [ ] **Step 1: Inspect the existing web TUS client**

```bash
git grep -l "DatasetParquetStorageClient" -- 'src/'
```

Read its TUS configuration: chunk size, retry strategy, headers (`Upload-Offset`, `Upload-Length`, etc.).

- [ ] **Step 2: Write the failing test**

Create `apps/desktop/main/services/sync/ParquetUploadLoop.test.ts`:

```ts
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openSqliteDatabase, runMigrations } from "../Sqlite.ts";
import { loadMigrations } from "../loadMigrations.ts";
import { drainParquetUploadQueue } from "./ParquetUploadLoop.ts";

describe("drainParquetUploadQueue", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("uploads a queued parquet via TUS and removes the outbox row", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-pup-"));
    const db = openSqliteDatabase(join(dir, "t.sqlite"));
    runMigrations(db, await loadMigrations());

    const parquetPath = join(dir, "data.parquet");
    writeFileSync(parquetPath, Buffer.from([1, 2, 3, 4]));
    db.run(
      "insert into parquet_blob_outbox (dataset_id, parquet_blob_key, op, online_storage_allowed, created_at) values (?, ?, 'upload', 1, 0)",
      ["d1", parquetPath],
    );

    const tus = {
      uploadFile: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, finalUrl: "https://supabase/blob/d1.parquet" }),
    };

    const result = await drainParquetUploadQueue({
      db,
      tus: tus as never,
      accessToken: "tok",
      batchSize: 5,
    });

    expect(result.successCount).toBe(1);
    expect(tus.uploadFile).toHaveBeenCalled();
    const remaining = db.query<{ id: number }, []>("select id from parquet_blob_outbox").all();
    expect(remaining).toEqual([]);
    db.close();
  });

  it("skips rows where online_storage_allowed = 0", async () => {
    dir = mkdtempSync(join(tmpdir(), "ava-pup-"));
    const db = openSqliteDatabase(join(dir, "t.sqlite"));
    runMigrations(db, await loadMigrations());

    db.run(
      "insert into parquet_blob_outbox (dataset_id, parquet_blob_key, op, online_storage_allowed, created_at) values (?, ?, 'upload', 0, 0)",
      ["d1", "/tmp/should-be-skipped"],
    );

    const tus = { uploadFile: vi.fn() };
    const result = await drainParquetUploadQueue({
      db,
      tus: tus as never,
      accessToken: "tok",
      batchSize: 5,
    });

    expect(result.successCount).toBe(0);
    expect(tus.uploadFile).not.toHaveBeenCalled();
    db.close();
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/desktop test
```

- [ ] **Step 4: Implement TUS client + ParquetUploadLoop**

Create `apps/desktop/main/services/sync/TusClient.ts`:

```ts
import { statSync, openSync, readSync, closeSync } from "node:fs";

export type TusClient = {
  uploadFile(args: {
    filePath: string;
    endpoint: string;
    accessToken: string;
    chunkSizeBytes: number;
    resumeFromUrl?: string;
    onProgress?: (bytesUploaded: number) => void;
  }): Promise<
    | { ok: true; finalUrl: string }
    | { ok: false; transient: boolean; error: string; partialUrl?: string; bytesUploaded?: number }
  >;
};

export function createTusClient(): TusClient {
  return {
    async uploadFile({
      filePath,
      endpoint,
      accessToken,
      chunkSizeBytes,
      resumeFromUrl,
      onProgress,
    }) {
      const totalSize = statSync(filePath).size;
      let uploadUrl = resumeFromUrl;
      let offset = 0;

      // Step 1: create or resume
      if (!uploadUrl) {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Tus-Resumable": "1.0.0",
            "Upload-Length": String(totalSize),
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/offset+octet-stream",
          },
        });
        if (!res.ok) {
          return {
            ok: false,
            transient: res.status >= 500 || res.status === 429,
            error: `TUS create ${res.status}`,
          };
        }
        uploadUrl = res.headers.get("Location") ?? undefined;
        if (!uploadUrl) {
          return { ok: false, transient: true, error: "TUS missing Location header" };
        }
      } else {
        // HEAD to determine current offset
        const head = await fetch(uploadUrl, {
          method: "HEAD",
          headers: { "Tus-Resumable": "1.0.0", Authorization: `Bearer ${accessToken}` },
        });
        if (!head.ok) {
          return { ok: false, transient: true, error: `TUS HEAD ${head.status}` };
        }
        offset = Number(head.headers.get("Upload-Offset") ?? "0");
      }

      // Step 2: stream chunks
      const fd = openSync(filePath, "r");
      try {
        while (offset < totalSize) {
          const chunk = Buffer.alloc(Math.min(chunkSizeBytes, totalSize - offset));
          readSync(fd, chunk, 0, chunk.length, offset);

          const patch = await fetch(uploadUrl, {
            method: "PATCH",
            headers: {
              "Tus-Resumable": "1.0.0",
              "Upload-Offset": String(offset),
              "Content-Type": "application/offset+octet-stream",
              Authorization: `Bearer ${accessToken}`,
            },
            body: chunk,
          });

          if (!patch.ok) {
            return {
              ok: false,
              transient: patch.status >= 500 || patch.status === 429,
              error: `TUS PATCH ${patch.status}`,
              partialUrl: uploadUrl,
              bytesUploaded: offset,
            };
          }

          offset = Number(patch.headers.get("Upload-Offset") ?? "0");
          onProgress?.(offset);
        }
      } finally {
        closeSync(fd);
      }

      return { ok: true, finalUrl: uploadUrl };
    },
  };
}
```

Create `apps/desktop/main/services/sync/ParquetUploadLoop.ts`:

```ts
import type { AvaSqliteDatabase } from "../Sqlite.ts";
import type { TusClient } from "./TusClient.ts";

const SUPABASE_URL = process.env.AVA_SUPABASE_URL ?? "";
const STORAGE_BUCKET = "datasets";
const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MiB

export type DrainParquetUploadQueueArgs = {
  readonly db: AvaSqliteDatabase;
  readonly tus: TusClient;
  readonly accessToken: string;
  readonly batchSize: number;
};

export type DrainParquetUploadQueueResult = {
  readonly successCount: number;
  readonly errorCount: number;
};

export async function drainParquetUploadQueue(
  args: DrainParquetUploadQueueArgs,
): Promise<DrainParquetUploadQueueResult> {
  const { db, tus, accessToken, batchSize } = args;

  type Row = {
    id: number;
    dataset_id: string;
    parquet_blob_key: string;
    op: "upload" | "delete";
    online_storage_allowed: number;
    tus_upload_url: string | null;
    bytes_uploaded: number;
  };

  const batch = db
    .query<Row, []>(
      "select id, dataset_id, parquet_blob_key, op, online_storage_allowed, tus_upload_url, bytes_uploaded from parquet_blob_outbox where online_storage_allowed = 1 order by id asc limit ?",
    )
    .all(batchSize);

  let successCount = 0;
  let errorCount = 0;

  for (const entry of batch) {
    if (entry.op !== "upload") {
      // Delete handling (V1: best-effort)
      continue;
    }
    const endpoint = `${SUPABASE_URL}/storage/v1/upload/resumable/${STORAGE_BUCKET}/${entry.dataset_id}/data.parquet`;
    const r = await tus.uploadFile({
      filePath: entry.parquet_blob_key,
      endpoint,
      accessToken,
      chunkSizeBytes: CHUNK_SIZE,
      resumeFromUrl: entry.tus_upload_url ?? undefined,
      onProgress(bytes) {
        db.prepare(
          "update parquet_blob_outbox set bytes_uploaded = ? where id = ?",
        ).run(bytes, entry.id);
      },
    });

    if (r.ok) {
      db.prepare("delete from parquet_blob_outbox where id = ?").run(entry.id);
      db.prepare(
        "update datasets set parquet_uploaded_at = ? where id = ?",
      ).run(Date.now(), entry.dataset_id);
      successCount++;
    } else {
      db.prepare(
        "update parquet_blob_outbox set attempts = attempts + 1, last_error = ?, tus_upload_url = ?, bytes_uploaded = ? where id = ?",
      ).run(
        r.error,
        r.partialUrl ?? null,
        r.bytesUploaded ?? entry.bytes_uploaded,
        entry.id,
      );
      errorCount++;
    }
  }

  return { successCount, errorCount };
}
```

This presupposes a `datasets.parquet_uploaded_at` column. If absent, add an entry in `apps/desktop/migrations/9999_phase3_sync_schema.sql`:

```sql
alter table datasets add column parquet_uploaded_at integer;
```

(and add the same column to the Postgres migrations in a coordinated change).

- [ ] **Step 5: Run the test and confirm pass**

```bash
pnpm --filter @avandar/desktop test
```

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/main/
git commit -m "feat(sync): TUS-resumable parquet upload loop"
```

---

## Task 8: SyncEngine orchestrator

Glue the loops together; export status via IPC.

**Files:**
- Create: `apps/desktop/main/services/sync/SyncEngine.ts`
- Test: `apps/desktop/main/services/sync/SyncEngine.test.ts`
- Add: `SyncContracts` to `packages/shared/platform/src/ipc/contracts.ts`
- Create: `apps/desktop/main/ipc/sync.ts`
- Create: `packages/shared/platform/src/desktop/DesktopSyncEngine.ts`
- Modify: `apps/desktop/main/index.ts`

- [ ] **Step 1: Add SyncContracts**

In `packages/shared/platform/src/ipc/contracts.ts`:

```ts
import type { SyncStatus } from "../types/SyncEngine.types.ts";

export const SyncContracts = {
  status: defineIpcContract<Record<string, never>, { status: SyncStatus }>(
    "sync.status",
  ),
  forceSync: defineIpcContract<Record<string, never>, { ok: true }>(
    "sync.forceSync",
  ),
  // Events: sync engine emits status changes on this channel via send()
  statusEvent: defineIpcContract<{ status: SyncStatus }, Record<string, never>>(
    "sync.statusEvent",
  ),
};
```

- [ ] **Step 2: Implement the orchestrator**

Create `apps/desktop/main/services/sync/SyncEngine.ts`:

```ts
import type { SyncStatus } from "@avandar/platform";
import type { AvaSqliteDatabase } from "../Sqlite.ts";
import type { SupabaseRestClient } from "../SupabaseRest.ts";
import type { TusClient } from "./TusClient.ts";
import type { NetworkProbe } from "./NetworkProbe.ts";
import { drainPushQueue } from "./PushLoop.ts";
import { drainPullQueue } from "./PullLoop.ts";
import { drainParquetUploadQueue } from "./ParquetUploadLoop.ts";

export type SyncEngineArgs = {
  readonly db: AvaSqliteDatabase;
  readonly rest: SupabaseRestClient;
  readonly tus: TusClient;
  readonly network: NetworkProbe;
  readonly getAccessToken: () => string | null;
  readonly syncableTables: ReadonlyArray<string>;
  readonly pushIntervalMs: number;
  readonly pullIntervalMs: number;
  readonly parquetIntervalMs: number;
};

export type SyncEngineWorker = {
  start(): void;
  stop(): void;
  status(): SyncStatus;
  forceSync(): Promise<void>;
  onStatusChange(cb: (s: SyncStatus) => void): () => void;
};

export function createSyncEngine(args: SyncEngineArgs): SyncEngineWorker {
  let status: SyncStatus = { kind: "offline" };
  const listeners = new Set<(s: SyncStatus) => void>();

  function emit(next: SyncStatus): void {
    status = next;
    listeners.forEach((l) => l(next));
  }

  function computePendingCounts() {
    const pendingRows = (args.db
      .query<{ c: number }, []>("select count(*) as c from sync_outbox")
      .get() ?? { c: 0 }).c;
    const pendingParquets = (args.db
      .query<{ c: number }, []>(
        "select count(*) as c from parquet_blob_outbox where online_storage_allowed = 1",
      )
      .get() ?? { c: 0 }).c;
    return { pendingRows, pendingParquets };
  }

  args.network.onChange(async (state) => {
    if (state === "offline") {
      emit({ kind: "offline" });
    } else {
      const counts = computePendingCounts();
      emit({
        kind: "online",
        state: "idle",
        lastSyncedAt: 0,
        pendingRows: counts.pendingRows,
        pendingParquets: counts.pendingParquets,
      });
    }
  });

  let pushTimer: ReturnType<typeof setInterval> | null = null;
  let pullTimer: ReturnType<typeof setInterval> | null = null;
  let parquetTimer: ReturnType<typeof setInterval> | null = null;

  async function runOnce(): Promise<void> {
    if (args.network.state() === "offline") return;
    const token = args.getAccessToken();
    if (!token) return;

    const counts = computePendingCounts();
    emit({
      kind: "online",
      state: "syncing",
      lastSyncedAt: status.kind === "online" ? status.lastSyncedAt : 0,
      pendingRows: counts.pendingRows,
      pendingParquets: counts.pendingParquets,
    });

    try {
      await drainPushQueue({
        db: args.db,
        rest: { apply: args.rest.apply },
        accessToken: token,
        batchSize: 25,
      });
      await drainPullQueue({
        db: args.db,
        rest: { selectChangedSince: args.rest.selectChangedSince },
        accessToken: token,
        tables: args.syncableTables,
      });
      await drainParquetUploadQueue({
        db: args.db,
        tus: args.tus,
        accessToken: token,
        batchSize: 1,
      });

      const after = computePendingCounts();
      emit({
        kind: "online",
        state: "idle",
        lastSyncedAt: Date.now(),
        pendingRows: after.pendingRows,
        pendingParquets: after.pendingParquets,
      });
    } catch (err) {
      const after = computePendingCounts();
      emit({
        kind: "error",
        lastError: err instanceof Error ? err.message : String(err),
        pendingRows: after.pendingRows,
        pendingParquets: after.pendingParquets,
      });
    }
  }

  return {
    start() {
      args.network.start();
      pushTimer = setInterval(() => void runOnce(), args.pushIntervalMs);
      pullTimer = setInterval(() => void runOnce(), args.pullIntervalMs);
      parquetTimer = setInterval(() => void runOnce(), args.parquetIntervalMs);
    },
    stop() {
      args.network.stop();
      if (pushTimer) clearInterval(pushTimer);
      if (pullTimer) clearInterval(pullTimer);
      if (parquetTimer) clearInterval(parquetTimer);
    },
    status: () => status,
    forceSync: () => runOnce(),
    onStatusChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
```

- [ ] **Step 3: Write a minimal smoke test**

Create `apps/desktop/main/services/sync/SyncEngine.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createSyncEngine } from "./SyncEngine.ts";

describe("SyncEngine status transitions", () => {
  it("starts offline; flips online when network probe reports online", async () => {
    const fakeDb = {
      query: () => ({ all: () => [], get: () => ({ c: 0 }) }),
    } as never;
    let netCb: ((s: "online" | "offline") => void) | null = null;
    const probe = {
      start: vi.fn(),
      stop: vi.fn(),
      checkOnce: vi.fn(),
      state: () => "offline" as const,
      onChange: (cb: (s: "online" | "offline") => void) => {
        netCb = cb;
        return () => {};
      },
    };

    const engine = createSyncEngine({
      db: fakeDb,
      rest: { apply: vi.fn(), selectChangedSince: vi.fn(), selectAll: vi.fn() } as never,
      tus: { uploadFile: vi.fn() } as never,
      network: probe as never,
      getAccessToken: () => "tok",
      syncableTables: [],
      pushIntervalMs: 60_000,
      pullIntervalMs: 60_000,
      parquetIntervalMs: 60_000,
    });

    const states: string[] = [];
    engine.onStatusChange((s) => states.push(s.kind));
    engine.start();

    netCb?.("online");
    expect(states).toContain("online");

    netCb?.("offline");
    expect(states).toContain("offline");
    engine.stop();
  });
});
```

```bash
pnpm --filter @avandar/desktop test
```

Expected: green.

- [ ] **Step 4: IPC handlers**

Create `apps/desktop/main/ipc/sync.ts`:

```ts
import { SyncContracts } from "@avandar/platform";
import type { IpcServer, IpcTransport } from "@avandar/platform";
import type { SyncEngineWorker } from "../services/sync/SyncEngine.ts";

export function registerSyncHandlers(
  server: IpcServer,
  transport: IpcTransport,
  engine: SyncEngineWorker,
): void {
  server.handle(SyncContracts.status, () => ({ status: engine.status() }));
  server.handle(SyncContracts.forceSync, async () => {
    await engine.forceSync();
    return { ok: true as const };
  });

  // Push status events to the webview
  engine.onStatusChange((status) => {
    transport.send(SyncContracts.statusEvent.name, { status });
  });
}
```

- [ ] **Step 5: Webview-side `DesktopSyncEngine`**

Create `packages/shared/platform/src/desktop/DesktopSyncEngine.ts`:

```ts
import { callIpc, SyncContracts } from "../ipc/contracts.ts";
import type {
  SyncEngine,
  SyncMutation,
  SyncStatus,
  Unsubscribe,
} from "../types/SyncEngine.types.ts";

const listeners = new Set<(s: SyncStatus) => void>();
let cachedStatus: SyncStatus = { kind: "offline" };

// Wire to the event channel.
function bindStatusEvents(): void {
  const bridge = (globalThis as unknown as { electrobun?: { on: (c: string, cb: (m: unknown) => void) => void } }).electrobun;
  if (!bridge) return;
  bridge.on(SyncContracts.statusEvent.name, (raw: unknown) => {
    const status = (raw as { status: SyncStatus }).status;
    cachedStatus = status;
    listeners.forEach((l) => l(status));
  });
}
bindStatusEvents();

export const DesktopSyncEngine: SyncEngine = {
  async enqueue(_m: SyncMutation) {
    // In V1, mutations are enqueued automatically inside createSqliteCRUDClient
    // via writeWithOutbox. This method is a no-op on desktop V1; web V2 uses it.
  },
  status: () => cachedStatus,
  async forceSync() {
    await callIpc(SyncContracts.forceSync, {});
  },
  onStatusChange(cb): Unsubscribe {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};
```

- [ ] **Step 6: Wire the engine into Bun main**

Modify `apps/desktop/main/index.ts`:

```ts
import { createSyncEngine } from "./services/sync/SyncEngine.ts";
import { createTusClient } from "./services/sync/TusClient.ts";
import { createNetworkProbe } from "./services/sync/NetworkProbe.ts";
import { registerSyncHandlers } from "./ipc/sync.ts";
import { getCurrentAccessToken } from "./ipc/auth.ts";
import { SYNCABLE_TABLES } from "../sync/syncable-tables.ts";

// ... after existing service init:
const network = createNetworkProbe({
  url: `${process.env.AVA_SUPABASE_URL ?? ""}/rest/v1/`,
  intervalMs: 5000,
});

const supabase = createSupabaseRestClient();
const tus = createTusClient();
const engine = createSyncEngine({
  db,
  rest: supabase,
  tus,
  network,
  getAccessToken: getCurrentAccessToken,
  syncableTables: SYNCABLE_TABLES as unknown as ReadonlyArray<string>,
  pushIntervalMs: 5_000,
  pullIntervalMs: 30_000,
  parquetIntervalMs: 60_000,
});

const transport = {
  on: (ch: string, cb: (m: unknown) => void) => window.ipc.on(ch, cb),
  send: (ch: string, m: unknown) => window.ipc.send(ch, m),
};
registerSyncHandlers(ipcServer, transport, engine);

engine.start();

// Stop on close:
window.on("closed", async () => {
  engine.stop();
  await duckdbSvc.close();
  db.close();
  Electrobun.app.quit();
});
```

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/ packages/shared/platform/
git commit -m "feat(sync): SyncEngine orchestrator + IPC + DesktopSyncEngine"
```

---

## Task 9: Sync status UI indicator

Small React component in the app chrome.

**Files:**
- Create: `packages/web/components/src/SyncStatusIndicator/SyncStatusIndicator.tsx`
- Test: `packages/web/components/src/SyncStatusIndicator/SyncStatusIndicator.test.tsx`
- Modify: app root layout to render the indicator

- [ ] **Step 1: Find the canonical location for app-chrome UI**

```bash
git grep -l "AppShell" -- 'src/'
```

The Mantine `AppShell` is likely in `src/components/AppShell/` or `src/layouts/`. Place the indicator next to its existing siblings (status indicators, navbar items).

- [ ] **Step 2: Write the failing component test**

Create the test in the same directory as the component (TBD per Step 1). Use Mantine + react-testing-library:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { SyncStatusIndicator } from "./SyncStatusIndicator.tsx";

function renderWithProviders(status: { kind: string }) {
  return render(
    <MantineProvider>
      <SyncStatusIndicator status={status as never} />
    </MantineProvider>,
  );
}

describe("SyncStatusIndicator", () => {
  it("renders 'offline' when kind=offline", () => {
    renderWithProviders({ kind: "offline" });
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it("renders 'syncing' when kind=online state=syncing", () => {
    renderWithProviders({
      kind: "online",
      state: "syncing",
      lastSyncedAt: 0,
      pendingRows: 3,
      pendingParquets: 1,
    });
    expect(screen.getByText(/syncing/i)).toBeInTheDocument();
    expect(screen.getByText(/4/)).toBeInTheDocument(); // 3 + 1 pending
  });

  it("renders 'idle' and last sync time when state=idle", () => {
    renderWithProviders({
      kind: "online",
      state: "idle",
      lastSyncedAt: Date.now() - 60_000,
      pendingRows: 0,
      pendingParquets: 0,
    });
    expect(screen.getByText(/synced/i)).toBeInTheDocument();
  });

  it("renders an error state", () => {
    renderWithProviders({
      kind: "error",
      lastError: "boom",
      pendingRows: 0,
      pendingParquets: 0,
    });
    expect(screen.getByText(/error|failed|boom/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement the component**

Create `packages/web/components/src/SyncStatusIndicator/SyncStatusIndicator.tsx`:

```tsx
import { Badge, Group, Loader, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconCloudOff, IconAlertTriangle } from "@tabler/icons-react";
import type { SyncStatus } from "@avandar/platform";

export function SyncStatusIndicator({ status }: { status: SyncStatus }) {
  if (status.kind === "offline") {
    return (
      <Group gap="xs">
        <IconCloudOff size={16} />
        <Text size="sm">Offline</Text>
      </Group>
    );
  }

  if (status.kind === "error") {
    return (
      <Tooltip label={status.lastError}>
        <Group gap="xs">
          <IconAlertTriangle size={16} color="var(--mantine-color-orange-6)" />
          <Text size="sm">Sync error</Text>
        </Group>
      </Tooltip>
    );
  }

  const totalPending = status.pendingRows + status.pendingParquets;

  if (status.state === "syncing") {
    return (
      <Group gap="xs">
        <Loader size="xs" />
        <Text size="sm">Syncing</Text>
        {totalPending > 0 ? <Badge size="xs">{totalPending}</Badge> : null}
      </Group>
    );
  }

  const minutesAgo = Math.floor((Date.now() - status.lastSyncedAt) / 60_000);
  return (
    <Group gap="xs">
      <IconCheck size={16} color="var(--mantine-color-green-6)" />
      <Text size="sm">
        Synced {minutesAgo <= 0 ? "just now" : `${minutesAgo}m ago`}
      </Text>
      {totalPending > 0 ? <Badge size="xs">{totalPending}</Badge> : null}
    </Group>
  );
}
```

- [ ] **Step 4: Run the test and confirm pass**

```bash
pnpm test:ui
```

- [ ] **Step 5: Wire into the app chrome**

In the app's main layout (find it via `AppShell.Header` grep), add:

```tsx
import { SyncStatusIndicator } from "@avandar/web-components/SyncStatusIndicator/SyncStatusIndicator.tsx";
import { usePlatform } from "@/config/platform/PlatformProvider.tsx";
import { useEffect, useState } from "react";

function HeaderSyncIndicator() {
  const { syncEngine } = usePlatform();
  const [status, setStatus] = useState(() => syncEngine.status());
  useEffect(() => syncEngine.onStatusChange(setStatus), [syncEngine]);
  return <SyncStatusIndicator status={status} />;
}
```

Render `<HeaderSyncIndicator />` somewhere in the header on both web (always offline-mode for V1) and desktop. Add `syncEngine` to the `PlatformImpls` returned from `PlatformProvider`.

- [ ] **Step 6: Smoke test**

```bash
pnpm dev:desktop
```

The indicator should appear in the header and reflect status changes.

- [ ] **Step 7: Commit**

```bash
git add packages/web/ src/
git commit -m "feat(sync): SyncStatusIndicator in app chrome"
```

---

## Task 10: Phase 3 acceptance checklist

- [ ] **Step 1: Round-trip smoke test**

1. Start the app online, login, make a small edit (e.g. rename a dashboard).
2. Verify the edit appears on Supabase (`pnpm db:sql-cmd "select name from dashboards where id = ...;"`).
3. Disconnect the network.
4. Make another edit. Verify it's visible inside the app (read-through to local SQLite).
5. Reconnect.
6. Verify the second edit appears on Supabase within ~30s.
7. From the *web* app (a different browser session), make a third edit.
8. Verify the third edit appears in the desktop app within ~30s.

- [ ] **Step 2: Conflict round-trip**

1. Disconnect network on desktop.
2. Edit row X on desktop.
3. Edit row X on web.
4. Reconnect.
5. Verify *one* version wins (per LWW), both clients converge.

- [ ] **Step 3: Parquet upload-on-reconnect**

1. Disconnect network.
2. Upload a CSV with "online storage allowed" enabled.
3. Verify the source + parquet are on disk locally.
4. Reconnect.
5. Verify the parquet appears in the Supabase Storage bucket within ~60s.

- [ ] **Step 4: Crash safety smoke**

Kill the process during a sync (Ctrl+C while syncing). Relaunch. Verify the outbox state is consistent (rows still pending, no orphan data).

- [ ] **Step 5: Tests green**

```bash
pnpm test
```

- [ ] **Step 6: Mark Phase 3 complete in the spec**

Update `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` Phase 3 line.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md
git commit -m "docs(spec): mark phase 3 complete"
```

---

## Out of Scope for Phase 3

- Field-level HLC / CRDT (V2)
- Supabase Realtime subscriptions (V2)
- Source-file sync to Supabase Storage (V2; only parquet syncs in V1)
- Parquet pull from Supabase Storage on fresh install (V2)
- Content-hash deduplication (V2)
- Disk-pressure GC (V2 — Phase 2 introduced the `dataset_blob_index`)
- Logger desktop sink, in-app bug report (Phase 4)

---

## Risks Specific to Phase 3

| Risk | Mitigation in this phase |
|---|---|
| Race condition between push and pull on the same row (push starts, server returns conflict, pull arrives mid-flight) | Per-row sync is sequential within a loop iteration; concurrent push+pull cycles can interleave but the LWW resolution is idempotent. Document this in the SyncEngine code; integration-test the scenario explicitly in Task 8. |
| Outbox grows unbounded if upstream is permanently broken | Surface in the SyncStatusIndicator; add a "clear failed sync items" admin action in V2. For V1, expect the user to escalate when they see a persistent error. |
| TUS resumable upload state diverges between local `tus_upload_url` and Supabase Storage's actual state | The `HEAD` step at upload resume re-reads server-side offset before sending bytes; bytes that overlap are idempotent at the byte level. If `HEAD` returns 404 (the resumable URL expired), clear it and restart. Implement this in Task 7 Step 4. |
| LWW silently drops user edits when clock skew is severe | Both `_local_updated_at` and server `updated_at` come from the same machine's wall clock at write time — meaningfully wrong only if the machine's clock is wrong by minutes. For V1, accept this; V2's HLC fixes it. |
| Schema drift: a new Supabase column appears that desktop SQLite doesn't have — pulled rows fail to insert | Detected at runtime as a SQLite `no such column` error. The generator/CI drift check (Phase 2) is the front-line defense. If a column is missing, add it to the manifest's generated migration and redeploy. |
