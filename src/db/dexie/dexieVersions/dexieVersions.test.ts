import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "./dexieVersions";

const db = AvaDexieVersionManager.getVersion("v7");

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

afterAll(async () => {
  await db.delete();
});

describe("AvaDexie v7 schema", () => {
  it("is current and removes the planning tables", async () => {
    await db.open();

    expect(CURRENT_AVA_DEXIE_VERSION).toBe("v7");
    expect(
      db.tables
        .map(({ name }) => {
          return name;
        })
        .sort(),
    ).toEqual([...Object.keys(v7Schemas), "meta"].sort());

    Object.entries(v7Schemas).forEach(
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

  it("drops planning rows while preserving existing privacy audit rows", async () => {
    db.close();
    await Dexie.delete("AvandarDB");

    const v6Database = new Dexie("AvandarDB");
    v6Database.version(6).stores({
      meta: "&key",
      LocalDataset: "&datasetId,userId,workspaceId",
      LocalPublicDataset: "&datasetId,dashboardId",
      ConsentAuditEntry: "&id,workspaceId,userId,timestamp,context,decision",
      ClarificationAuditEntry: "&id,workspaceId,timestamp,outcome,turnNumber",
      PlanAnnotation: "&id,planId,createdAt",
      PlanStepBlob: "&id,planId,stepId,savedAt",
    });
    await v6Database.open();
    await v6Database.table("ConsentAuditEntry").put({ id: "preserved-entry" });
    await v6Database.table("PlanAnnotation").put({ id: "deleted-annotation" });
    await v6Database.table("PlanStepBlob").put({ id: "deleted-step" });
    v6Database.close();

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
      // JSDOM does not implement the application reload triggered by upgrades.
    });
    try {
      await db.open();
    } finally {
      consoleError.mockRestore();
    }

    await expect(
      db.table("ConsentAuditEntry").get("preserved-entry"),
    ).resolves.toMatchObject({ id: "preserved-entry" });
    expect(
      db.tables.map(({ name }) => {
        return name;
      }),
    ).not.toContain("PlanAnnotation");
    expect(
      db.tables.map(({ name }) => {
        return name;
      }),
    ).not.toContain("PlanStepBlob");
  });
});
