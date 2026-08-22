import "fake-indexeddb/auto";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "@/db/dexie/dexieVersions/dexieVersions";
import { LocalDatasetParsers } from "@/models/LocalDataset/LocalDatasetParsers";

const db = AvaDexieVersionManager.getVersion(CURRENT_AVA_DEXIE_VERSION);

const datasetId = "11111111-1111-4111-8111-111111111111" as DatasetId;
const workspaceId = "22222222-2222-4222-8222-222222222222" as WorkspaceId;
const userId = "33333333-3333-4333-8333-333333333333" as UserId;

/**
 * Mirrors the row the CSV sniff phase (`LocalDatasetClient.startCsvImport`)
 * writes: `parseStatus="parsing"` with the source bytes cached so the
 * background parquet transcoding can resume after a refresh.
 */
async function _writeParsingRowWithCachedSourceBytes(): Promise<void> {
  const sourceBytes = new Blob(["date,Lat\n2020-01-22,15.0\n"], {
    type: "text/csv",
  });
  await db.LocalDataset.put({
    datasetId,
    workspaceId,
    userId,
    parquetData: undefined,
    parseStatus: "parsing",
    parseStartedAt: 1_700_000_000_000,
    parseFailedReason: undefined,
    sourceBytes,
    sourceFileName: "long-global-confirmed-cases.csv",
    sourceFileType: "csv",
    sourceFileSize: sourceBytes.size,
    lastSourceAccessedAt: 1_700_000_000_000,
    isSourcePinned: undefined,
    parseOptions: { type: "csv" },
  });
}

beforeEach(async () => {
  await db.open();
  await db.LocalDataset.clear();
});

afterAll(async () => {
  await db.delete();
});

describe("LocalDatasetParsers", () => {
  it("parses a row whose cleared source-bytes keys were dropped by Dexie", async () => {
    await _writeParsingRowWithCachedSourceBytes();

    // The tail of the background parquet transcoding: the parquet landed, so
    // the cached source bytes get cleared. Dexie's `update` *deletes* a
    // property whose new value is `undefined`, so `sourceBytes` and
    // `lastSourceAccessedAt` are absent from the stored row afterwards.
    // (The real transcoder also writes `parquetData` here. We leave it out
    // because fake-indexeddb's structured clone downgrades a Blob to a plain
    // object, which no browser does; the dropped keys are what this covers.)
    await db.LocalDataset.update(datasetId, {
      parseStatus: "ready",
      parseFailedReason: undefined,
      sourceBytes: undefined,
      lastSourceAccessedAt: undefined,
    });

    const storedRow = await db.LocalDataset.get(datasetId);
    expect(storedRow).toBeDefined();
    expect(Object.keys(storedRow!)).not.toContain("sourceBytes");
    expect(Object.keys(storedRow!)).not.toContain("lastSourceAccessedAt");

    const model = LocalDatasetParsers.fromDBReadToModelRead(storedRow!);

    expect(model.parseStatus).toBe("ready");
    expect(model.sourceBytes).toBeUndefined();
    expect(model.lastSourceAccessedAt).toBeUndefined();
  });

  it("parses a row whose undefined keys were stripped before insert", () => {
    // `fromModelInsertToDBInsert` runs `excludeUndefinedDeep`, so a
    // cloud-fetched dataset (`fetchCloudDatasetToLocalStorage`) is stored
    // without any of its `undefined` keys.
    const dbInsert = LocalDatasetParsers.fromModelInsertToDBInsert({
      datasetId,
      workspaceId,
      userId,
      parquetData: new Blob(["parquet"]),
      parseStatus: "ready",
      parseStartedAt: undefined,
      parseFailedReason: undefined,
      sourceBytes: undefined,
      sourceFileName: undefined,
      sourceFileType: undefined,
      sourceFileSize: undefined,
      lastSourceAccessedAt: undefined,
      isSourcePinned: undefined,
      parseOptions: undefined,
    });

    expect(Object.keys(dbInsert)).toEqual([
      "datasetId",
      "workspaceId",
      "userId",
      "parquetData",
      "parseStatus",
    ]);

    const model = LocalDatasetParsers.fromDBReadToModelRead(dbInsert);

    expect(model.parseStatus).toBe("ready");
    expect(model.parseOptions).toBeUndefined();
  });
});
