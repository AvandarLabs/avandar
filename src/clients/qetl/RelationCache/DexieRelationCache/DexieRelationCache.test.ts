import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  makePrincipalKeyFromPublicSession,
  makePrincipalKeyFromWorkspaceSession,
} from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { RelationCacheWriteFailed } from "$/models/relations/RelationCachePort/RelationCacheWriteFailed";
import { DexieRelationCache } from "@/clients/qetl/RelationCache/DexieRelationCache/DexieRelationCache";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "@/db/dexie/dexieVersions/dexieVersions";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { RelationCacheKey } from "$/models/relations/RelationCacheKey/RelationCacheKey.types";
import type { RelationCacheWrite } from "$/models/relations/RelationCachePort/RelationCachePort.types";

const db = AvaDexieVersionManager.getVersion(CURRENT_AVA_DEXIE_VERSION);

const DATASET_A = "0f2c9f3e-1111-4222-8333-a1b2c3d4e5f6" as Dataset.Id;
const DATASET_B = "0f2c9f3e-2222-4222-8333-a1b2c3d4e5f6" as Dataset.Id;

const WORKSPACE_ID = "44444444-4444-4444-8444-444444444444";
const OTHER_WORKSPACE_ID = "55555555-5555-4555-8555-555555555555";
const USER_ID = "66666666-6666-4666-8666-666666666666";
const OTHER_USER_ID = "77777777-7777-4777-8777-777777777777";
const DASHBOARD_ID = "88888888-8888-4888-8888-888888888888";

const WORKSPACE_PRINCIPAL = makePrincipalKeyFromWorkspaceSession({
  workspaceId: WORKSPACE_ID,
  userId: USER_ID,
});
const OTHER_WORKSPACE_PRINCIPAL = makePrincipalKeyFromWorkspaceSession({
  workspaceId: OTHER_WORKSPACE_ID,
  userId: OTHER_USER_ID,
});
const PUBLIC_PRINCIPAL = makePrincipalKeyFromPublicSession({
  bucket: "published",
  dashboardId: DASHBOARD_ID,
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

describe("DexieRelationCache.probe", () => {
  it("hits for exactly the columns that were written", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["a", "b"] }));

    const { hits, misses } = await DexieRelationCache.probe([
      _makeKey({ columns: ["a", "b"] }),
    ]);

    expect(misses).toHaveLength(0);
    expect(hits).toHaveLength(1);
    const payload = await DexieRelationCache.readPayload(hits[0]!.entry);
    expect(payload).toBeDefined();
  });

  it("hits for a subset of the cached columns", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["a", "b", "c"] }));

    const { hits, misses } = await DexieRelationCache.probe([
      _makeKey({ columns: ["a"] }),
    ]);

    expect(hits).toHaveLength(1);
    expect(misses).toHaveLength(0);
  });

  it("misses for a superset of the cached columns, offering the cached entry as growFrom", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["a"] }));

    const { hits, misses } = await DexieRelationCache.probe([
      _makeKey({ columns: ["a", "b"] }),
    ]);

    expect(hits).toHaveLength(0);
    expect(misses).toHaveLength(1);
    expect(misses[0]!.growFrom).toBeDefined();
    expect(misses[0]!.growFrom!.columns).toEqual(["a"]);
  });

  it("serves any request once the cached columns are 'all'", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: "all" }));

    const { hits } = await DexieRelationCache.probe([
      _makeKey({ columns: ["a", "b", "c"] }),
    ]);

    expect(hits).toHaveLength(1);
    expect(hits[0]!.entry.columns).toBe("all");
  });

  it("misses a request for 'all' against a finite cached set, offering the cached entry as growFrom", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["a", "b"] }));

    const { hits, misses } = await DexieRelationCache.probe([
      _makeKey({ columns: "all" }),
    ]);

    expect(hits).toHaveLength(0);
    expect(misses).toHaveLength(1);
    expect(misses[0]!.growFrom).toBeDefined();
  });

  it("compares column names case-sensitively, offering the cached entry as growFrom", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["A"] }));

    const { hits, misses } = await DexieRelationCache.probe([
      _makeKey({ columns: ["a"] }),
    ]);

    expect(hits).toHaveLength(0);
    expect(misses).toHaveLength(1);
    expect(misses[0]!.growFrom).toBeDefined();
  });

  it("never serves a different workspace principal over the same relation, and offers no growFrom", async () => {
    await DexieRelationCache.write(_makeWrite());

    const { hits, misses } = await DexieRelationCache.probe([
      _makeKey({ principal: OTHER_WORKSPACE_PRINCIPAL }),
    ]);

    expect(hits).toHaveLength(0);
    expect(misses).toHaveLength(1);
    expect(misses[0]!.growFrom).toBeUndefined();
  });

  it("never serves a public principal from a workspace-cached entry over the same relation and definition", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: "all" }));

    const { hits, misses } = await DexieRelationCache.probe([
      _makeKey({ principal: PUBLIC_PRINCIPAL, columns: "all" }),
    ]);

    expect(hits).toHaveLength(0);
    expect(misses[0]!.growFrom).toBeUndefined();
  });

  it("never serves a workspace principal from a public-cached entry over the same relation and definition", async () => {
    await DexieRelationCache.write(
      _makeWrite({ columns: "all", identity: { principal: PUBLIC_PRINCIPAL } }),
    );

    const { hits, misses } = await DexieRelationCache.probe([
      _makeKey({ principal: WORKSPACE_PRINCIPAL, columns: "all" }),
    ]);

    expect(hits).toHaveLength(0);
    expect(misses[0]!.growFrom).toBeUndefined();
  });

  it("misses once the definition changes, including a reformat that only changes whitespace, with no growFrom offered", async () => {
    await DexieRelationCache.write(
      _makeWrite({
        identity: {
          definition: { kind: "virtual-sql", text: "select * from t" },
        },
      }),
    );

    const { hits, misses } = await DexieRelationCache.probe([
      _makeKey({
        definition: { kind: "virtual-sql", text: "select *  from t" },
      }),
    ]);

    expect(hits).toHaveLength(0);
    expect(misses[0]!.growFrom).toBeUndefined();
  });

  it("still hits when the source version differs, because version is never matched at probe", async () => {
    await DexieRelationCache.write(
      _makeWrite({ identity: { sourceVersion: "v1" } }),
    );

    const { hits } = await DexieRelationCache.probe([
      _makeKey({ sourceVersion: "v2" }),
    ]);

    expect(hits).toHaveLength(1);
  });

  it("does not serve an entry once staleAt is set, and does not offer it as growFrom either", async () => {
    await DexieRelationCache.write(_makeWrite());
    const [written] = await db.RelationCacheEntry.toArray();
    await db.RelationCacheEntry.update(written!.identityKey, {
      staleAt: Date.now(),
    });

    const { hits, misses } = await DexieRelationCache.probe([_makeKey()]);

    expect(hits).toHaveLength(0);
    expect(misses[0]!.growFrom).toBeUndefined();
  });

  it("partitions a mixed batch so every key lands in exactly one of hits or misses, with no drops or duplicates", async () => {
    // A: hit. B: a growable miss (narrower cached columns). C: a plain miss
    // (nothing cached for this relation at all).
    await DexieRelationCache.write(
      _makeWrite({
        identity: { relation: { kind: "dataset", id: DATASET_A } },
        columns: ["a", "b"],
      }),
    );
    await DexieRelationCache.write(
      _makeWrite({
        identity: { relation: { kind: "dataset", id: DATASET_B } },
        columns: ["x"],
      }),
    );
    const hitKey = _makeKey({
      relation: { kind: "dataset", id: DATASET_A },
      columns: ["a"],
    });
    const growableMissKey = _makeKey({
      relation: { kind: "dataset", id: DATASET_B },
      columns: ["x", "y"],
    });
    const plainMissKey = _makeKey({
      relation: {
        kind: "concept",
        id: "77777777-8888-4999-8aaa-bbbbbbbbbbbb" as Concept.Id,
      },
    });
    const keys = [hitKey, growableMissKey, plainMissKey];

    const { hits, misses } = await DexieRelationCache.probe(keys);

    expect(hits.length + misses.length).toBe(keys.length);
    const returnedKeys = new Set([
      ...hits.map((hit) => {
        return hit.key;
      }),
      ...misses.map((miss) => {
        return miss.key;
      }),
    ]);
    expect(returnedKeys).toEqual(new Set(keys));
    expect(
      hits.map((hit) => {
        return hit.key;
      }),
    ).toEqual([hitKey]);
    expect(
      misses.map((miss) => {
        return miss.key;
      }),
    ).toEqual(expect.arrayContaining([growableMissKey, plainMissKey]));
    const growableMiss = misses.find((miss) => {
      return miss.key === growableMissKey;
    });
    const plainMiss = misses.find((miss) => {
      return miss.key === plainMissKey;
    });
    expect(growableMiss!.growFrom).toBeDefined();
    expect(plainMiss!.growFrom).toBeUndefined();
  });

  it("never puts growFrom on a hit", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["a", "b"] }));

    const { hits } = await DexieRelationCache.probe([
      _makeKey({ columns: ["a"] }),
    ]);

    expect(hits).toHaveLength(1);
    expect(hits[0]).not.toHaveProperty("growFrom");
  });

  it("returns the full RelationCacheEntry as growFrom, including identityKey and byteSize", async () => {
    await DexieRelationCache.write(
      _makeWrite({ columns: ["a"], payload: new Blob(["x".repeat(50)]) }),
    );

    const { misses } = await DexieRelationCache.probe([
      _makeKey({ columns: ["a", "b"] }),
    ]);

    const growFrom = misses[0]!.growFrom!;
    expect(growFrom.identityKey).toBeDefined();
    expect(growFrom.byteSize).toBe(50);
    expect(growFrom.lastQueriedAt).toBeDefined();
    expect(growFrom).not.toHaveProperty("parquetBlob");
  });

  it("throws when more than one entry could serve as growFrom for the same principal and table", async () => {
    // The single-live-entry rule (write's supersede delete) means this can
    // never happen through the port's own write path, so simulate the §6.2
    // violation directly against the tables to prove probe surfaces it
    // rather than silently choosing one candidate.
    await DexieRelationCache.write(_makeWrite({ columns: ["a"] }));
    const [existing] = await db.RelationCacheEntry.toArray();
    await db.RelationCacheEntry.put({
      ...existing!,
      identityKey: `${existing!.identityKey}-duplicate`,
    });

    await expect(
      DexieRelationCache.probe([_makeKey({ columns: ["a", "b"] })]),
    ).rejects.toThrow(/§6.2/);
  });

  it("never reads a RelationCachePayload row while probing", async () => {
    await DexieRelationCache.write(_makeWrite({ columns: ["a"] }));

    const payloadGet = vi.spyOn(db.RelationCachePayload, "get");
    const payloadToArray = vi.spyOn(db.RelationCachePayload, "toArray");

    await DexieRelationCache.probe([
      _makeKey({ columns: ["a"] }),
      _makeKey({ columns: ["a", "b"] }),
    ]);

    expect(payloadGet).not.toHaveBeenCalled();
    expect(payloadToArray).not.toHaveBeenCalled();

    payloadGet.mockRestore();
    payloadToArray.mockRestore();
  });

  it("reads its candidates and stamps hits inside one transaction, so a write or evict can never land between them", async () => {
    // Same atomicity concern, and same technique, as the `_evict` and
    // `_evictToBudget` tests: reproducing the real race is not possible in
    // this harness, so this asserts the structural property that closes the
    // gap instead. `.where()` is called twice inside `probe` — once for the
    // candidate read, once for the `.modify()` stamp — and both calls must
    // see the very same live transaction.
    await DexieRelationCache.write(_makeWrite({ columns: ["a", "b"] }));

    const transactionsSeen: unknown[] = [];
    const originalWhere = db.RelationCacheEntry.where.bind(
      db.RelationCacheEntry,
    );
    const whereSpy = vi
      .spyOn(db.RelationCacheEntry, "where")
      .mockImplementation((index) => {
        transactionsSeen.push(Dexie.currentTransaction);
        return originalWhere(index);
      });

    await DexieRelationCache.probe([_makeKey({ columns: ["a"] })]);

    whereSpy.mockRestore();

    expect(transactionsSeen).toHaveLength(2);
    transactionsSeen.forEach((transaction) => {
      expect(transaction).toBeTruthy();
    });
    expect(new Set(transactionsSeen).size).toBe(1);
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

  it("supersedes the previous entry when only the source version changes, so two rows can never both satisfy the lookup", async () => {
    // `identityKey` includes `versionToken` (section 4.3), so writing the
    // same relation under a new source version produces a *different*
    // primary key rather than overwriting the old row. `serves()`
    // deliberately never compares `sourceVersion` (section 3: matching it at
    // lookup would make every hit block on a network call). Put those two
    // facts together and, without the single-live-entry supersede delete,
    // the v1 and v2 rows would both satisfy `serves()` for the same
    // principal, relation and definition, and nothing would decide which one
    // answers a query: a false hit that could serve stale rows. The
    // supersede delete in `_write` is the only thing standing between this
    // test and that outcome.
    await DexieRelationCache.write(
      _makeWrite({
        identity: { sourceVersion: "v1" },
        payload: new Blob(["v1-bytes"]),
      }),
    );
    await DexieRelationCache.write(
      _makeWrite({
        identity: { sourceVersion: "v2" },
        payload: new Blob(["v2-bytes"]),
      }),
    );

    const rows = await db.RelationCacheEntry.where("tableName")
      .equals(DATASET_A)
      .and((row) => {
        return row.principalKey === WORKSPACE_PRINCIPAL;
      })
      .toArray();

    // Exactly one row survives, and it is the v2 one.
    expect(rows).toHaveLength(1);
    expect(rows[0]!.sourceVersion).toBe("v2");

    // The v1 payload went with it, so entry and payload stay in step.
    const payloadRows = await db.RelationCachePayload.toArray();
    expect(payloadRows).toHaveLength(1);
    expect(payloadRows[0]!.identityKey).toBe(rows[0]!.identityKey);

    // A probe is unambiguous: it returns the surviving (v2) entry, not a
    // choice between two candidates.
    const { hits } = await DexieRelationCache.probe([_makeKey()]);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.entry.identityKey).toBe(rows[0]!.identityKey);
    expect(hits[0]!.entry.sourceVersion).toBe("v2");
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

describe("DexieRelationCache.write quota handling", () => {
  it("retries once after a quota-exceeded failure and succeeds", async () => {
    let putCalls = 0;
    const originalPut = db.RelationCacheEntry.put.bind(db.RelationCacheEntry);
    const putSpy = vi
      .spyOn(db.RelationCacheEntry, "put")
      .mockImplementation((entry) => {
        putCalls += 1;
        if (putCalls === 1) {
          throw new DOMException(
            "The quota has been exceeded.",
            "QuotaExceededError",
          );
        }
        return originalPut(entry);
      });

    await DexieRelationCache.write(_makeWrite());

    putSpy.mockRestore();
    expect(putCalls).toBe(2);
    const rows = await db.RelationCacheEntry.toArray();
    expect(rows).toHaveLength(1);
  });

  it("throws a typed RelationCacheWriteFailed, carrying the original cause, when the retry also fails", async () => {
    const quotaError = new DOMException(
      "The quota has been exceeded.",
      "QuotaExceededError",
    );
    const putSpy = vi
      .spyOn(db.RelationCacheEntry, "put")
      .mockImplementation(() => {
        throw quotaError;
      });

    const failure = await DexieRelationCache.write(_makeWrite()).catch(
      (error: unknown) => {
        return error;
      },
    );

    putSpy.mockRestore();
    expect(failure).toBeInstanceOf(RelationCacheWriteFailed);
    // Dexie wraps a scope's thrown error into its own `DexieError` before
    // the transaction promise rejects, so the cause is that wrapper (with
    // `.name` still `"QuotaExceededError"` and `.inner` pointing at the
    // original DOMException), not the raw DOMException instance itself.
    const cause = (failure as RelationCacheWriteFailed).cause as {
      name: string;
      inner: unknown;
    };
    expect(cause.name).toBe("QuotaExceededError");
    expect(cause.inner).toBe(quotaError);
  });

  it("propagates an eviction-infrastructure failure during the quota retry as-is, without wrapping it as RelationCacheWriteFailed", async () => {
    // If evictToBudget itself throws while write() is trying to make room
    // for a quota-exceeded retry, that is a genuine Dexie fault, not a
    // cache-full condition. Wrapping it as RelationCacheWriteFailed would
    // let a caller swallow real corruption alongside "could not store
    // this," defeating the point of the typed error, so this pins that the
    // eviction failure reaches the caller unwrapped rather than being
    // "improved" into a wrapped one later.
    const quotaError = new DOMException(
      "The quota has been exceeded.",
      "QuotaExceededError",
    );
    const putSpy = vi
      .spyOn(db.RelationCacheEntry, "put")
      .mockImplementation(() => {
        throw quotaError;
      });
    const evictionFault = new Error("boom: eviction scan failed");
    const orderBySpy = vi
      .spyOn(db.RelationCacheEntry, "orderBy")
      .mockImplementation(() => {
        throw evictionFault;
      });

    const failure = await DexieRelationCache.write(_makeWrite()).catch(
      (error: unknown) => {
        return error;
      },
    );

    putSpy.mockRestore();
    orderBySpy.mockRestore();
    expect(failure).toBe(evictionFault);
    expect(failure).not.toBeInstanceOf(RelationCacheWriteFailed);
  });

  it("propagates a non-quota failure as-is, without attempting eviction", async () => {
    const genuineFault = new Error("boom: corrupted index");
    const putSpy = vi
      .spyOn(db.RelationCacheEntry, "put")
      .mockImplementation(() => {
        throw genuineFault;
      });
    const orderBySpy = vi.spyOn(db.RelationCacheEntry, "orderBy");

    await expect(DexieRelationCache.write(_makeWrite())).rejects.toBe(
      genuineFault,
    );
    expect(orderBySpy).not.toHaveBeenCalled();

    putSpy.mockRestore();
    orderBySpy.mockRestore();
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

  it("reads its candidates and deletes them inside one transaction, so a write can never land between the read and the delete", async () => {
    // A revoked principal's cache entry must not survive eviction. If the
    // candidate read and the delete ran in separate transactions, a `write`
    // landing between them would create a row the read never saw, and that
    // row would survive: revocation would stop being sticky. Reproducing
    // that interleaving directly is not possible in this harness (Dexie and
    // fake-indexeddb serialize same-realm operations, so there is no way to
    // force a `write` to land in the gap between a bare read and a later
    // transaction), so this asserts the structural property that closes the
    // gap instead: the read and every delete run inside the very same
    // Dexie transaction object.
    await DexieRelationCache.write(_makeWrite());

    const transactionsSeen: unknown[] = [];
    const originalWhere = db.RelationCacheEntry.where.bind(
      db.RelationCacheEntry,
    );
    const originalBulkDelete = db.RelationCacheEntry.bulkDelete.bind(
      db.RelationCacheEntry,
    );

    const whereSpy = vi
      .spyOn(db.RelationCacheEntry, "where")
      .mockImplementation((index) => {
        transactionsSeen.push(Dexie.currentTransaction);
        return originalWhere(index);
      });
    const bulkDeleteSpy = vi
      .spyOn(db.RelationCacheEntry, "bulkDelete")
      .mockImplementation((keys) => {
        transactionsSeen.push(Dexie.currentTransaction);
        return originalBulkDelete(keys);
      });

    await DexieRelationCache.evict(
      [{ kind: "dataset", id: DATASET_A }],
      WORKSPACE_PRINCIPAL,
    );

    whereSpy.mockRestore();
    bulkDeleteSpy.mockRestore();

    // Both the read and the delete ran, and both saw a live transaction.
    expect(transactionsSeen).toHaveLength(2);
    transactionsSeen.forEach((transaction) => {
      expect(transaction).toBeTruthy();
    });
    // ...and it was the *same* transaction both times, not two separate
    // ones: that is what makes the read-then-delete atomic.
    expect(new Set(transactionsSeen).size).toBe(1);
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

  it("never evicts an excluded entry, even when it is the least-recently-queried and the budget demands eviction", async () => {
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

    await DexieRelationCache.evictToBudget(0, new Set([oldest.identityKey]));

    const survivors = await db.RelationCacheEntry.toArray();
    expect(
      survivors.map((row) => {
        return row.identityKey;
      }),
    ).toEqual([oldest.identityKey]);
  });

  it("evicts what it can and returns, without looping or throwing, when every entry is excluded and the budget is still exceeded", async () => {
    await DexieRelationCache.write(
      _makeWrite({
        identity: { relation: { kind: "dataset", id: DATASET_A } },
        payload: new Blob(["x".repeat(100)]),
      }),
    );
    await DexieRelationCache.write(
      _makeWrite({
        identity: { relation: { kind: "dataset", id: DATASET_B } },
        payload: new Blob(["y".repeat(100)]),
      }),
    );
    const rows = await db.RelationCacheEntry.toArray();
    const allIdentityKeys = new Set(
      rows.map((row) => {
        return row.identityKey;
      }),
    );

    await expect(
      DexieRelationCache.evictToBudget(0, allIdentityKeys),
    ).resolves.toBeUndefined();

    const survivors = await db.RelationCacheEntry.toArray();
    expect(survivors).toHaveLength(2);
  });

  it("reads its candidates and deletes them inside one transaction, so a write can never land between the read and the delete", async () => {
    // Same atomicity concern, and same technique, as the `_evict` test
    // above: reproducing the real race is not possible in this harness, so
    // this asserts the structural property that closes the gap instead —
    // the read and the delete run inside the very same Dexie transaction.
    await DexieRelationCache.write(_makeWrite());

    const transactionsSeen: unknown[] = [];
    const originalOrderBy = db.RelationCacheEntry.orderBy.bind(
      db.RelationCacheEntry,
    );
    const originalBulkDelete = db.RelationCacheEntry.bulkDelete.bind(
      db.RelationCacheEntry,
    );

    const orderBySpy = vi
      .spyOn(db.RelationCacheEntry, "orderBy")
      .mockImplementation((index) => {
        transactionsSeen.push(Dexie.currentTransaction);
        return originalOrderBy(index);
      });
    const bulkDeleteSpy = vi
      .spyOn(db.RelationCacheEntry, "bulkDelete")
      .mockImplementation((keys) => {
        transactionsSeen.push(Dexie.currentTransaction);
        return originalBulkDelete(keys);
      });

    await DexieRelationCache.evictToBudget(0);

    orderBySpy.mockRestore();
    bulkDeleteSpy.mockRestore();

    expect(transactionsSeen).toHaveLength(2);
    transactionsSeen.forEach((transaction) => {
      expect(transaction).toBeTruthy();
    });
    expect(new Set(transactionsSeen).size).toBe(1);
  });
});
