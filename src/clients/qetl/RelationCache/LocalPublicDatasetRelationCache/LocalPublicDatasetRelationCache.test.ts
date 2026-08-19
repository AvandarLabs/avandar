import "fake-indexeddb/auto";
import {
  makePrincipalKeyFromPublicSession,
  makePrincipalKeyFromWorkspaceSession,
} from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { RelationCacheWriteFailed } from "$/models/relations/RelationCachePort/RelationCacheWriteFailed";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalPublicDatasetRelationCache } from "@/clients/qetl/RelationCache/LocalPublicDatasetRelationCache/LocalPublicDatasetRelationCache";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "@/db/dexie/dexieVersions/dexieVersions";
import type { LocalPublicDataset } from "@/models/LocalPublicDataset/LocalPublicDataset";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { RelationCacheKey } from "$/models/relations/RelationCacheKey/RelationCacheKey.types";
import type { RelationCacheWrite } from "$/models/relations/RelationCachePort/RelationCachePort.types";

const db = AvaDexieVersionManager.getVersion(CURRENT_AVA_DEXIE_VERSION);

const DASHBOARD_ID = "44444444-4444-4444-8444-444444444444" as Dashboard.Id;
const OTHER_DASHBOARD_ID =
  "55555555-5555-4555-8555-555555555555" as Dashboard.Id;
const USER_ID = "66666666-6666-4666-8666-666666666666";

const DATASET_A = "0f2c9f3e-1111-4222-8333-a1b2c3d4e5f6" as Dataset.Id;
const DATASET_B = "0f2c9f3e-2222-4222-8333-a1b2c3d4e5f6" as Dataset.Id;
const CONCEPT_ID = "77777777-8888-4999-8aaa-bbbbbbbbbbbb" as Concept.Id;

const SNAPSHOT_REVISION = "1";
const OTHER_SNAPSHOT_REVISION = "2";
const BUCKET = SnapshotStorageUtils.PUBLIC_BUCKET_NAME;

const PUBLIC_PRINCIPAL = makePrincipalKeyFromPublicSession({
  bucket: BUCKET,
  dashboardId: DASHBOARD_ID,
  snapshotRevision: SNAPSHOT_REVISION,
});

function _makeWrite(
  overrides: {
    payload?: Blob;
    identity?: Partial<RelationCacheWrite["identity"]>;
  } = {},
): RelationCacheWrite {
  return {
    payload: overrides.payload ?? new Blob(["parquet-bytes"]),
    columns: "all",
    identity: {
      principal: PUBLIC_PRINCIPAL,
      relation: { kind: "dataset", id: DATASET_A },
      definition: undefined,
      sourceVersion: undefined,
      ...overrides.identity,
    },
  };
}

function _makeKey(overrides: Partial<RelationCacheKey> = {}): RelationCacheKey {
  return {
    principal: PUBLIC_PRINCIPAL,
    relation: { kind: "dataset", id: DATASET_A },
    definition: undefined,
    sourceVersion: undefined,
    columns: "all",
    ...overrides,
  };
}

beforeEach(async () => {
  await db.open();
  await db.LocalPublicDataset.clear();
});

afterAll(async () => {
  await db.delete();
});

describe("LocalPublicDatasetRelationCache.probe", () => {
  it("hits when the principal, dashboard and dataset all match the stored snapshot", async () => {
    await LocalPublicDatasetRelationCache.write(_makeWrite());

    const { hits, misses } = await LocalPublicDatasetRelationCache.probe([
      _makeKey(),
    ]);

    expect(misses).toHaveLength(0);
    expect(hits).toHaveLength(1);
    const payload = await LocalPublicDatasetRelationCache.readPayload(
      hits[0]!.entry,
    );
    expect(payload).toBeDefined();
  });

  it("misses when the principal names a different snapshotRevision than what is stored", async () => {
    await LocalPublicDatasetRelationCache.write(_makeWrite());
    const otherRevisionPrincipal = makePrincipalKeyFromPublicSession({
      bucket: BUCKET,
      dashboardId: DASHBOARD_ID,
      snapshotRevision: OTHER_SNAPSHOT_REVISION,
    });

    const { hits, misses } = await LocalPublicDatasetRelationCache.probe([
      _makeKey({ principal: otherRevisionPrincipal }),
    ]);

    expect(hits).toHaveLength(0);
    expect(misses).toHaveLength(1);
    expect(misses[0]!.growFrom).toBeUndefined();
  });

  it("misses when the principal names a different dashboardId than what is stored", async () => {
    await LocalPublicDatasetRelationCache.write(_makeWrite());
    const otherDashboardPrincipal = makePrincipalKeyFromPublicSession({
      bucket: BUCKET,
      dashboardId: OTHER_DASHBOARD_ID,
      snapshotRevision: SNAPSHOT_REVISION,
    });

    const { hits, misses } = await LocalPublicDatasetRelationCache.probe([
      _makeKey({ principal: otherDashboardPrincipal }),
    ]);

    expect(hits).toHaveLength(0);
    expect(misses).toHaveLength(1);
    expect(misses[0]!.growFrom).toBeUndefined();
  });

  it("misses a concept relation, because this port never stores anything but datasets", async () => {
    await LocalPublicDatasetRelationCache.write(_makeWrite());

    const { hits, misses } = await LocalPublicDatasetRelationCache.probe([
      _makeKey({ relation: { kind: "concept", id: CONCEPT_ID } }),
    ]);

    expect(hits).toHaveLength(0);
    expect(misses).toHaveLength(1);
    expect(misses[0]!.growFrom).toBeUndefined();
  });

  it("never serves a workspace-session principal, no matter what is stored", async () => {
    await LocalPublicDatasetRelationCache.write(_makeWrite());
    // Adversarial: the workspace principal's workspaceId is deliberately set
    // to the very dashboardId that IS stored, so a implementation that
    // forgot to check the "p" vs "w" prefix and only compared positional
    // segments could be fooled into a false hit.
    const workspacePrincipal = makePrincipalKeyFromWorkspaceSession({
      workspaceId: DASHBOARD_ID,
      userId: USER_ID,
    });

    const { hits, misses } = await LocalPublicDatasetRelationCache.probe([
      _makeKey({ principal: workspacePrincipal }),
    ]);

    expect(hits).toHaveLength(0);
    expect(misses).toHaveLength(1);
    expect(misses[0]!.growFrom).toBeUndefined();
  });

  it("never serves a synthetic principal that has four colon-delimited segments but the workspace prefix", async () => {
    await LocalPublicDatasetRelationCache.write(_makeWrite());
    // Same shape as a real public principal (bucket, dashboardId, revision)
    // but the leading token is "w" instead of "p". This pins the explicit
    // prefix check rather than a segment-count check alone.
    const fourSegmentWorkspacePrincipal = `w:${BUCKET}:${DASHBOARD_ID}:${SNAPSHOT_REVISION}`;

    const { hits, misses } = await LocalPublicDatasetRelationCache.probe([
      _makeKey({ principal: fourSegmentWorkspacePrincipal }),
    ]);

    expect(hits).toHaveLength(0);
    expect(misses).toHaveLength(1);
    expect(misses[0]!.growFrom).toBeUndefined();
  });

  it("partitions a mixed batch so every key lands in exactly one of hits or misses, with no drops or duplicates", async () => {
    await LocalPublicDatasetRelationCache.write(
      _makeWrite({
        identity: { relation: { kind: "dataset", id: DATASET_A } },
      }),
    );

    const hitKey = _makeKey({ relation: { kind: "dataset", id: DATASET_A } });
    const wrongRevisionKey = _makeKey({
      relation: { kind: "dataset", id: DATASET_A },
      principal: makePrincipalKeyFromPublicSession({
        bucket: BUCKET,
        dashboardId: DASHBOARD_ID,
        snapshotRevision: OTHER_SNAPSHOT_REVISION,
      }),
    });
    const neverWrittenKey = _makeKey({
      relation: { kind: "dataset", id: DATASET_B },
    });
    const keys = [hitKey, wrongRevisionKey, neverWrittenKey];

    const { hits, misses } = await LocalPublicDatasetRelationCache.probe(keys);

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
    misses.forEach((miss) => {
      expect(miss.growFrom).toBeUndefined();
    });
  });

  it("never puts growFrom on a hit", async () => {
    await LocalPublicDatasetRelationCache.write(_makeWrite());

    const { hits } = await LocalPublicDatasetRelationCache.probe([_makeKey()]);

    expect(hits).toHaveLength(1);
    expect(hits[0]).not.toHaveProperty("growFrom");
  });
});

describe("LocalPublicDatasetRelationCache.readPayload", () => {
  it("returns the row's stored payload for a servable entry", async () => {
    await LocalPublicDatasetRelationCache.write(_makeWrite());
    const { hits } = await LocalPublicDatasetRelationCache.probe([_makeKey()]);

    // Not asserting `instanceof Blob` or `.size`: fake-indexeddb's
    // structured clone downgrades a Blob to a plain object in this jsdom
    // harness, which no real browser does (see the identical note in
    // dexieVersions.test.ts). Presence is what this covers.
    const readBack = await LocalPublicDatasetRelationCache.readPayload(
      hits[0]!.entry,
    );

    expect(readBack).toBeDefined();
  });

  it("returns undefined once the underlying row has been deleted", async () => {
    await LocalPublicDatasetRelationCache.write(_makeWrite());
    const { hits } = await LocalPublicDatasetRelationCache.probe([_makeKey()]);
    await db.LocalPublicDataset.delete([DASHBOARD_ID, DATASET_A]);

    const readBack = await LocalPublicDatasetRelationCache.readPayload(
      hits[0]!.entry,
    );

    expect(readBack).toBeUndefined();
  });
});

describe("LocalPublicDatasetRelationCache.write", () => {
  it("overwrites the row when a new snapshotRevision downloads for the same dashboard and dataset", async () => {
    await LocalPublicDatasetRelationCache.write(
      _makeWrite({ payload: new Blob(["v1-bytes"]) }),
    );
    const newRevisionPrincipal = makePrincipalKeyFromPublicSession({
      bucket: BUCKET,
      dashboardId: DASHBOARD_ID,
      snapshotRevision: OTHER_SNAPSHOT_REVISION,
    });
    await LocalPublicDatasetRelationCache.write(
      _makeWrite({
        payload: new Blob(["v2-bytes"]),
        identity: { principal: newRevisionPrincipal },
      }),
    );

    const rows = await db.LocalPublicDataset.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.snapshotRevision).toBe(OTHER_SNAPSHOT_REVISION);

    const { hits: oldHits, misses: oldMisses } =
      await LocalPublicDatasetRelationCache.probe([_makeKey()]);
    expect(oldHits).toHaveLength(0);
    expect(oldMisses).toHaveLength(1);

    const { hits: newHits } = await LocalPublicDatasetRelationCache.probe([
      _makeKey({ principal: newRevisionPrincipal }),
    ]);
    expect(newHits).toHaveLength(1);
  });

  it("throws when asked to store a non-dataset relation", async () => {
    await expect(
      LocalPublicDatasetRelationCache.write(
        _makeWrite({
          identity: { relation: { kind: "concept", id: CONCEPT_ID } },
        }),
      ),
    ).rejects.toThrow(/dataset/);
  });

  it("throws when the identity's principal is not a public-session principal", async () => {
    const workspacePrincipal = makePrincipalKeyFromWorkspaceSession({
      workspaceId: DASHBOARD_ID,
      userId: USER_ID,
    });

    await expect(
      LocalPublicDatasetRelationCache.write(
        _makeWrite({ identity: { principal: workspacePrincipal } }),
      ),
    ).rejects.toThrow(/public-session principal/);
  });

  it("retries once after a quota-exceeded failure and succeeds", async () => {
    let putCalls = 0;
    const originalPut = db.LocalPublicDataset.put.bind(db.LocalPublicDataset);
    const putSpy = vi
      .spyOn(db.LocalPublicDataset, "put")
      .mockImplementation((row) => {
        putCalls += 1;
        if (putCalls === 1) {
          throw new DOMException(
            "The quota has been exceeded.",
            "QuotaExceededError",
          );
        }
        return originalPut(row);
      });

    await LocalPublicDatasetRelationCache.write(_makeWrite());

    putSpy.mockRestore();
    expect(putCalls).toBe(2);
    const rows = await db.LocalPublicDataset.toArray();
    expect(rows).toHaveLength(1);
  });

  it("throws a typed RelationCacheWriteFailed, carrying the original cause, when the retry also fails", async () => {
    const quotaError = new DOMException(
      "The quota has been exceeded.",
      "QuotaExceededError",
    );
    const putSpy = vi
      .spyOn(db.LocalPublicDataset, "put")
      .mockImplementation(() => {
        throw quotaError;
      });

    const failure = await LocalPublicDatasetRelationCache.write(
      _makeWrite(),
    ).catch((error: unknown) => {
      return error;
    });

    putSpy.mockRestore();
    expect(failure).toBeInstanceOf(RelationCacheWriteFailed);
    const cause = (failure as RelationCacheWriteFailed).cause as {
      name: string;
    };
    expect(cause.name).toBe("QuotaExceededError");
  });
});

describe("LocalPublicDatasetRelationCache.evict", () => {
  it("forgets the entry for the given relation and principal, leaving a different dashboard's entry for the same dataset untouched", async () => {
    await LocalPublicDatasetRelationCache.write(_makeWrite());
    const otherDashboardPrincipal = makePrincipalKeyFromPublicSession({
      bucket: BUCKET,
      dashboardId: OTHER_DASHBOARD_ID,
      snapshotRevision: SNAPSHOT_REVISION,
    });
    await LocalPublicDatasetRelationCache.write(
      _makeWrite({ identity: { principal: otherDashboardPrincipal } }),
    );

    await LocalPublicDatasetRelationCache.evict(
      [{ kind: "dataset", id: DATASET_A }],
      PUBLIC_PRINCIPAL,
    );

    const survivors = await db.LocalPublicDataset.toArray();
    expect(survivors).toHaveLength(1);
    expect(survivors[0]!.dashboardId).toBe(OTHER_DASHBOARD_ID);
  });

  it("no-ops without throwing when the principal is not a public-session principal", async () => {
    await LocalPublicDatasetRelationCache.write(_makeWrite());
    const workspacePrincipal = makePrincipalKeyFromWorkspaceSession({
      workspaceId: DASHBOARD_ID,
      userId: USER_ID,
    });

    await expect(
      LocalPublicDatasetRelationCache.evict(
        [{ kind: "dataset", id: DATASET_A }],
        workspacePrincipal,
      ),
    ).resolves.toBeUndefined();

    const survivors = await db.LocalPublicDataset.toArray();
    expect(survivors).toHaveLength(1);
  });
});

describe("LocalPublicDatasetRelationCache.touch", () => {
  it("resolves without altering the stored row in any way", async () => {
    await LocalPublicDatasetRelationCache.write(_makeWrite());
    const [before] = await db.LocalPublicDataset.toArray();

    await LocalPublicDatasetRelationCache.touch("anything");

    const [after] = await db.LocalPublicDataset.toArray();
    expect(after).toEqual(before);
  });
});

describe("LocalPublicDatasetRelationCache.evictToBudget", () => {
  // Every test here stubs `toArray` to hand back in-memory rows rather than
  // writing through Dexie first: fake-indexeddb's structured clone
  // downgrades a Blob to a plain object in this jsdom harness (the same
  // limitation documented in the readPayload tests above and in
  // dexieVersions.test.ts), which would zero out `.size` and make every
  // budget comparison below meaningless. No real browser does this, so
  // stubbing is what lets these tests exercise the real byte-size sort.
  const OLDER_ROW: LocalPublicDataset.Read = {
    dashboardId: DASHBOARD_ID,
    datasetId: DATASET_A,
    bucket: BUCKET,
    snapshotRevision: SNAPSHOT_REVISION,
    parquetData: new Blob(["x".repeat(100)]),
    downloadedAt: new Date(1_000).toISOString(),
  };
  const NEWER_ROW: LocalPublicDataset.Read = {
    dashboardId: OTHER_DASHBOARD_ID,
    datasetId: DATASET_B,
    bucket: BUCKET,
    snapshotRevision: SNAPSHOT_REVISION,
    parquetData: new Blob(["y".repeat(100)]),
    downloadedAt: new Date(2_000).toISOString(),
  };

  it("evicts the least-recently-downloaded row first to respect the byte budget", async () => {
    const toArraySpy = vi
      .spyOn(db.LocalPublicDataset, "toArray")
      .mockResolvedValue([OLDER_ROW, NEWER_ROW]);
    const bulkDeleteSpy = vi
      .spyOn(db.LocalPublicDataset, "bulkDelete")
      .mockResolvedValue(undefined);

    await LocalPublicDatasetRelationCache.evictToBudget(150);

    // Asserted before `mockRestore()`: restoring a vitest spy also clears
    // its recorded calls, so an assertion made afterward would silently
    // check an already-wiped call list.
    expect(bulkDeleteSpy).toHaveBeenCalledTimes(1);
    expect(bulkDeleteSpy).toHaveBeenCalledWith([[DASHBOARD_ID, DATASET_A]]);
    toArraySpy.mockRestore();
    bulkDeleteSpy.mockRestore();
  });

  it("never evicts a row named in excludeIdentityKeys, even when it is the oldest and the budget demands eviction", async () => {
    const toArraySpy = vi
      .spyOn(db.LocalPublicDataset, "toArray")
      .mockResolvedValue([OLDER_ROW, NEWER_ROW]);
    const bulkDeleteSpy = vi
      .spyOn(db.LocalPublicDataset, "bulkDelete")
      .mockResolvedValue(undefined);
    const excludeIdentityKeys = new Set([`${DASHBOARD_ID}|${DATASET_A}`]);

    await LocalPublicDatasetRelationCache.evictToBudget(0, excludeIdentityKeys);

    expect(bulkDeleteSpy).toHaveBeenCalledTimes(1);
    expect(bulkDeleteSpy).toHaveBeenCalledWith([
      [OTHER_DASHBOARD_ID, DATASET_B],
    ]);
    toArraySpy.mockRestore();
    bulkDeleteSpy.mockRestore();
  });

  it("evicts nothing when stored bytes are already under budget", async () => {
    const toArraySpy = vi
      .spyOn(db.LocalPublicDataset, "toArray")
      .mockResolvedValue([OLDER_ROW]);
    const bulkDeleteSpy = vi
      .spyOn(db.LocalPublicDataset, "bulkDelete")
      .mockResolvedValue(undefined);

    await LocalPublicDatasetRelationCache.evictToBudget(1_000_000);

    expect(bulkDeleteSpy).not.toHaveBeenCalled();
    toArraySpy.mockRestore();
    bulkDeleteSpy.mockRestore();
  });
});
