import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterAll, describe, expect, it, vi } from "vitest";
import { AvaDexieVersionManager } from "./dexieVersions";

const db = AvaDexieVersionManager.getVersion("v8");

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
const v8Schemas = {
  ...v7Schemas,
  LocalPublicDataset: {
    primaryKey: "[dashboardId+datasetId]",
    indexes: ["dashboardId"],
  },
} as const;

afterAll(async () => {
  await db.delete();
});

async function _seedLegacyDatabase(): Promise<void> {
  const legacyDatabase = new Dexie("AvandarDB");
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
  await legacyDatabase.table("ConsentAuditEntry").put({
    id: "preserved-entry",
  });
  await legacyDatabase.table("LocalPublicDataset").put({
    dashboardId: "old-dashboard",
    datasetId: "old-dataset",
  });
  await legacyDatabase.table("PlanAnnotation").put({
    id: "deleted-annotation",
  });
  await legacyDatabase.table("PlanStepBlob").put({ id: "deleted-step" });
  legacyDatabase.close();
}

async function _assertLegacyMigrationResult(): Promise<void> {
  await expect(
    db.table("ConsentAuditEntry").get("preserved-entry"),
  ).resolves.toMatchObject({ id: "preserved-entry" });
  await expect(
    db.table("LocalPublicDataset").get(["old-dashboard", "old-dataset"]),
  ).resolves.toBeUndefined();
  const tableNames = db.tables.map(({ name }) => {
    return name;
  });
  expect(tableNames).not.toContain("PlanAnnotation");
  expect(tableNames).not.toContain("PlanStepBlob");
}

describe("AvaDexie v8 schema", () => {
  it("is current and removes the planning tables", async () => {
    await db.open();

    expect(
      db.tables
        .map(({ name }) => {
          return name;
        })
        .sort(),
    ).toEqual([...Object.keys(v8Schemas), "meta"].sort());

    Object.entries(v8Schemas).forEach(
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

  it("keys the public snapshot cache by dashboard and dataset together", () => {
    // Two dashboards can publish the same dataset with different slices. Keyed
    // by datasetId alone they overwrite each other, so a private snapshot can
    // be served into a public dashboard's render.
    expect(db.LocalPublicDataset.schema.primKey.keyPath).toEqual([
      "dashboardId",
      "datasetId",
    ]);
  });

  it("clears public snapshot cache while preserving existing privacy audit rows", async () => {
    db.close();
    await Dexie.delete("AvandarDB");
    await _seedLegacyDatabase();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
      // JSDOM does not implement the application reload triggered by upgrades.
    });
    try {
      await db.open();
    } finally {
      consoleError.mockRestore();
    }

    await _assertLegacyMigrationResult();
  });
});
