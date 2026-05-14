# Electrobun Desktop — Phase 1: Platform Abstractions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md`

**Goal:** Introduce the five platform abstraction interfaces (`DuckDbClient`, `RdbClient`, `DatasetBlobStore`, `AuthProvider`, `SyncEngine`) and the `createRdbCRUDClient` umbrella factory; migrate every existing Supabase CRUD client to the new factory **without changing any observable behavior on web or desktop**.

**Architecture:** A new `@avandar/platform` package under `packages/shared/platform/` declares the interfaces, the `isDesktop()` runtime check, and web-side adapter implementations (thin wrappers over today's code). Each existing client file in `src/clients/**` swaps `createSupabaseCRUDClient(...)` for `createRdbCRUDClient(...)`; on web this resolves to the existing Supabase implementation, so behavior is unchanged. Desktop continues to behave as in Phase 0 (it's still pointing at the same Vite build, and `createRdbCRUDClient` resolves to the same Supabase implementation until Phase 2 replaces it).

**Tech Stack:** TypeScript, vitest, existing `@avandar/clients` package conventions.

**Phase exit criteria:**
1. `@avandar/platform` package exists with all five interfaces, fully typed.
2. `createRdbCRUDClient` exists and routes to `createSupabaseCRUDClient` on both web and desktop in Phase 1.
3. Every `createSupabaseCRUDClient(...)` call site in the codebase has been migrated to `createRdbCRUDClient(...)`.
4. `pnpm test` is green.
5. `pnpm dev` and `pnpm dev:desktop` both work and behave **identically** to before this phase.

**Honest framing:** This is a mechanical refactor with strong test coverage. The interface definitions are the only "new" code; the client-file migration is find/replace with type-checking.

---

## File Structure

**New package:** `packages/shared/platform/`
- `packages/shared/platform/package.json`
- `packages/shared/platform/tsconfig.json`
- `packages/shared/platform/vitest.config.ts`
- `packages/shared/platform/src/index.ts` — re-exports
- `packages/shared/platform/src/isDesktop.ts` — runtime check
- `packages/shared/platform/src/isDesktop.test.ts`
- `packages/shared/platform/src/types/DuckDbClient.types.ts`
- `packages/shared/platform/src/types/RdbClient.types.ts`
- `packages/shared/platform/src/types/DatasetBlobStore.types.ts`
- `packages/shared/platform/src/types/AuthProvider.types.ts`
- `packages/shared/platform/src/types/SyncEngine.types.ts`
- `packages/shared/platform/src/types/Platform.types.ts` — `Platform` enum / discriminated union

**New factory (lives next to existing clients):**
- `packages/shared/clients/src/RdbCRUDClient/createRdbCRUDClient.ts`
- `packages/shared/clients/src/RdbCRUDClient/createRdbCRUDClient.test.ts`
- `packages/shared/clients/src/RdbCRUDClient/RdbCRUDClient.types.ts`

**Modified files:**
- `packages/shared/clients/src/index.ts` — export `createRdbCRUDClient` and types
- `packages/shared/clients/package.json` — add `@avandar/platform` workspace dep
- `pnpm-workspace.yaml` — no change (already covers `packages/shared/*`)
- Every `src/clients/**/*Client.ts` file using `createSupabaseCRUDClient` — swap to `createRdbCRUDClient`

---

## Task 1: Scaffold `@avandar/platform` workspace package

**Files:**
- Create: `packages/shared/platform/package.json`
- Create: `packages/shared/platform/tsconfig.json`
- Create: `packages/shared/platform/vitest.config.ts`
- Create: `packages/shared/platform/src/index.ts` (empty for now)

- [ ] **Step 1: Create the package manifest**

Create `packages/shared/platform/package.json`:

```json
{
  "name": "@avandar/platform",
  "version": "0.1.0",
  "description": "Platform abstraction interfaces and platform-detection helpers shared across web and desktop",
  "license": "CPAL-1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "~5.9.3",
    "vitest": "^3.2.4"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
```

- [ ] **Step 2: Create the TypeScript config**

Create `packages/shared/platform/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "baseUrl": "./src",
    "paths": {
      "@platform/*": ["./*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create the vitest config**

Create `packages/shared/platform/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@platform": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
```

- [ ] **Step 4: Create the empty index**

Create `packages/shared/platform/src/index.ts`:

```ts
// Re-exports populated in later tasks.
export {};
```

- [ ] **Step 5: Install and verify**

From repo root:

```bash
pnpm install
pnpm --filter @avandar/platform type-check
```

Expected: pnpm picks up the new workspace package; `type-check` passes on empty source.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/platform/ pnpm-lock.yaml
git commit -m "chore(platform): scaffold @avandar/platform workspace package"
```

---

## Task 2: `Platform` type and `isDesktop()` helper

**Files:**
- Create: `packages/shared/platform/src/types/Platform.types.ts`
- Create: `packages/shared/platform/src/isDesktop.ts`
- Test: `packages/shared/platform/src/isDesktop.test.ts`

- [ ] **Step 1: Define the `Platform` discriminated union**

Create `packages/shared/platform/src/types/Platform.types.ts`:

```ts
export type Platform = "web" | "desktop";
```

- [ ] **Step 2: Write the failing test for `isDesktop`**

Create `packages/shared/platform/src/isDesktop.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { isDesktop } from "./isDesktop.ts";

describe("isDesktop", () => {
  afterEach(() => {
    // jsdom carries window between tests; reset the marker each time
    delete (window as unknown as Record<string, unknown>).__AVA_PLATFORM__;
  });

  it("returns false when window has no platform marker", () => {
    expect(isDesktop()).toBe(false);
  });

  it("returns true when window.__AVA_PLATFORM__ is 'desktop'", () => {
    (window as unknown as Record<string, unknown>).__AVA_PLATFORM__ =
      "desktop";
    expect(isDesktop()).toBe(true);
  });

  it("returns false when window is undefined (SSR / Node)", () => {
    const originalWindow = globalThis.window;
    // simulate non-browser environment
    (globalThis as unknown as Record<string, unknown>).window = undefined;
    try {
      expect(isDesktop()).toBe(false);
    } finally {
      (globalThis as unknown as Record<string, unknown>).window =
        originalWindow;
    }
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/platform test
```

Expected: FAIL with "Cannot find module './isDesktop.ts'".

- [ ] **Step 4: Implement `isDesktop`**

Create `packages/shared/platform/src/isDesktop.ts`:

```ts
export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (window as unknown as { __AVA_PLATFORM__?: string }).__AVA_PLATFORM__ ===
    "desktop"
  );
}
```

- [ ] **Step 5: Run the test and confirm it passes**

```bash
pnpm --filter @avandar/platform test
```

Expected: 3 tests pass.

- [ ] **Step 6: Export from the package index**

Update `packages/shared/platform/src/index.ts`:

```ts
export { isDesktop } from "./isDesktop.ts";
export type { Platform } from "./types/Platform.types.ts";
```

- [ ] **Step 7: Type-check**

```bash
pnpm --filter @avandar/platform type-check
```

Expected: passes.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/platform/
git commit -m "feat(platform): add Platform type and isDesktop() helper"
```

---

## Task 3: Define the five abstraction interfaces

Each interface is a pure type. No runtime code yet. Tests for interfaces are *type-level* — we use `expectTypeOf` from vitest to assert the shape matches expectations and to lock down breaking changes.

**Files:**
- Create: `packages/shared/platform/src/types/DuckDbClient.types.ts`
- Create: `packages/shared/platform/src/types/RdbClient.types.ts`
- Create: `packages/shared/platform/src/types/DatasetBlobStore.types.ts`
- Create: `packages/shared/platform/src/types/AuthProvider.types.ts`
- Create: `packages/shared/platform/src/types/SyncEngine.types.ts`
- Test: `packages/shared/platform/src/types/interfaces.test-d.ts`

- [ ] **Step 1: Define `DuckDbClient`**

Create `packages/shared/platform/src/types/DuckDbClient.types.ts`:

```ts
/**
 * Platform-agnostic DuckDB client.
 *
 * On web this wraps duckdb-wasm in the browser. On desktop this is an IPC
 * client that talks to a native DuckDB instance running in the Bun main
 * process (Phase 2). Consumers depend only on this interface.
 */
export interface DuckDbClient {
  runStructuredQuery<TRow>(query: StructuredQuery): Promise<TRow[]>;
  runRawQuery<TRow>(sql: string, params?: ReadonlyArray<unknown>): Promise<TRow[]>;
  loadParquetFromDatasetBlobStore(datasetId: string): Promise<void>;
  loadFromUpload(
    source: UploadSource,
    options: DatasetImportOptions,
  ): Promise<DatasetImportResult>;
}

export type StructuredQuery = {
  // Existing structured-query type lives in src/clients/DuckDbClient — keep
  // its actual shape import-compatible. In Phase 1 this is a passthrough alias
  // declared as `unknown` to avoid a circular dep with src/. Replaced with the
  // real type in Phase 2 when the web adapter is wired through.
  readonly _placeholder: unknown;
};

export type UploadSource =
  | { kind: "browser-file"; file: File }
  | { kind: "filesystem-path"; path: string };

export type DatasetImportOptions = {
  readonly datasetId: string;
  readonly format: "csv" | "xlsx" | "parquet";
  readonly delimiter?: string;
  readonly hasHeader?: boolean;
};

export type DatasetImportResult = {
  readonly datasetId: string;
  readonly rowCount: number;
  readonly schema: ReadonlyArray<{ name: string; type: string }>;
};
```

Note on `StructuredQuery`: the existing concrete type lives in `src/clients/DuckDbClient/` and is intentionally not imported here to avoid a `packages/shared` → `src/` dependency. Phase 2 will move the canonical type into `@avandar/platform` and remove this placeholder. The interface still constrains the *shape* of consumers; only the type of the `query` argument is loosened.

- [ ] **Step 2: Define `RdbClient`**

Create `packages/shared/platform/src/types/RdbClient.types.ts`:

```ts
/**
 * Platform-agnostic relational database client.
 *
 * On web this wraps the Supabase JS client. On desktop (Phase 2+) this is an
 * IPC client that talks to bun:sqlite in the Bun main process.
 */
export interface RdbClient {
  query<TRow>(model: ModelName, filter: RdbFilter): Promise<ReadonlyArray<TRow>>;
  upsert<TRow>(model: ModelName, row: TRow): Promise<TRow>;
  delete(model: ModelName, id: string): Promise<void>;
  transaction<TResult>(fn: (tx: RdbTx) => Promise<TResult>): Promise<TResult>;
}

export interface RdbTx {
  query<TRow>(model: ModelName, filter: RdbFilter): Promise<ReadonlyArray<TRow>>;
  upsert<TRow>(model: ModelName, row: TRow): Promise<TRow>;
  delete(model: ModelName, id: string): Promise<void>;
}

export type ModelName = string & { readonly __brand: "ModelName" };

export type RdbFilter = {
  readonly eq?: Readonly<Record<string, unknown>>;
  readonly in?: Readonly<Record<string, ReadonlyArray<unknown>>>;
  readonly orderBy?: ReadonlyArray<{
    readonly column: string;
    readonly direction: "asc" | "desc";
  }>;
  readonly limit?: number;
  readonly offset?: number;
};

export function asModelName(name: string): ModelName {
  return name as ModelName;
}
```

- [ ] **Step 3: Define `DatasetBlobStore`**

Create `packages/shared/platform/src/types/DatasetBlobStore.types.ts`:

```ts
/**
 * Platform-agnostic store for dataset bulk data (parquet files, raw source
 * uploads). On web this wraps Dexie + optional Supabase Storage. On desktop
 * (Phase 2+) this wraps the local filesystem under the per-OS-user app data
 * directory.
 */
export interface DatasetBlobStore {
  put(
    key: DatasetBlobKey,
    bytes: Uint8Array | ReadableStream<Uint8Array>,
  ): Promise<void>;
  get(key: DatasetBlobKey): Promise<ReadableStream<Uint8Array>>;
  delete(key: DatasetBlobKey): Promise<void>;
  exists(key: DatasetBlobKey): Promise<boolean>;
  list(prefix: DatasetBlobKey): Promise<ReadonlyArray<DatasetBlobKey>>;
  stat(key: DatasetBlobKey): Promise<DatasetBlobStat | null>;
}

export type DatasetBlobKey = string & { readonly __brand: "DatasetBlobKey" };

export type DatasetBlobStat = {
  readonly sizeBytes: number;
  readonly mtimeMs: number;
};

export function asDatasetBlobKey(key: string): DatasetBlobKey {
  return key as DatasetBlobKey;
}

/**
 * Helpers for assembling well-formed keys, used by both backends.
 */
export const DatasetBlobKeys = {
  source(workspaceId: string, datasetId: string, ext: string): DatasetBlobKey {
    return asDatasetBlobKey(
      `workspaces/${workspaceId}/datasets/${datasetId}/source.${ext}`,
    );
  },
  parquet(workspaceId: string, datasetId: string): DatasetBlobKey {
    return asDatasetBlobKey(
      `workspaces/${workspaceId}/datasets/${datasetId}/data.parquet`,
    );
  },
  meta(workspaceId: string, datasetId: string): DatasetBlobKey {
    return asDatasetBlobKey(
      `workspaces/${workspaceId}/datasets/${datasetId}/meta.json`,
    );
  },
};
```

- [ ] **Step 4: Define `AuthProvider`**

Create `packages/shared/platform/src/types/AuthProvider.types.ts`:

```ts
/**
 * Platform-agnostic auth provider.
 *
 * On web this wraps Supabase JS auth (sessions in localStorage). On desktop
 * (Phase 2+) refresh tokens live in the OS keychain via Bun FFI.
 */
export interface AuthProvider {
  getSession(): Promise<Session | null>;
  signIn(credentials: AuthCredentials): Promise<Session>;
  signOut(): Promise<void>;
  refreshIfNeeded(): Promise<void>;
  onAuthChange(callback: (session: Session | null) => void): Unsubscribe;
}

export type AuthCredentials =
  | { kind: "password"; email: string; password: string }
  | { kind: "magic-link"; email: string };

export type Session = {
  readonly userId: string;
  readonly email: string;
  readonly accessToken: string;
  readonly accessTokenExpiresAt: number; // ms epoch
  readonly mode: "online" | "offline-cached";
};

export type Unsubscribe = () => void;
```

- [ ] **Step 5: Define `SyncEngine`**

Create `packages/shared/platform/src/types/SyncEngine.types.ts`:

```ts
/**
 * Platform-agnostic sync engine surface.
 *
 * On web (Phase 1) this is a no-op stub — web behavior is unchanged.
 * On desktop (Phase 3) this is the real outbox-based engine running in Bun
 * main.
 */
export interface SyncEngine {
  enqueue(mutation: SyncMutation): Promise<void>;
  status(): SyncStatus;
  forceSync(): Promise<void>;
  onStatusChange(callback: (status: SyncStatus) => void): Unsubscribe;
}

export type SyncMutation = {
  readonly tableName: string;
  readonly rowId: string;
  readonly op: "insert" | "update" | "delete";
  readonly payload: Readonly<Record<string, unknown>>;
};

export type SyncStatus =
  | { readonly kind: "offline" }
  | {
      readonly kind: "online";
      readonly state: "idle" | "syncing";
      readonly lastSyncedAt: number;
      readonly pendingRows: number;
      readonly pendingParquets: number;
      readonly bytesUploading?: number;
    }
  | {
      readonly kind: "error";
      readonly lastError: string;
      readonly pendingRows: number;
      readonly pendingParquets: number;
    };

export type Unsubscribe = () => void;
```

- [ ] **Step 6: Write the interface-shape test**

Create `packages/shared/platform/src/types/interfaces.test-d.ts`:

```ts
import { expectTypeOf, test } from "vitest";
import type { AuthProvider, Session } from "./AuthProvider.types.ts";
import type { DatasetBlobKey, DatasetBlobStore } from "./DatasetBlobStore.types.ts";
import type { DuckDbClient } from "./DuckDbClient.types.ts";
import type { RdbClient, RdbFilter } from "./RdbClient.types.ts";
import type { SyncEngine, SyncStatus } from "./SyncEngine.types.ts";

test("DuckDbClient exposes required methods", () => {
  expectTypeOf<DuckDbClient>().toHaveProperty("runStructuredQuery");
  expectTypeOf<DuckDbClient>().toHaveProperty("runRawQuery");
  expectTypeOf<DuckDbClient>().toHaveProperty("loadParquetFromDatasetBlobStore");
  expectTypeOf<DuckDbClient>().toHaveProperty("loadFromUpload");
});

test("RdbClient exposes required methods", () => {
  expectTypeOf<RdbClient>().toHaveProperty("query");
  expectTypeOf<RdbClient>().toHaveProperty("upsert");
  expectTypeOf<RdbClient>().toHaveProperty("delete");
  expectTypeOf<RdbClient>().toHaveProperty("transaction");
});

test("RdbFilter accepts common shapes", () => {
  const filter: RdbFilter = {
    eq: { id: "abc" },
    in: { workspaceId: ["a", "b"] },
    orderBy: [{ column: "createdAt", direction: "desc" }],
    limit: 10,
    offset: 0,
  };
  expectTypeOf(filter).toMatchTypeOf<RdbFilter>();
});

test("DatasetBlobStore exposes required methods", () => {
  expectTypeOf<DatasetBlobStore>().toHaveProperty("put");
  expectTypeOf<DatasetBlobStore>().toHaveProperty("get");
  expectTypeOf<DatasetBlobStore>().toHaveProperty("delete");
  expectTypeOf<DatasetBlobStore>().toHaveProperty("exists");
  expectTypeOf<DatasetBlobStore>().toHaveProperty("list");
  expectTypeOf<DatasetBlobStore>().toHaveProperty("stat");
});

test("DatasetBlobKey is branded", () => {
  expectTypeOf<DatasetBlobKey>().not.toEqualTypeOf<string>();
});

test("AuthProvider exposes required methods", () => {
  expectTypeOf<AuthProvider>().toHaveProperty("getSession");
  expectTypeOf<AuthProvider>().toHaveProperty("signIn");
  expectTypeOf<AuthProvider>().toHaveProperty("signOut");
  expectTypeOf<AuthProvider>().toHaveProperty("refreshIfNeeded");
  expectTypeOf<AuthProvider>().toHaveProperty("onAuthChange");
});

test("Session.mode distinguishes online vs offline-cached", () => {
  expectTypeOf<Session["mode"]>().toEqualTypeOf<"online" | "offline-cached">();
});

test("SyncEngine exposes required methods", () => {
  expectTypeOf<SyncEngine>().toHaveProperty("enqueue");
  expectTypeOf<SyncEngine>().toHaveProperty("status");
  expectTypeOf<SyncEngine>().toHaveProperty("forceSync");
  expectTypeOf<SyncEngine>().toHaveProperty("onStatusChange");
});

test("SyncStatus is a discriminated union with the expected kinds", () => {
  type Kinds = SyncStatus["kind"];
  expectTypeOf<Kinds>().toEqualTypeOf<"offline" | "online" | "error">();
});
```

- [ ] **Step 7: Update the package index**

Edit `packages/shared/platform/src/index.ts`:

```ts
export { isDesktop } from "./isDesktop.ts";
export type { Platform } from "./types/Platform.types.ts";
export type {
  DuckDbClient,
  StructuredQuery,
  UploadSource,
  DatasetImportOptions,
  DatasetImportResult,
} from "./types/DuckDbClient.types.ts";
export type {
  RdbClient,
  RdbTx,
  ModelName,
  RdbFilter,
} from "./types/RdbClient.types.ts";
export { asModelName } from "./types/RdbClient.types.ts";
export type {
  DatasetBlobStore,
  DatasetBlobKey,
  DatasetBlobStat,
} from "./types/DatasetBlobStore.types.ts";
export {
  asDatasetBlobKey,
  DatasetBlobKeys,
} from "./types/DatasetBlobStore.types.ts";
export type {
  AuthProvider,
  AuthCredentials,
  Session,
  Unsubscribe,
} from "./types/AuthProvider.types.ts";
export type {
  SyncEngine,
  SyncMutation,
  SyncStatus,
} from "./types/SyncEngine.types.ts";
```

- [ ] **Step 8: Run tests & type-check**

```bash
pnpm --filter @avandar/platform test
pnpm --filter @avandar/platform type-check
```

Expected: green.

- [ ] **Step 9: Commit**

```bash
git add packages/shared/platform/
git commit -m "feat(platform): define DuckDbClient/RdbClient/DatasetBlobStore/AuthProvider/SyncEngine interfaces"
```

---

## Task 4: `createRdbCRUDClient` umbrella factory

The factory accepts a spec, inspects `isDesktop()`, and currently *always* returns the Supabase-backed client (because the SQLite-backed client doesn't exist yet — that's Phase 2). The point of doing this in Phase 1 is so that every client file already calls the umbrella; switching the desktop implementation later is one-line in this factory.

**Files:**
- Create: `packages/shared/clients/src/RdbCRUDClient/RdbCRUDClient.types.ts`
- Create: `packages/shared/clients/src/RdbCRUDClient/createRdbCRUDClient.ts`
- Test: `packages/shared/clients/src/RdbCRUDClient/createRdbCRUDClient.test.ts`
- Modify: `packages/shared/clients/src/index.ts`
- Modify: `packages/shared/clients/package.json`

- [ ] **Step 1: Add `@avandar/platform` as a workspace dependency**

Edit `packages/shared/clients/package.json` — under `dependencies`, add:

```json
"@avandar/platform": "workspace:*",
```

Run from repo root:

```bash
pnpm install
```

- [ ] **Step 2: Define `RdbCRUDClient` spec type**

Create `packages/shared/clients/src/RdbCRUDClient/RdbCRUDClient.types.ts`:

```ts
import type { SupabaseCRUDModelSpec } from "@clients/SupabaseCRUDClient/SupabaseCRUDClient.types.ts";

/**
 * Spec accepted by `createRdbCRUDClient`. In Phase 1, this is a structural
 * superset of `SupabaseCRUDModelSpec` — minus the `dbClient` field, which
 * the umbrella factory injects when delegating to Supabase. Phase 2 adds
 * SQLite-specific fields here.
 */
export type RdbCRUDModelSpec<M> = Omit<SupabaseCRUDModelSpec<M>, "dbClient">;
```

- [ ] **Step 3: Write the failing test**

Create `packages/shared/clients/src/RdbCRUDClient/createRdbCRUDClient.test.ts`:

```ts
import { isDesktop } from "@avandar/platform";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@avandar/platform", async () => {
  const actual =
    await vi.importActual<typeof import("@avandar/platform")>("@avandar/platform");
  return { ...actual, isDesktop: vi.fn(() => false) };
});

import { createRdbCRUDClient } from "./createRdbCRUDClient.ts";

describe("createRdbCRUDClient", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to Supabase factory on web", () => {
    (isDesktop as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const client = createRdbCRUDClient({
      modelName: "TestModel",
      tableName: "test_models",
      dbTablePrimaryKey: "id",
      parsers: { Read: (r) => r, Insert: (r) => r, Update: (r) => r } as never,
    } as never);

    expect(client).toBeDefined();
    // smoke: the returned client should expose the canonical CRUD surface
    expect(typeof (client as { get?: unknown }).get).toBe("function");
  });

  it("throws a clear error on desktop until Phase 2 wires the SQLite backend", () => {
    (isDesktop as ReturnType<typeof vi.fn>).mockReturnValue(true);

    expect(() =>
      createRdbCRUDClient({
        modelName: "TestModel",
        tableName: "test_models",
        dbTablePrimaryKey: "id",
        parsers: { Read: (r) => r, Insert: (r) => r, Update: (r) => r } as never,
      } as never),
    ).toThrow(/desktop backend not implemented/i);
  });
});
```

- [ ] **Step 4: Run the test and confirm it fails**

```bash
pnpm --filter @avandar/clients test
```

Expected: FAIL — file does not exist.

- [ ] **Step 5: Implement `createRdbCRUDClient`**

Create `packages/shared/clients/src/RdbCRUDClient/createRdbCRUDClient.ts`:

```ts
import { isDesktop } from "@avandar/platform";
import { createSupabaseCRUDClient } from "@clients/SupabaseCRUDClient/createSupabaseCRUDClient.ts";
import type { RdbCRUDModelSpec } from "./RdbCRUDClient.types.ts";

/**
 * Platform-aware CRUD client factory. Resolves to:
 *   - web:     Supabase-backed client (existing behavior)
 *   - desktop: SQLite-backed client (Phase 2; currently throws)
 *
 * Consumers pass the spec WITHOUT a `dbClient` field; the factory injects
 * the appropriate underlying client per platform.
 */
export function createRdbCRUDClient<M>(spec: RdbCRUDModelSpec<M>) {
  if (isDesktop()) {
    throw new Error(
      "createRdbCRUDClient: desktop backend not implemented in Phase 1 — see Phase 2 plan",
    );
  }

  return createSupabaseCRUDClient<M>({
    ...spec,
    // The caller doesn't pass `dbClient`; we inject the canonical web one.
    dbClient: getWebDbClient(),
  } as never);
}

function getWebDbClient() {
  // Late-import to keep this factory environment-agnostic. The web app's
  // single Supabase client is constructed in `src/db/supabase/AvaSupabase.ts`;
  // we import it dynamically so this file can be type-checked from `packages/`
  // without pulling `src/` into the dependency graph.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("../../../../../src/db/supabase/AvaSupabase.ts") as {
    AvaSupabase: { DB: unknown };
  };
  return mod.AvaSupabase.DB;
}
```

**Note on `getWebDbClient`:** the `require()` from `packages/` → `src/` looks ugly, and it is. The alternative is to require the caller to keep passing `dbClient` explicitly during Phase 1, which would defeat the migration's purpose. The dynamic import is acceptable as a *transitional* shim — Phase 2 moves the canonical Supabase client construction into a place reachable without crossing the package boundary. Flag this in the Phase 2 plan (it is flagged there).

- [ ] **Step 6: Run the test and confirm it passes**

```bash
pnpm --filter @avandar/clients test
```

Expected: 2 tests pass.

- [ ] **Step 7: Export from the package index**

Edit `packages/shared/clients/src/index.ts` — add:

```ts
// Rdb (platform-aware) CRUD client
export { createRdbCRUDClient } from "@clients/RdbCRUDClient/createRdbCRUDClient.ts";
export type { RdbCRUDModelSpec } from "@clients/RdbCRUDClient/RdbCRUDClient.types.ts";
```

- [ ] **Step 8: Type-check**

```bash
pnpm --filter @avandar/clients type-check
```

Expected: passes.

- [ ] **Step 9: Commit**

```bash
git add packages/shared/clients/
git commit -m "feat(clients): add createRdbCRUDClient umbrella factory"
```

---

## Task 5: Migrate every Supabase CRUD client call site

This is a mechanical refactor across the codebase. Each client file that calls `createSupabaseCRUDClient(...)` with `{ dbClient: AvaSupabase.DB, ...spec }` becomes a call to `createRdbCRUDClient(spec)` (no `dbClient` field).

**Files:** every file matching `src/clients/**/*Client.ts` that calls `createSupabaseCRUDClient`.

- [ ] **Step 1: Enumerate the call sites**

```bash
git grep -l "createSupabaseCRUDClient" src/clients/
```

Record the list (typically ~20 files per the spec). Each gets the same mechanical edit.

- [ ] **Step 2: Migrate one client as a template**

Pick the simplest client in the list (e.g. one that doesn't add custom queries/mutations). Open it. The current shape will look like:

```ts
import { createSupabaseCRUDClient, createServiceClient } from "@avandar/clients";
import { AvaSupabase } from "@/db/supabase/AvaSupabase.ts";
// ...

export const FooClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    modelName: "Foo",
    tableName: "foos",
    dbTablePrimaryKey: "id",
    parsers: FooParsers,
  }),
);
```

Change it to:

```ts
import { createRdbCRUDClient } from "@avandar/clients";
// AvaSupabase import removed if unused elsewhere in the file
// ...

export const FooClient = createUsableServiceClient(
  createRdbCRUDClient({
    modelName: "Foo",
    tableName: "foos",
    dbTablePrimaryKey: "id",
    parsers: FooParsers,
  }),
);
```

- [ ] **Step 3: Verify the migrated client compiles and its tests pass**

```bash
pnpm type-check
pnpm test:clients
pnpm test:frontend
```

Expected: green.

- [ ] **Step 4: Commit the template migration on its own**

```bash
git add <the one migrated file>
git commit -m "refactor(clients): migrate FooClient to createRdbCRUDClient"
```

This single-file commit documents the canonical change pattern for reviewers.

- [ ] **Step 5: Migrate the remaining clients in batches of ~5**

For the remaining files from Step 1, apply the same mechanical edit in batches:

```bash
git grep -l "createSupabaseCRUDClient" src/clients/
# pick 5 files, edit them
pnpm type-check
pnpm test
git add <those 5 files>
git commit -m "refactor(clients): migrate <names> to createRdbCRUDClient"
```

Repeat until `git grep -l "createSupabaseCRUDClient" src/clients/` returns no matches.

- [ ] **Step 6: Verify no stragglers remain**

```bash
git grep "createSupabaseCRUDClient" -- 'src/**'
```

Expected: zero matches. If any remain, migrate them.

```bash
git grep "AvaSupabase.DB" -- 'src/clients/**'
```

Expected: zero matches. Stragglers indicate an incomplete migration.

- [ ] **Step 7: Run the full test suite**

```bash
pnpm test
```

Expected: green.

- [ ] **Step 8: Manual smoke test — web**

```bash
pnpm dev
```

Log in, navigate to a few data views (datasets list, dashboards list, anything that exercises a migrated client). Confirm everything still works.

- [ ] **Step 9: Manual smoke test — desktop**

```bash
pnpm dev:desktop
```

Confirm login works and the same data views render. Phase 1 desktop still routes through Supabase (since `createRdbCRUDClient` on desktop falls through to Supabase in Phase 1 — the desktop branch only throws when explicitly entered via `isDesktop()`).

**Wait** — re-read Task 4 Step 5: in Phase 1, `createRdbCRUDClient` on desktop *throws*. Before doing the desktop smoke test, you must decide:

  - **Option A (recommended):** Make the Phase 1 desktop path fall through to Supabase (not throw). This keeps the desktop shell usable through Phase 1. To do this, edit `createRdbCRUDClient` to remove the `throw` and fall through to the Supabase factory regardless of platform during Phase 1. Update the test accordingly. Add a TODO comment referencing Phase 2.
  - **Option B:** Skip the desktop smoke test in Phase 1; resume desktop testing in Phase 2 when the SQLite client lands.

Pick Option A. Apply the change:

```ts
export function createRdbCRUDClient<M>(spec: RdbCRUDModelSpec<M>) {
  // Phase 1: desktop falls through to Supabase. Phase 2 introduces the
  // SQLite-backed branch here:
  //   if (isDesktop()) return createSqliteCRUDClient(spec);
  return createSupabaseCRUDClient<M>({
    ...spec,
    dbClient: getWebDbClient(),
  } as never);
}
```

Update the test in Step 3 of Task 4 to match (the second test case should now confirm desktop *also* delegates to Supabase, with a comment noting the Phase 2 cutover).

- [ ] **Step 10: Re-run tests after the Option A change**

```bash
pnpm --filter @avandar/clients test
pnpm dev:desktop
```

Expected: tests green, desktop login + data browsing works.

- [ ] **Step 11: Commit**

```bash
git add packages/shared/clients/src/RdbCRUDClient/
git commit -m "refactor(clients): fall through to Supabase on desktop in Phase 1"
```

---

## Task 6: Phase 1 acceptance checklist

- [ ] **Step 1: Confirm no leftover Supabase factory call sites**

```bash
git grep "createSupabaseCRUDClient" -- 'src/'
```

Expected: zero results.

- [ ] **Step 2: Full test sweep**

```bash
pnpm test
```

Expected: green.

- [ ] **Step 3: Type-check sweep**

```bash
pnpm type-check
```

Expected: clean.

- [ ] **Step 4: Web smoke test**

```bash
pnpm dev
```

Login + browse datasets + browse dashboards. Compare against a recording / memory of pre-Phase-1 behavior. Should be indistinguishable.

- [ ] **Step 5: Desktop smoke test**

```bash
pnpm dev:desktop
```

Same flow inside the Electrobun window.

- [ ] **Step 6: Mark Phase 1 complete in the spec**

Edit `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` Phase 1 line in the Phased Rollout section; append "— completed YYYY-MM-DD".

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md
git commit -m "docs(spec): mark phase 1 complete"
```

---

## Out of Scope for Phase 1

- Any SQLite implementation (Phase 2)
- Any IPC contracts or Bun-main service implementations (Phase 2)
- Any migration generator or `SYNCABLE_TABLES` manifest (Phase 2)
- The `createSqliteCRUDClient` factory (Phase 2)
- Replacing the dynamic `require("../../../../../src/db/supabase/AvaSupabase.ts")` shim with a clean import (Phase 2 cleans this up; flagged as a known transitional ugliness)

---

## Risks Specific to Phase 1

| Risk | Mitigation in this phase |
|---|---|
| Mechanical migration misses a custom-typed client and breaks type-check | `pnpm type-check` is part of the acceptance checklist; the migration is committed in small batches so a regression is easy to bisect. |
| The dynamic `require` shim in `getWebDbClient` fails under bundling | Verify in Task 5 Step 8 (web smoke test) and Task 5 Step 9 (desktop smoke test). If it breaks, fall back to keeping `dbClient` explicit in each client file for Phase 1 and absorb the spec ugliness; revisit cleanly in Phase 2. |
| A client file uses `AvaSupabase.DB` for something *other* than CRUD (e.g. raw RPC) | Check the migrated files for residual usage. Those non-CRUD usages stay as-is in Phase 1; they'll be addressed in Phase 2 when the Supabase client wrapping gets restructured. |
