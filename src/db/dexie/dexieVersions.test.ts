import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "./dexieVersions";

const db = AvaDexieVersionManager.getVersion("v6");

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

const v6Schemas = {
  ...v5Schemas,
  PlanAnnotation: {
    primaryKey: "id",
    indexes: ["planId", "createdAt"],
  },
  PlanStepBlob: {
    primaryKey: "id",
    indexes: ["planId", "stepId", "savedAt"],
  },
} as const;

afterAll(async () => {
  await db.delete();
});

describe("AvaDexie v6 schema", () => {
  it("is current and preserves every v5 table while adding both plan tables", async () => {
    await db.open();

    expect(CURRENT_AVA_DEXIE_VERSION).toBe("v6");
    expect(
      db.tables
        .map(({ name }) => {
          return name;
        })
        .sort(),
    ).toEqual(
      [...Object.keys(v6Schemas), "meta"].sort(),
    );

    Object.entries(v6Schemas).forEach(
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

  it("uses a no-op upgrader that preserves existing v5 rows", async () => {
    db.close();
    await Dexie.delete("AvandarDB");

    const v5Database = new Dexie("AvandarDB");
    v5Database.version(5).stores({
      meta: "&key",
      LocalDataset: "&datasetId,userId,workspaceId",
      LocalPublicDataset: "&datasetId,dashboardId",
      ConsentAuditEntry: "&id,workspaceId,userId,timestamp,context,decision",
      ClarificationAuditEntry: "&id,workspaceId,timestamp,outcome,turnNumber",
    });
    await v5Database.open();
    await v5Database.table("ConsentAuditEntry").put({ id: "preserved-entry" });
    v5Database.close();

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
  });
});
