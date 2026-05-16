// These are placeholder "existence" tests — they only verify that each
// interface declares its expected member names and that a few branded /
// discriminated-union types keep their shape. They will be removed once
// the corresponding interface has real concrete adapters whose behavior
// can be tested directly. Until then, treat any failure here as a signal
// that an interface was renamed/widened/narrowed unintentionally, not as
// a meaningful behavioral test.
import { expectTypeOf, test } from "vitest";
import type {
  AuthProvider,
  Session,
} from "$/platform/types/AuthProvider.types.ts";
import type {
  DatasetBlobKey,
  DatasetBlobStore,
} from "$/platform/types/DatasetBlobStore.types.ts";
import type { DuckDbClient } from "$/platform/types/DuckDbClient.types.ts";
import type { RdbClient, RdbFilter } from "$/platform/types/RdbClient.types.ts";
import type {
  ServerApiClient,
  ServerApiFunctionRequest,
} from "$/platform/types/ServerApiClient.types.ts";
import type { SyncEngine, SyncStatus } from "$/platform/types/SyncEngine.types.ts";
import type { Platform } from "$/platform/types/Platform.types.ts";

test("Platform is the closed 'web' | 'desktop' union", () => {
  expectTypeOf<Platform>().toEqualTypeOf<"web" | "desktop">();
});

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
  expectTypeOf(filter).toExtend<RdbFilter>();
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

test("ServerApiClient exposes rpc and invokeFunction", () => {
  expectTypeOf<ServerApiClient>().toHaveProperty("rpc");
  expectTypeOf<ServerApiClient>().toHaveProperty("invokeFunction");
});

test("ServerApiFunctionRequest accepts the documented HTTP methods", () => {
  expectTypeOf<ServerApiFunctionRequest["method"]>().toEqualTypeOf<
    "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  >();
});
