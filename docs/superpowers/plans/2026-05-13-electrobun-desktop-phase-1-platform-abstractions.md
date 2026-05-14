# Electrobun Desktop — Phase 1: Platform Abstractions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Per-step test handoff:** After completing every Step in this plan, output an enumerated list (`1.`, `2.`, `3.`, …) of the exact actions the human partner should take to verify the just-completed Step — commands to run (copy-pasteable), files or UI to inspect, and the expected result for each. Do this for every Step, including "trivial" config/file-creation steps; never skip or summarize. The list is in addition to (not a replacement for) the Manual review checkpoint at the end of each Task.

**Spec:** `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md`
**Testing strategy:** `docs/superpowers/specs/2026-05-14-testing-strategy.md` — defines per-PR test groupings (G1.x) referenced in each Task below.

**Goal:** Introduce the five platform abstraction interfaces (`DuckDbClient`, `RdbClient`, `DatasetBlobStore`, `AuthProvider`, `SyncEngine`) and the `createRdbCRUDClient` umbrella factory; migrate every existing Supabase CRUD client to the new factory **without changing any observable behavior on web or desktop**.

**Architecture:** A new `@avandar/platform` package under `packages/shared/platform/` declares the interfaces, the `isDesktop()` runtime check, and web-side adapter implementations (thin wrappers over today's code). Each existing client file in `src/clients/**` swaps `createSupabaseCRUDClient(...)` for `createRdbCRUDClient(...)`; on web this resolves to the existing Supabase implementation, so behavior is unchanged. Desktop continues to behave as in Phase 0 (it's still pointing at the same Vite build, and `createRdbCRUDClient` resolves to the same Supabase implementation until Phase 2 replaces it).

**Tech Stack:** TypeScript, vitest, existing `@avandar/clients` package conventions.

**Phase exit criteria:**
1. `@avandar/platform` package exists with all five interfaces, fully typed.
2. `createRdbCRUDClient` exists and routes to `createSupabaseCRUDClient` on both web and desktop in Phase 1.
3. Every `createSupabaseCRUDClient(...)` call site in the codebase has been migrated to `createRdbCRUDClient(...)`.
4. Every `supabase.rpc(...)` call site (2 known: `DatasetClient.ts`, `WorkspaceClient.ts`) has been migrated to `serverApi.rpc(...)`, and `src/clients/APIClient.ts` internally delegates to `serverApi.invokeFunction(...)` (its public surface unchanged).
5. `pnpm test` is green.
6. `pnpm dev` and `pnpm dev:desktop` both work and behave **identically** to before this phase.

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
- `packages/shared/platform/src/types/ServerApiClient.types.ts`
- `packages/shared/platform/src/types/Platform.types.ts` — `Platform` enum / discriminated union

**New factory (lives next to existing clients):**
- `packages/shared/clients/src/RdbCRUDClient/createRdbCRUDClient.ts`
- `packages/shared/clients/src/RdbCRUDClient/createRdbCRUDClient.test.ts`
- `packages/shared/clients/src/RdbCRUDClient/RdbCRUDClient.types.ts`
- `packages/shared/clients/src/ServerApiClient/createServerApiClient.ts`
- `packages/shared/clients/src/ServerApiClient/createServerApiClient.test.ts`
- `packages/shared/clients/src/ServerApiClient/createBrowserServerApiClient.ts`
- `packages/shared/clients/src/ServerApiClient/createIpcServerApiClient.ts`  # Phase 1 = throwing stub; Phase 2 wires real IPC
- `packages/shared/clients/src/ServerApiClient/ServerApiClient.types.ts`

**Modified files:**
- `packages/shared/clients/src/index.ts` — export `createRdbCRUDClient` and types
- `packages/shared/clients/package.json` — add `@avandar/platform` workspace dep
- `pnpm-workspace.yaml` — no change (already covers `packages/shared/*`)
- Every `src/clients/**/*Client.ts` file using `createSupabaseCRUDClient` — swap to `createRdbCRUDClient`
- `src/clients/datasets/DatasetClient.ts` — swap `supabase.rpc(...)` call to `serverApi.rpc(...)`
- `src/clients/WorkspaceClient.ts` — swap `supabase.rpc(...)` call to `serverApi.rpc(...)`
- `src/clients/APIClient.ts` — rewire internal `sendHTTPRequest` to delegate to `serverApi.invokeFunction(...)`; public surface unchanged

---

## Task 1: Scaffold `@avandar/platform` workspace package

**PR boundaries:** 1 PR. New empty package; nothing imports it yet; web app behavior is unchanged. All scaffold files (package.json, tsconfig.json, vitest.config.ts, empty index.ts) are interdependent fragments of a single workspace registration and must ship together to type-check.

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

- [ ] **Step 6: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  pnpm --filter @avandar/platform type-check
  ```
  Expected: type-check passes on the empty source; `pnpm install` from Step 5 resolved the new workspace package without errors.

  **Verify:**
  - `packages/shared/platform/package.json` exists with name `@avandar/platform`, version `0.1.0`, `"type": "module"`, and `"exports": { ".": "./src/index.ts" }`
  - `packages/shared/platform/tsconfig.json` is strict, with the `@platform/*` path alias
  - `packages/shared/platform/vitest.config.ts` aliases `@platform` to `./src` and uses the `jsdom` environment
  - `packages/shared/platform/src/index.ts` exists (currently just `export {};`)
  - `pnpm-lock.yaml` was updated to register the new workspace package
  - No changes outside `packages/shared/platform/` and the lockfile

  **Manual smoke test (if applicable):**
  1. `pnpm dev`
  2. Open browser to localhost:5173, sign in
  3. Confirm the app loads exactly as before — this task adds no runtime code, so behavior must be unchanged.

  Expected: web app behavior identical to pre-phase-1.

  **Greenlight criteria:** all checks above pass before moving to Task 2. If anything fails, stop and report.

---

## Task 2: `Platform` type and `isDesktop()` helper

**Test groupings:** G1.1 (isDesktop branching + Platform type lock via expectTypeOf<Platform>().toEqualTypeOf<"web" | "desktop">() — locks against future widening).

**PR boundaries:** 1 PR. TDD red-green coupling: the failing `isDesktop.test.ts` Step and the `isDesktop.ts` implementation Step must ship together so `pnpm test` stays green. The `Platform.types.ts` type-only file is a tightly-coupled prerequisite consumed by both and belongs in the same PR.

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

- [ ] **Step 8: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  pnpm --filter @avandar/platform test
  pnpm --filter @avandar/platform type-check
  ```
  Expected: all 3 `isDesktop` tests pass; type-check clean.

  **Verify:**
  - `packages/shared/platform/src/types/Platform.types.ts` exports `type Platform = "web" | "desktop";`
  - `packages/shared/platform/src/isDesktop.ts` exports a synchronous `isDesktop(): boolean` that:
    - returns `false` when `window` is undefined
    - returns `true` only when `window.__AVA_PLATFORM__ === "desktop"`
  - `packages/shared/platform/src/index.ts` re-exports `isDesktop` and `type Platform`
  - No `any` types in the helper or its test; the cast through `Record<string, unknown>` is the only escape hatch
  - No changes outside `packages/shared/platform/`
  - Test groupings G1.1 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test (if applicable):**
  1. `pnpm dev`
  2. Open browser to localhost:5173, sign in
  3. Confirm app loads normally — `isDesktop()` is not yet imported by any caller, so this must be a no-op for the web app.

  Expected: web app behavior identical to pre-phase-1.

  **Greenlight criteria:** all checks above pass before moving to Task 3. If anything fails, stop and report.

---

## Task 3: Define the six abstraction interfaces

**Test groupings:** G1.2 (Six interface signature locks via expectTypeOf().parameters — tighter than toHaveProperty; one type-test per interface, including ServerApiClient's rpc and invokeFunction signatures so Phase 2 handler implementations break loudly on drift).

**PR boundaries:** 1 PR practically (small surface area, all six interfaces are pure type-only files with no runtime impact and nothing yet imports them); but each interface file CAN ship as its own PR — split into up to 6 PRs if reviewers want finer granularity, since each new `*.types.ts` file is independently safe (compiles, no consumer in user-facing code). The `interfaces.test-d.ts` type-test file should ship with whichever PR(s) introduce the interfaces it asserts against to keep type-check green.

Each interface is a pure type. No runtime code yet. Tests for interfaces are *type-level* — we use `expectTypeOf` from vitest to assert the shape matches expectations and to lock down breaking changes.

**Files:**
- Create: `packages/shared/platform/src/types/DuckDbClient.types.ts`
- Create: `packages/shared/platform/src/types/RdbClient.types.ts`
- Create: `packages/shared/platform/src/types/DatasetBlobStore.types.ts`
- Create: `packages/shared/platform/src/types/AuthProvider.types.ts`
- Create: `packages/shared/platform/src/types/SyncEngine.types.ts`
- Create: `packages/shared/platform/src/types/ServerApiClient.types.ts`
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

- [ ] **Step 5b: Define `ServerApiClient`**

Create `packages/shared/platform/src/types/ServerApiClient.types.ts`:

```ts
/**
 * Platform-agnostic server API client.
 *
 * Covers two server-side surfaces today bridged by `@supabase/supabase-js`:
 *   - Postgres functions invoked via PostgREST (`supabase.rpc(...)`)
 *   - Edge Functions (`supabase.functions.invoke(...)`)
 *
 * On web this is a thin wrapper over the existing `APIClient.ts` (for Edge
 * Functions) and a `supabase.rpc(...)` passthrough. On desktop (Phase 2+)
 * this is an IPC client; in Phase 1 the desktop factory throws.
 */
export interface ServerApiClient {
  // Supabase RPCs — Postgres functions invoked via PostgREST
  rpc<TName extends RpcName>(name: TName, args: RpcArgs<TName>): Promise<RpcResult<TName>>;
  // Edge Functions — typed by the existing `keyof API` route schema in src/clients/APIClient.ts
  invokeFunction<TRoute extends keyof API>(req: APIRequest<TRoute>): Promise<APIResult<TRoute>>;
}
```

`RpcName`, `RpcArgs<T>`, `RpcResult<T>`, and the Edge Function counterparts `APIRequest<T>` / `APIResult<T>` should be **derived from the existing typed Supabase schema and the `API` route schema already declared in `src/clients/APIClient.ts`** — do not redefine these here. The intent is that the interface signature locks into the same types consumers already see today; Phase 2 backends must satisfy that exact shape.

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

- [ ] **Step 9: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  pnpm --filter @avandar/platform test
  pnpm --filter @avandar/platform type-check
  ```
  Expected: all `expectTypeOf` assertions in `interfaces.test-d.ts` pass; type-check clean.

  **Verify:**
  - All five interface files exist under `packages/shared/platform/src/types/` with the shapes documented in this task:
    - `DuckDbClient.types.ts` — exposes `runStructuredQuery`, `runRawQuery`, `loadParquetFromDatasetBlobStore`, `loadFromUpload`; includes `StructuredQuery` placeholder, `UploadSource`, `DatasetImportOptions`, `DatasetImportResult`
    - `RdbClient.types.ts` — exposes `query`/`upsert`/`delete`/`transaction` plus `RdbTx`, branded `ModelName`, `RdbFilter`, and the `asModelName` helper
    - `DatasetBlobStore.types.ts` — exposes `put`/`get`/`delete`/`exists`/`list`/`stat`; branded `DatasetBlobKey`, `DatasetBlobStat`, `asDatasetBlobKey`, `DatasetBlobKeys` helper object
    - `AuthProvider.types.ts` — exposes `getSession`/`signIn`/`signOut`/`refreshIfNeeded`/`onAuthChange`; `AuthCredentials` discriminated union, `Session` with `mode: "online" | "offline-cached"`, `Unsubscribe`
    - `SyncEngine.types.ts` — exposes `enqueue`/`status`/`forceSync`/`onStatusChange`; `SyncMutation`, `SyncStatus` discriminated union with `offline | online | error` kinds
  - `packages/shared/platform/src/index.ts` re-exports every type and helper above (no missing exports)
  - No runtime code yet (other than the `asModelName`, `asDatasetBlobKey`, `DatasetBlobKeys` brand helpers) — these are pure type definitions
  - No `any` types snuck in; readonly modifiers preserved per spec
  - No changes outside `packages/shared/platform/`
  - Test groupings G1.2 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test (if applicable):**
  1. `pnpm dev`
  2. Open browser to localhost:5173, sign in
  3. Confirm the app still loads — none of these types are yet imported by `src/`, so this must be a no-op.

  Expected: web app behavior identical to pre-phase-1.

  **Greenlight criteria:** all checks above pass before moving to Task 4. If anything fails, stop and report.

---

## Task 4: `createRdbCRUDClient` umbrella factory

**Test groupings:** G1.3 (createRdbCRUDClient factory selection — web returns Supabase-backed; desktop throws in Phase 1 and returns Sqlite-backed in Phase 2 follow-up; spy on createSupabaseCRUDClient and assert dbClient injection).

**PR boundaries:** 1 PR. The factory exists but no call site uses it yet (migration is Task 5), so creating it does not change web app behavior. The TDD test + implementation + index export + package.json dependency edit are tightly coupled — test and impl must ship together to keep `pnpm test` green, and the new export with no consumer is safe.

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

- [ ] **Step 9: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  pnpm --filter @avandar/clients test
  pnpm --filter @avandar/clients type-check
  pnpm type-check
  ```
  Expected: both `createRdbCRUDClient` tests pass (web delegates to Supabase; desktop throws the Phase-1 sentinel); whole-repo type-check clean.

  **Verify:**
  - `packages/shared/clients/src/RdbCRUDClient/RdbCRUDClient.types.ts` exports `RdbCRUDModelSpec<M>` as `Omit<SupabaseCRUDModelSpec<M>, "dbClient">`
  - `packages/shared/clients/src/RdbCRUDClient/createRdbCRUDClient.ts` exports `createRdbCRUDClient<M>(spec)` which:
    - throws a clear "desktop backend not implemented" error when `isDesktop()` returns true
    - otherwise delegates to `createSupabaseCRUDClient` with `dbClient` injected via the `getWebDbClient` shim
  - The dynamic `require()` shim in `getWebDbClient` is commented as a Phase-1-only transitional ugliness
  - `packages/shared/clients/src/index.ts` re-exports `createRdbCRUDClient` and `type RdbCRUDModelSpec`
  - `packages/shared/clients/package.json` declares `"@avandar/platform": "workspace:*"` under `dependencies`
  - No `any` introduced (the `as never` casts in the test fixtures are limited to test-only spec shells)
  - No call sites in `src/clients/**` have been touched yet — that's Task 5
  - Test groupings G1.3 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test (if applicable):**
  1. `pnpm dev`
  2. Open browser to localhost:5173, sign in
  3. Open the datasets or workspaces list — every existing client still calls `createSupabaseCRUDClient` directly, so the app must be unchanged.

  Expected: web app behavior identical to pre-phase-1.

  **Greenlight criteria:** all checks above pass before moving to Task 4b. If anything fails, stop and report.

---

## Task 4b: `createServerApiClient` factory

**Test groupings:** G1.6 (createServerApiClient factory selection — web returns browser-backed; desktop throws Error("desktop ServerApiClient lands in Phase 2") in Phase 1).

**PR boundaries:** 1 PR. Same shape as Task 4: factory + browser-backed impl + throwing desktop stub + test ship together as a self-contained mergeable unit. Nothing in `src/` consumes the new factory yet (Task 5 does that), so the web app stays behaviorally identical.

The factory accepts no spec; it inspects `isDesktop()` and returns either a browser-backed implementation (thin wrapper over today's `APIClient.ts` for Edge Functions and a `supabase.rpc(...)` passthrough for RPCs) or — on desktop — a stub that throws. Phase 2 wires the desktop branch through real IPC.

**Files:**
- Create: `packages/shared/clients/src/ServerApiClient/ServerApiClient.types.ts`
- Create: `packages/shared/clients/src/ServerApiClient/createServerApiClient.ts`
- Create: `packages/shared/clients/src/ServerApiClient/createBrowserServerApiClient.ts`
- Create: `packages/shared/clients/src/ServerApiClient/createIpcServerApiClient.ts` (Phase 1 = throwing stub)
- Test: `packages/shared/clients/src/ServerApiClient/createServerApiClient.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/shared/clients/src/ServerApiClient/createServerApiClient.test.ts`:

```ts
import { isDesktop } from "@avandar/platform";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@avandar/platform", async () => {
  const actual =
    await vi.importActual<typeof import("@avandar/platform")>("@avandar/platform");
  return { ...actual, isDesktop: vi.fn(() => false) };
});

import { createServerApiClient } from "./createServerApiClient.ts";

describe("createServerApiClient", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the browser-backed ServerApiClient on web", () => {
    (isDesktop as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const client = createServerApiClient();
    expect(client).toBeDefined();
    expect(typeof client.rpc).toBe("function");
    expect(typeof client.invokeFunction).toBe("function");
  });

  it("throws a clear Phase-2 sentinel error on desktop", () => {
    (isDesktop as ReturnType<typeof vi.fn>).mockReturnValue(true);
    expect(() => createServerApiClient()).toThrow(
      /desktop ServerApiClient lands in Phase 2/i,
    );
  });
});
```

- [ ] **Step 2: Create the local types re-export**

Create `packages/shared/clients/src/ServerApiClient/ServerApiClient.types.ts` — re-exports the interface and supporting types from `@avandar/platform`:

```ts
export type { ServerApiClient } from "@avandar/platform";
```

- [ ] **Step 3: Implement the umbrella factory**

Create `packages/shared/clients/src/ServerApiClient/createServerApiClient.ts`:

```ts
import { isDesktop } from "@avandar/platform";
import type { ServerApiClient } from "@avandar/platform";
import { createBrowserServerApiClient } from "./createBrowserServerApiClient.ts";
import { createIpcServerApiClient } from "./createIpcServerApiClient.ts";

/**
 * Platform-aware ServerApiClient factory.
 *   - web:     browser-backed (thin wrapper over APIClient.ts + supabase.rpc)
 *   - desktop: IPC-backed (Phase 2; Phase 1 = throwing stub)
 */
export function createServerApiClient(): ServerApiClient {
  if (isDesktop()) return createIpcServerApiClient();
  return createBrowserServerApiClient();
}
```

- [ ] **Step 4: Implement the browser-backed adapter**

Create `packages/shared/clients/src/ServerApiClient/createBrowserServerApiClient.ts` — a thin wrapper over today's `APIClient.ts` (for `invokeFunction`) and a passthrough to `supabase.rpc(...)` (for `rpc`). The exact wiring imports the existing `AvaSupabase.DB` for the rpc passthrough and the existing `APIClient` route-schema typing for `invokeFunction`. The intent is **zero behavior change on web** — every call goes through the same code paths it does today.

- [ ] **Step 5: Implement the desktop IPC stub**

Create `packages/shared/clients/src/ServerApiClient/createIpcServerApiClient.ts`:

```ts
import type { ServerApiClient } from "@avandar/platform";

/**
 * Phase 1 stub. Phase 2 replaces this with the real IPC-backed implementation.
 * V1 offline behavior: desktop throws OfflineError when offline (no queueing).
 */
export function createIpcServerApiClient(): ServerApiClient {
  throw new Error("desktop ServerApiClient lands in Phase 2");
}
```

- [ ] **Step 6: Run tests and confirm they pass**

```bash
pnpm --filter @avandar/clients test
```

Expected: both `createServerApiClient` tests pass.

- [ ] **Step 7: Export from the package index**

Edit `packages/shared/clients/src/index.ts` — add:

```ts
// Server-side API client (RPCs + Edge Functions)
export { createServerApiClient } from "@clients/ServerApiClient/createServerApiClient.ts";
export type { ServerApiClient } from "@clients/ServerApiClient/ServerApiClient.types.ts";
```

- [ ] **Step 8: Type-check**

```bash
pnpm --filter @avandar/clients type-check
```

Expected: passes.

- [ ] **Step 9: Manual review checkpoint (do NOT commit)**

  **Run:**
  ```bash
  pnpm --filter @avandar/clients test
  pnpm --filter @avandar/clients type-check
  pnpm type-check
  ```
  Expected: both `createServerApiClient` tests pass (web returns browser-backed; desktop throws `"desktop ServerApiClient lands in Phase 2"`); whole-repo type-check clean.

  **Verify:**
  - `packages/shared/clients/src/ServerApiClient/ServerApiClient.types.ts` re-exports the `ServerApiClient` interface from `@avandar/platform`
  - `packages/shared/clients/src/ServerApiClient/createServerApiClient.ts` switches on `isDesktop()` and dispatches to the browser-backed or IPC stub
  - `createBrowserServerApiClient.ts` is a thin wrapper over today's `APIClient.ts` (`invokeFunction`) and a passthrough to `supabase.rpc(...)` (`rpc`)
  - `createIpcServerApiClient.ts` throws `Error("desktop ServerApiClient lands in Phase 2")` verbatim
  - `packages/shared/clients/src/index.ts` re-exports `createServerApiClient` and `type ServerApiClient`
  - No `any` introduced; signatures match the `ServerApiClient` interface from `@avandar/platform`
  - No call sites in `src/clients/**` have been touched yet — that's Task 5
  - Test groupings G1.6 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test (if applicable):**
  1. `pnpm dev`
  2. Open browser to localhost:5173, sign in
  3. No call sites use `createServerApiClient` yet — Task 5 wires them. App must behave identically to pre-Task-4b.

  Expected: web app behavior identical to pre-phase-1.

  **Greenlight criteria:** all checks above pass before moving to Task 5. If anything fails, stop and report.

---

## Task 5: Migrate every Supabase CRUD client call site

**Test groupings:** G1.4 (CRUD-migration regression suite — single parameterized Playwright spec over every migrated entity doing list → create → read → update → delete; the highest-leverage safety net in this phase); G1.7 (ServerApi migration regression — Playwright suite hits every page that depends on the 2 migrated RPC sites and on APIClient consumers, plus a snapshot test that no source file references AvaSupabase.DB.rpc/functions.invoke).

**PR boundaries:** ~7 PRs total — each batch ships independently because every migrated call site swaps to `createRdbCRUDClient(spec)`, which on web still returns the Supabase-backed client (zero behavior change per file).
- PR 1: Single template migration (1 file) — proves the mechanical pattern, validates Playwright regression for that one entity before fan-out.
- PR 2..N: Each batch of ~5 migrated CRUD-client files is its own PR (≈ 5 batch PRs total for the ~20-file enumeration). Each batch leaves the web app behaviorally unchanged and `pnpm test` / lint / type-check green.
- PR N+1: ServerApi migration (2 RPC call sites + APIClient internal rewire) is its own PR — different factory, different regression surface, keep it isolated from CRUD batches.
- The "verify zero stragglers" Step (`git grep "createSupabaseCRUDClient"` returns empty) is part of the final batch PR, since it can only pass once every preceding batch has merged.

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

- [ ] **Step 4: Manual review checkpoint (do NOT commit) — template migration**

  **Run:**
  ```bash
  pnpm type-check
  pnpm test:clients
  pnpm test:frontend
  ```
  Expected: green across the board for the single migrated file.

  **Verify:**
  - Exactly one client file under `src/clients/**` has been migrated (the simplest one, e.g. `FooClient.ts`)
  - The migrated file:
    - imports `createRdbCRUDClient` from `@avandar/clients` (not `createSupabaseCRUDClient`)
    - no longer imports `AvaSupabase` if it's unused elsewhere in the file
    - omits the `dbClient` field from the spec passed to `createRdbCRUDClient`
    - preserves `modelName`, `tableName`, `dbTablePrimaryKey`, `parsers`, and any custom queries/mutations exactly as before
  - No `any` types introduced
  - No other files modified in this step
  - Test groupings G1.4 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test (if applicable):**
  1. `pnpm dev`
  2. Open browser to localhost:5173, sign in
  3. Navigate to the page that exercises the migrated client (the entity's list view; create/read on at least one row)
  4. Confirm rows load and the page operates exactly as before — no console errors, no network/auth failures

  Expected: behavior on that page is indistinguishable from pre-migration.

  This single-file checkpoint documents the canonical change pattern for the reviewer. The user will commit it manually before proceeding.

  **Greenlight criteria:** all checks above pass before moving to Step 5 (batch migration). If anything fails, stop and report.

- [ ] **Step 5: Migrate the remaining clients in batches of ~5**

For the remaining files from Step 1, apply the same mechanical edit in batches. Do NOT commit — pause after each batch for manual review and let the user commit themselves.

```bash
git grep -l "createSupabaseCRUDClient" src/clients/
# pick ~5 files, edit them
pnpm type-check
pnpm test
# STOP here. Surface the diff to the user for review and let them commit.
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

- [ ] **Step 6b: Migrate `supabase.rpc(...)` call sites and rewire `APIClient.ts`**

Three files to update — each is a small mechanical change:

1. `src/clients/datasets/DatasetClient.ts` — replace `AvaSupabase.DB.rpc(...)` with the equivalent `serverApi.rpc(...)` call.
2. `src/clients/WorkspaceClient.ts` — same swap.
3. `src/clients/APIClient.ts` — inside `sendHTTPRequest`, replace the `AvaSupabase.DB.functions.invoke<...>(relativeAPIURL, { method, body })` call with `serverApi.invokeFunction<...>({ route, method, pathParams, queryParams, body })`. The public `APIClient.get/post/patch/put/delete` surface stays exactly the same.

Verification:
```bash
git grep "AvaSupabase\.DB\.rpc\(" -- 'src/**'
git grep "AvaSupabase\.DB\.functions\.invoke\(" -- 'src/**'
```
Expected: both return zero matches. Any remaining are stragglers.

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

- [ ] **Step 11: Manual review checkpoint (do NOT commit) — end of Task 5**

  **Run:**
  ```bash
  pnpm type-check
  pnpm test
  pnpm test:clients
  pnpm test:models
  pnpm test:frontend
  pnpm test:e2e
  ```
  Expected: every suite green. If `pnpm test:e2e` requires a running dev server, run it according to the repo's e2e convention.

  **Verify:**
  - `git grep "createSupabaseCRUDClient" -- 'src/'` returns zero matches (call sites fully migrated)
  - `git grep "AvaSupabase.DB" -- 'src/clients/**'` returns zero matches (no leftover direct Supabase DB references in client files)
  - `git grep "AvaSupabase\.DB\.rpc\(" -- 'src/**'` returns zero matches (Step 6b: `DatasetClient.ts` and `WorkspaceClient.ts` migrated to `serverApi.rpc(...)`)
  - `git grep "AvaSupabase\.DB\.functions\.invoke\(" -- 'src/**'` returns zero matches (Step 6b: `APIClient.ts` `sendHTTPRequest` rewired to `serverApi.invokeFunction(...)`; public `APIClient.get/post/patch/put/delete` surface unchanged)
  - The Option A edit to `packages/shared/clients/src/RdbCRUDClient/createRdbCRUDClient.ts` is in place: desktop falls through to the Supabase factory, with a TODO comment referencing Phase 2's SQLite cutover
  - The corresponding test in `createRdbCRUDClient.test.ts` was updated so the "desktop" case now asserts delegation (not a thrown error), with a comment about the Phase 2 cutover
  - The umbrella factory's web behavior is unchanged from Task 4 — only the desktop branch was relaxed
  - No `any` types introduced across the migration
  - All ~20 migrated client files import `createRdbCRUDClient` from `@avandar/clients`, omit `dbClient` from the spec, and drop their `AvaSupabase` import if it became unused
  - Test groupings G1.4 and G1.7 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test — web (REQUIRED):**
  1. `pnpm dev`
  2. Open browser to localhost:5173, sign in with pablo@avandarlabs.com
  3. Exercise CRUD across the entities the migrated clients touch:
     - Workspaces: list, create a new workspace, open it, rename it, delete it
     - Datasets: list, upload a CSV (creates a dataset + parquet), open the dataset, delete it
     - Dashboards / Queries / Models / any other migrated entity: open the list view, create one new row, edit it, delete it
  4. Watch the browser devtools console and network panel — no unexpected errors, no failed Supabase requests, no auth regressions
  5. Sign out and sign back in to confirm the auth flow is untouched

  **Manual smoke test — desktop (REQUIRED, validates Option A change):**
  1. `pnpm dev:desktop`
  2. Sign in inside the Electrobun window
  3. Open the same list views as on web (workspaces, datasets, etc.) and confirm rows render — Phase 1 desktop must transparently fall through to Supabase
  4. No "desktop backend not implemented" error in the desktop console

  Expected: web app behavior identical to pre-phase-1; desktop shell renders the same data as web with no thrown errors from the umbrella factory.

  **Greenlight criteria:** every test suite green AND both smoke tests clean before moving to Task 6. If anything fails, stop and report — bisect by reverting batches if necessary.

---

## Task 6: Phase 1 acceptance checklist

**Test groupings:** G1.5 (Production build smoke — pnpm build + pnpm build:desktop both succeed; built desktop bundle contains no duckdb-wasm reference; catches require() shim breakage under prod bundler that dev-mode hides).

**PR boundaries:** No code-change boundaries — pure verification + spec annotation. The verification Steps (`git grep` straggler check, `pnpm test`/`build`/`build:desktop` sweeps) are gating checks run against already-merged work, not separate PRs. The spec annotation Step that records Phase 1 completion ships as a single safe doc PR.

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

- [ ] **Step 7: Final manual review checkpoint (do NOT commit) — Phase 1 acceptance**

  **Verify all prior task checkpoints are green:**
  - Task 1 Step 6 checkpoint passed (workspace package scaffold)
  - Task 2 Step 8 checkpoint passed (`isDesktop` + `Platform` type)
  - Task 3 Step 9 checkpoint passed (six interfaces defined and exported)
  - Task 4 Step 9 checkpoint passed (`createRdbCRUDClient` umbrella factory)
  - Task 4b Step 9 checkpoint passed (`createServerApiClient` umbrella factory)
  - Task 5 Step 4 checkpoint passed (template client migration)
  - Task 5 Step 11 checkpoint passed (all ~20 clients migrated, Option A applied, full smoke test clean)
  - ServerApiClient factory exists and is wired (G1.6 merged); 2 rpc call sites + APIClient.ts internal delegation migrated (G1.7 merged)
  - Task 6 Steps 1–5 above all returned the expected results: zero leftover `createSupabaseCRUDClient` call sites in `src/`, `pnpm test` green, `pnpm type-check` clean, web smoke test indistinguishable from pre-Phase-1, desktop smoke test renders the same data

  **Verify the spec marker:**
  - `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` Phase 1 line in the Phased Rollout section has been annotated with "— completed 2026-05-13" (or the actual completion date)
  - No other edits made to the spec file

  **Verify the working tree:**
  - `git status` shows only the intended changes accumulated across Phase 1 (the new `@avandar/platform` package, the `createRdbCRUDClient` factory under `packages/shared/clients/`, the ~20 migrated client files in `src/clients/`, the workspace dep added to `packages/shared/clients/package.json`, the lockfile, and the spec annotation)
  - No unrelated or accidental modifications
  - Test groupings G1.5 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Greenlight criteria:** every prior checkpoint passed, both smoke tests are clean, and the spec is annotated. At that point Phase 1 is functionally complete — the user will commit Phase 1 manually in whatever shape they prefer (single squash, per-task commits, etc.). If anything fails, stop and report.

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
