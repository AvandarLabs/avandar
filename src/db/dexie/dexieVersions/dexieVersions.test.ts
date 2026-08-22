import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterAll, describe, expect, it, vi } from "vitest";

import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "./dexieVersions";

const db = AvaDexieVersionManager.getVersion(CURRENT_AVA_DEXIE_VERSION);

const v5Schemas = {
  LocalDatasetEntry: {
    primaryKey: "datasetId",
    indexes: [],
  },
  LocalDataset: {
    primaryKey: "datasetId",
    indexes: ["userId", "workspaceId"],
  },
  LocalPublicDataset: {
    primaryKey: "datasetId",
    indexes: ["dashboardId"],
  },
  ConsentAuditEntry: {
    primaryKey: "id",
    indexes: ["workspaceId", "userId", "timestamp", "context", "decision"],
  },
  ClarificationAuditEntry: {
    primaryKey: "id",
    indexes: ["workspaceId", "timestamp", "outcome", "turnNumber"],
  },
} as const;

const v7Schemas = v5Schemas;

// v8 drops `LocalPublicDataset` entirely and v9 recreates it with a compound
// primary key, because IndexedDB cannot re-key a store in place.
const v9Schemas = {
  ...v7Schemas,
  LocalPublicDataset: {
    primaryKey: "[dashboardId+datasetId]",
    indexes: ["dashboardId"],
  },
} as const;

// v10 adds the relation cache's two tables and deletes nothing.
const v10Schemas = {
  ...v9Schemas,
  RelationCacheEntry: {
    primaryKey: "identityKey",
    indexes: ["tableName", "principalKey", "lastQueriedAt"],
  },
  RelationCachePayload: {
    primaryKey: "identityKey",
    indexes: [],
  },
} as const;

/** The store names IndexedDB physically holds, as opposed to Dexie's schema. */
function _readStoredTableNames(): readonly string[] {
  return Array.from(db.backendDB().objectStoreNames);
}

/**
 * The key path IndexedDB physically stored for a table.
 *
 * `table.schema.primKey.keyPath` only reports the schema Dexie *declared*, so
 * it shows the intended key even when the upgrade never reached the backing
 * store. Reading the object store from the same open connection is the only
 * way to prove the store was really rebuilt.
 */
function _readStoredKeyPath(
  tableName: string,
): string | readonly string[] | null {
  return db.backendDB().transaction(tableName).objectStore(tableName).keyPath;
}

/**
 * Replaces the database with one written by an older release, then reopens the
 * current version through the real Dexie upgrade path.
 */
async function _upgradeFromLegacyDatabase(
  seed: (legacyDatabase: Dexie) => Promise<void>,
): Promise<void> {
  db.close();
  await Dexie.delete("AvandarDB");

  const legacyDatabase = new Dexie("AvandarDB");
  await seed(legacyDatabase);
  legacyDatabase.close();

  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
    // JSDOM does not implement the application reload triggered by upgrades.
  });
  try {
    await db.open();
  } finally {
    consoleError.mockRestore();
  }
}

async function _seedV6Database(legacyDatabase: Dexie): Promise<void> {
  legacyDatabase.version(6).stores({
    meta: "&key",
    LocalDataset: "&datasetId,userId,workspaceId",
    LocalPublicDataset: "&datasetId,dashboardId",
    ConsentAuditEntry: "&id,workspaceId,userId,timestamp,context,decision",
    ClarificationAuditEntry: "&id,workspaceId,timestamp,outcome,turnNumber",
    PlanAnnotation: "&id,planId,createdAt",
    PlanStepBlob: "&id,planId,stepId,savedAt",
  });
  await legacyDatabase.open();
  await legacyDatabase
    .table("ConsentAuditEntry")
    .put({ id: "preserved-entry" });
  await legacyDatabase.table("LocalPublicDataset").put({
    dashboardId: "old-dashboard",
    datasetId: "old-dataset",
  });
  await legacyDatabase
    .table("PlanAnnotation")
    .put({ id: "deleted-annotation" });
  await legacyDatabase.table("PlanStepBlob").put({ id: "deleted-step" });
}

async function _seedV7Database(legacyDatabase: Dexie): Promise<void> {
  legacyDatabase.version(7).stores({
    meta: "&key",
    LocalDatasetEntry: "&datasetId",
    LocalDataset: "&datasetId,userId,workspaceId",
    LocalPublicDataset: "&datasetId,dashboardId",
    ConsentAuditEntry: "&id,workspaceId,userId,timestamp,context,decision",
    ClarificationAuditEntry: "&id,workspaceId,timestamp,outcome,turnNumber",
  });
  await legacyDatabase.open();
  await legacyDatabase
    .table("ConsentAuditEntry")
    .put({ id: "preserved-entry" });
  await legacyDatabase.table("LocalPublicDataset").put({
    dashboardId: "old-dashboard",
    datasetId: "old-dataset",
  });
}

/**
 * A populated v9 database, including a `LocalDataset` row carrying
 * `parquetData`. `startDatasetUpload` stages resumable-upload bytes in that
 * same column, so v10 must leave it untouched rather than treat it as a
 * cache to clear.
 */
async function _seedV9DatabaseWithParquetData(
  legacyDatabase: Dexie,
): Promise<void> {
  legacyDatabase.version(9).stores({
    meta: "&key",
    LocalDataset: "&datasetId,userId,workspaceId",
    LocalPublicDataset: "&[dashboardId+datasetId],dashboardId",
    ConsentAuditEntry: "&id,workspaceId,userId,timestamp,context,decision",
    ClarificationAuditEntry: "&id,workspaceId,timestamp,outcome,turnNumber",
  });
  await legacyDatabase.open();
  await legacyDatabase.table("LocalDataset").put({
    datasetId: "staged-dataset",
    parquetData: new Blob(["parquet-bytes"]),
  });
}

/**
 * A store that was rebuilt has to be usable, not merely present. Writing and
 * reading back by compound key is the positive control for the emptiness
 * assertions, which would also pass against a store that does not exist.
 */
async function _assertCompoundKeyRoundTrips(): Promise<void> {
  const table = db.table("LocalPublicDataset");
  await table.put({
    dashboardId: "new-dashboard",
    datasetId: "new-dataset",
    downloadedAt: "2026-01-01T00:00:00.000Z",
  });
  await expect(
    table.get(["new-dashboard", "new-dataset"]),
  ).resolves.toMatchObject({ dashboardId: "new-dashboard" });
  await table.clear();
}

afterAll(async () => {
  await db.delete();
});

describe("AvaDexie v10 schema", () => {
  it("is current and keeps every earlier table", async () => {
    await db.open();

    expect(
      db.tables
        .map(({ name }) => {
          return name;
        })
        .sort(),
    ).toEqual([...Object.keys(v10Schemas), "meta"].sort());

    Object.entries(v10Schemas).forEach(
      ([tableName, { primaryKey, indexes }]) => {
        const table = db.table(tableName);

        expect(table.schema.primKey.name).toBe(primaryKey);
        expect(
          table.schema.indexes.map(({ name }) => {
            return name;
          }),
        ).toEqual(indexes);
      },
    );
  });

  it("adds the relation cache tables without deleting anything", async () => {
    await _upgradeFromLegacyDatabase(_seedV9DatabaseWithParquetData);

    const storedTableNames = _readStoredTableNames();
    expect(storedTableNames).toContain("RelationCacheEntry");
    expect(storedTableNames).toContain("RelationCachePayload");

    await expect(db.table("RelationCacheEntry").count()).resolves.toBe(0);
    await expect(db.table("RelationCachePayload").count()).resolves.toBe(0);

    // The resumable-upload staging blob survives untouched: v10 must not
    // treat `LocalDataset.parquetData` as a cache it is free to clear. (Not
    // asserting `instanceof Blob`: fake-indexeddb's structured clone
    // downgrades a Blob to a plain object, which no browser does. The key
    // surviving, rather than being stripped by the migration, is what this
    // covers.)
    const stagedRow = await db.table("LocalDataset").get("staged-dataset");
    expect(stagedRow).toBeDefined();
    expect(Object.keys(stagedRow!)).toContain("parquetData");
    expect(stagedRow!.parquetData).toBeDefined();
  });

  it("keys the public snapshot cache by dashboard and dataset together", () => {
    // Two dashboards can publish the same dataset with different slices. Keyed
    // by datasetId alone they overwrite each other, so a private snapshot can
    // be served into a public dashboard's render.
    expect(db.LocalPublicDataset.schema.primKey.keyPath).toEqual([
      "dashboardId",
      "datasetId",
    ]);
    expect(_readStoredKeyPath("LocalPublicDataset")).toEqual([
      "dashboardId",
      "datasetId",
    ]);
  });

  it("rebuilds the public snapshot store when upgrading a populated v6 database", async () => {
    await _upgradeFromLegacyDatabase(_seedV6Database);

    // The store must be physically recreated. Dexie reports the declared
    // compound key either way, so only the backing store proves the rebuild.
    expect(_readStoredKeyPath("LocalPublicDataset")).toEqual([
      "dashboardId",
      "datasetId",
    ]);
    await expect(db.table("LocalPublicDataset").count()).resolves.toBe(0);
    await _assertCompoundKeyRoundTrips();

    // Unrelated data survives the rebuild.
    await expect(
      db.table("ConsentAuditEntry").get("preserved-entry"),
    ).resolves.toMatchObject({ id: "preserved-entry" });

    const storedTableNames = _readStoredTableNames();
    expect(storedTableNames).not.toContain("PlanAnnotation");
    expect(storedTableNames).not.toContain("PlanStepBlob");
  });

  it("rebuilds the public snapshot store when upgrading a populated v7 database", async () => {
    // A v7 database is the common case in the wild. Re-keying the store in
    // place made Dexie abort the whole upgrade with "Not yet support for
    // changing primary key", so the database never opened at all.
    await _upgradeFromLegacyDatabase(_seedV7Database);

    expect(_readStoredKeyPath("LocalPublicDataset")).toEqual([
      "dashboardId",
      "datasetId",
    ]);
    await expect(db.table("LocalPublicDataset").count()).resolves.toBe(0);
    await _assertCompoundKeyRoundTrips();

    await expect(
      db.table("ConsentAuditEntry").get("preserved-entry"),
    ).resolves.toMatchObject({ id: "preserved-entry" });
  });
});
