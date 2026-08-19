import "fake-indexeddb/auto";
import {
  makePrincipalKeyFromPublicSession,
  makePrincipalKeyFromWorkspaceSession,
} from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DexieRelationCache } from "@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCache";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "@/db/dexie/dexieVersions/dexieVersions";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RelationCacheKey } from "$/models/relations/RelationCacheKey/RelationCacheKey.types";
import type { RelationCacheWrite } from "$/models/relations/RelationCachePort/RelationCachePort.types";

const db = AvaDexieVersionManager.getVersion(CURRENT_AVA_DEXIE_VERSION);

const DATASET_A = "0f2c9f3e-1111-4222-8333-a1b2c3d4e5f6" as Dataset.Id;
const DATASET_B = "0f2c9f3e-2222-4222-8333-a1b2c3d4e5f6" as Dataset.Id;

const WORKSPACE_PRINCIPAL = makePrincipalKeyFromWorkspaceSession({
  workspaceId: "workspace-1",
  userId: "user-1",
});
const OTHER_WORKSPACE_PRINCIPAL = makePrincipalKeyFromWorkspaceSession({
  workspaceId: "workspace-2",
  userId: "user-2",
});
const PUBLIC_PRINCIPAL = makePrincipalKeyFromPublicSession({
  bucket: "published",
  dashboardId: "dashboard-1",
  snapshotRevision: "1",
});

function _makeWrite(
  overrides: {
    payload?: Blob;
    columns?: readonly string[] | "all";
    identity?: Partial<RelationCacheWrite["identity"]>;
  } = {},
): RelationCacheWrite {
  return {
    payload: overrides.payload ?? new Blob(["parquet-bytes"]),
    columns: overrides.columns ?? ["a", "b"],
    identity: {
      principal: WORKSPACE_PRINCIPAL,
      relation: { kind: "dataset", id: DATASET_A },
      definition: { kind: "virtual-sql", text: "select * from t" },
      sourceVersion: undefined,
      ...overrides.identity,
    },
  };
}

function _makeKey(overrides: Partial<RelationCacheKey> = {}): RelationCacheKey {
  return {
    principal: WORKSPACE_PRINCIPAL,
    relation: { kind: "dataset", id: DATASET_A },
    definition: { kind: "virtual-sql", text: "select * from t" },
    sourceVersion: undefined,
    columns: ["a"],
    ...overrides,
  };
}

beforeEach(async () => {
  await db.open();
  await db.RelationCacheEntry.clear();
  await db.RelationCachePayload.clear();
});

afterAll(async () => {
  await db.delete();
});

describe("DexieRelationCache.lookup", () => {
  it("hits a lookup for exactly the columns that were written", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["a", "b"] }));

    const hit = await DexieRelationCache.lookup(
      _makeKey({ columns: ["a", "b"] }),
    );

    expect(hit).toBeDefined();
    const payload = await DexieRelationCache.readPayload(hit!);
    expect(payload).toBeDefined();
  });

  it("hits a lookup for a subset of the cached columns", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["a", "b", "c"] }));

    const hit = await DexieRelationCache.lookup(_makeKey({ columns: ["a"] }));

    expect(hit).toBeDefined();
  });

  it("misses a lookup for a superset of the cached columns", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["a"] }));

    const hit = await DexieRelationCache.lookup(
      _makeKey({ columns: ["a", "b"] }),
    );

    expect(hit).toBeUndefined();
  });

  it("serves any request once the cached columns are 'all'", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: "all" }));

    const hit = await DexieRelationCache.lookup(
      _makeKey({ columns: ["a", "b", "c"] }),
    );

    expect(hit).toBeDefined();
    expect(hit!.columns).toBe("all");
  });

  it("misses a request for 'all' against a finite cached set", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["a", "b"] }));

    const hit = await DexieRelationCache.lookup(_makeKey({ columns: "all" }));

    expect(hit).toBeUndefined();
  });

  it("compares column names case-sensitively", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["A"] }));

    const hit = await DexieRelationCache.lookup(_makeKey({ columns: ["a"] }));

    expect(hit).toBeUndefined();
  });

  it("never serves a different workspace principal over the same relation", async () => {
    await DexieRelationCache.write(_makeWrite());

    const hit = await DexieRelationCache.lookup(
      _makeKey({ principal: OTHER_WORKSPACE_PRINCIPAL }),
    );

    expect(hit).toBeUndefined();
  });

  it("never serves a public principal from a workspace-cached entry over the same relation and definition", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: "all" }));

    const hit = await DexieRelationCache.lookup(
      _makeKey({ principal: PUBLIC_PRINCIPAL, columns: "all" }),
    );

    expect(hit).toBeUndefined();
  });

  it("never serves a workspace principal from a public-cached entry over the same relation and definition", async () => {
    await DexieRelationCache.write(
      _makeWrite({ columns: "all", identity: { principal: PUBLIC_PRINCIPAL } }),
    );

    const hit = await DexieRelationCache.lookup(
      _makeKey({ principal: WORKSPACE_PRINCIPAL, columns: "all" }),
    );

    expect(hit).toBeUndefined();
  });

  it("misses once the definition changes, including a reformat that only changes whitespace", async () => {
    await DexieRelationCache.write(
      _makeWrite({
        identity: {
          definition: { kind: "virtual-sql", text: "select * from t" },
        },
      }),
    );

    const hit = await DexieRelationCache.lookup(
      _makeKey({
        definition: { kind: "virtual-sql", text: "select *  from t" },
      }),
    );

    expect(hit).toBeUndefined();
  });

  it("still hits when the source version differs, because version is never matched at lookup", async () => {
    await DexieRelationCache.write(
      _makeWrite({ identity: { sourceVersion: "v1" } }),
    );

    const hit = await DexieRelationCache.lookup(
      _makeKey({ sourceVersion: "v2" }),
    );

    expect(hit).toBeDefined();
  });

  it("does not serve an entry once staleAt is set", async () => {
    await DexieRelationCache.write(_makeWrite());
    const written = await DexieRelationCache.lookup(_makeKey());
    expect(written).toBeDefined();

    await db.RelationCacheEntry.update(written!.identityKey, {
      staleAt: Date.now(),
    });

    const hit = await DexieRelationCache.lookup(_makeKey());
    expect(hit).toBeUndefined();
  });
});

describe("DexieRelationCache.write", () => {
  it("is idempotent on identityKey: writing the same identity twice leaves one row", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["a"] }));
    await DexieRelationCache.write(_makeWrite({ columns: ["a"] }));

    const rows = await db.RelationCacheEntry.where("tableName")
      .equals(DATASET_A)
      .toArray();
    expect(rows).toHaveLength(1);
  });

  it("grows monotonically: a wider write for the same identity replaces columns rather than adding a row", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["a"] }));
    await DexieRelationCache.write(_makeWrite({ columns: ["a", "b"] }));

    const rows = await db.RelationCacheEntry.where("tableName")
      .equals(DATASET_A)
      .and((row) => {
        return row.principalKey === WORKSPACE_PRINCIPAL;
      })
      .toArray();

    expect(rows).toHaveLength(1);
    expect(rows[0]!.columns).toEqual(["a", "b"]);
  });

  it("supersedes a sibling entry for the same principal and relation when the definition changes", async () => {
    await DexieRelationCache.write(
      _makeWrite({
        identity: { definition: { kind: "virtual-sql", text: "select 1" } },
      }),
    );
    await DexieRelationCache.write(
      _makeWrite({
        identity: { definition: { kind: "virtual-sql", text: "select 2" } },
      }),
    );

    const rows = await db.RelationCacheEntry.where("tableName")
      .equals(DATASET_A)
      .and((row) => {
        return row.principalKey === WORKSPACE_PRINCIPAL;
      })
      .toArray();

    expect(rows).toHaveLength(1);

    const payloadRows = await db.RelationCachePayload.toArray();
    expect(payloadRows).toHaveLength(1);
    expect(payloadRows[0]!.identityKey).toBe(rows[0]!.identityKey);
  });

  it("never leaves an entry without its payload", async () => {
    await DexieRelationCache.write(_makeWrite());

    const [entries, payloads] = await Promise.all([
      db.RelationCacheEntry.toArray(),
      db.RelationCachePayload.toArray(),
    ]);
    expect(entries).toHaveLength(1);
    expect(payloads).toHaveLength(1);
    expect(payloads[0]!.identityKey).toBe(entries[0]!.identityKey);
  });
});

describe("DexieRelationCache.evict", () => {
  it("forgets every entry for the given relations and principal, leaving other principals untouched", async () => {
    await DexieRelationCache.write(
      _makeWrite({
        identity: { relation: { kind: "dataset", id: DATASET_A } },
      }),
    );
    await DexieRelationCache.write(
      _makeWrite({
        identity: {
          relation: { kind: "dataset", id: DATASET_A },
          principal: OTHER_WORKSPACE_PRINCIPAL,
        },
      }),
    );

    await DexieRelationCache.evict(
      [{ kind: "dataset", id: DATASET_A }],
      WORKSPACE_PRINCIPAL,
    );

    const survivors = await db.RelationCacheEntry.toArray();
    expect(survivors).toHaveLength(1);
    expect(survivors[0]!.principalKey).toBe(OTHER_WORKSPACE_PRINCIPAL);

    const payloads = await db.RelationCachePayload.toArray();
    expect(payloads).toHaveLength(1);
    expect(payloads[0]!.identityKey).toBe(survivors[0]!.identityKey);
  });
});

describe("DexieRelationCache.touch", () => {
  it("updates lastQueriedAt without rewriting the payload table", async () => {
    await DexieRelationCache.write(_makeWrite());
    const [before] = await db.RelationCacheEntry.toArray();

    const payloadPut = vi.spyOn(db.RelationCachePayload, "put");
    await DexieRelationCache.touch(before!.identityKey);
    expect(payloadPut).not.toHaveBeenCalled();
    payloadPut.mockRestore();

    const [after] = await db.RelationCacheEntry.toArray();
    expect(after!.lastQueriedAt).toBeGreaterThanOrEqual(before!.lastQueriedAt);
  });
});

describe("DexieRelationCache.evictToBudget", () => {
  it("evicts least-recently-queried entries first and respects the byte budget", async () => {
    await DexieRelationCache.write(
      _makeWrite({
        identity: { relation: { kind: "dataset", id: DATASET_A } },
        columns: "all",
        payload: new Blob(["x".repeat(100)]),
      }),
    );
    await DexieRelationCache.write(
      _makeWrite({
        identity: { relation: { kind: "dataset", id: DATASET_B } },
        columns: "all",
        payload: new Blob(["y".repeat(100)]),
      }),
    );

    const rows = await db.RelationCacheEntry.toArray();
    const oldest = rows.find((row) => {
      return row.tableName === DATASET_A;
    })!;
    const newest = rows.find((row) => {
      return row.tableName === DATASET_B;
    })!;
    await db.RelationCacheEntry.update(oldest.identityKey, {
      lastQueriedAt: 1_000,
    });
    await db.RelationCacheEntry.update(newest.identityKey, {
      lastQueriedAt: 2_000,
    });

    await DexieRelationCache.evictToBudget(150);

    const survivors = await db.RelationCacheEntry.toArray();
    expect(
      survivors.map((row) => {
        return row.tableName;
      }),
    ).toEqual([DATASET_B]);

    const survivingPayloads = await db.RelationCachePayload.toArray();
    expect(survivingPayloads).toHaveLength(1);
    expect(survivingPayloads[0]!.identityKey).toBe(newest.identityKey);

    const totalBytes = survivors.reduce((sum, row) => {
      return sum + row.byteSize;
    }, 0);
    expect(totalBytes).toBeLessThanOrEqual(150);
  });

  it("never reads a RelationCachePayload row while scanning the budget", async () => {
    await DexieRelationCache.write(
      _makeWrite({
        identity: { relation: { kind: "dataset", id: DATASET_A } },
      }),
    );
    await DexieRelationCache.write(
      _makeWrite({
        identity: { relation: { kind: "dataset", id: DATASET_B } },
      }),
    );

    const payloadGet = vi.spyOn(db.RelationCachePayload, "get");
    const payloadToArray = vi.spyOn(db.RelationCachePayload, "toArray");

    await DexieRelationCache.evictToBudget(0);

    expect(payloadGet).not.toHaveBeenCalled();
    expect(payloadToArray).not.toHaveBeenCalled();

    payloadGet.mockRestore();
    payloadToArray.mockRestore();
  });

  it("evicts nothing when stored bytes are already under budget", async () => {
    await DexieRelationCache.write(_makeWrite());

    await DexieRelationCache.evictToBudget(1_000_000);

    const survivors = await db.RelationCacheEntry.toArray();
    expect(survivors).toHaveLength(1);
  });
});
