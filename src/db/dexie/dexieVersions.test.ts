import "fake-indexeddb/auto";
import { afterAll, describe, expect, it } from "vitest";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "./dexieVersions";

const db = AvaDexieVersionManager.getVersion("v5");

afterAll(async () => {
  await db.delete();
});

describe("AvaDexie v5 privacy audit schema", () => {
  it("registers both audit models and their query indexes", async () => {
    await db.open();

    expect(CURRENT_AVA_DEXIE_VERSION).toBe("v5");
    expect(
      db.ConsentAuditEntry.schema.indexes.map(({ name }) => {
        return name;
      }),
    ).toEqual(
      expect.arrayContaining([
        "workspaceId",
        "userId",
        "timestamp",
        "context",
        "decision",
      ]),
    );
    expect(
      db.ClarificationAuditEntry.schema.indexes.map(({ name }) => {
        return name;
      }),
    ).toEqual(
      expect.arrayContaining([
        "workspaceId",
        "timestamp",
        "outcome",
        "turnNumber",
      ]),
    );
  });
});
