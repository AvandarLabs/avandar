import "fake-indexeddb/auto";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { makeTranscodeCompletionUpdateFromParquet } from "@/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "@/db/dexie/dexieVersions/dexieVersions";

const db = AvaDexieVersionManager.getVersion(CURRENT_AVA_DEXIE_VERSION);

const datasetId = "77777777-7777-4777-8777-777777777777" as DatasetId;
const workspaceId = "22222222-2222-4222-8222-222222222222" as WorkspaceId;
const userId = "33333333-3333-4333-8333-333333333333" as UserId;

beforeEach(async () => {
  await db.open();
  await db.LocalDataset.clear();
});

afterAll(async () => {
  await db.delete();
});

describe("makeTranscodeCompletionUpdateFromParquet", () => {
  it("clears sourceBytes for an unpinned row", () => {
    const parquetData = new Blob(["parquet"]);
    const update = makeTranscodeCompletionUpdateFromParquet({
      parquetData,
      isSourcePinned: false,
    });

    expect(update.parquetData).toBe(parquetData);
    expect(update.parseStatus).toBe("ready");
    expect(update.sourceBytes).toBeUndefined();
    expect(update.lastSourceAccessedAt).toBeUndefined();
    expect(update).toHaveProperty("sourceBytes");
    expect(update).toHaveProperty("lastSourceAccessedAt");
  });

  it("omits the sourceBytes key entirely for a pinned row", () => {
    const parquetData = new Blob(["parquet"]);
    const update = makeTranscodeCompletionUpdateFromParquet({
      parquetData,
      isSourcePinned: true,
    });

    expect(update.parquetData).toBe(parquetData);
    expect(update.parseStatus).toBe("ready");
    // Dexie's `update()` treats an explicitly-passed `undefined` value as a
    // delete instruction for that key. Asserting `toBeUndefined()` here would
    // pass even if the implementation wrongly included
    // `sourceBytes: undefined`, which would delete the very bytes we're
    // trying to protect. Only `not.toHaveProperty` proves the key is absent.
    expect(update).not.toHaveProperty("sourceBytes");
    expect(update).not.toHaveProperty("lastSourceAccessedAt");
  });

  it("preserves a pinned row's sourceBytes end-to-end through a real Dexie update", async () => {
    // NOTE: fake-indexeddb's structured clone (under jsdom's `Blob`) does not
    // round-trip a Blob's internal data faithfully; `.size`/`.text()` on a
    // Blob read back out of the fake store are unreliable (see the same
    // caveat in LocalDatasetParsers.test.ts). So this test proves retention
    // the way the rest of this codebase's Dexie tests do: by asserting the
    // `sourceBytes` key itself survives the update untouched, corroborated
    // by the plain-number `sourceFileSize` field recorded alongside it.
    const sourceBytes = new Blob([new Uint8Array(64)]);
    await db.LocalDataset.put({
      datasetId,
      workspaceId,
      userId,
      parquetData: undefined,
      parseStatus: "parsing",
      parseStartedAt: 1_700_000_000_000,
      parseFailedReason: undefined,
      sourceBytes,
      sourceFileName: "contract.pdf",
      sourceFileType: "pdf",
      sourceFileSize: sourceBytes.size,
      lastSourceAccessedAt: 1_700_000_000_000,
      isSourcePinned: true,
      parseOptions: undefined,
    });

    const parquetData = new Blob(["parquet-bytes"]);
    const update = makeTranscodeCompletionUpdateFromParquet({
      parquetData,
      isSourcePinned: true,
    });
    await db.LocalDataset.update(datasetId, update);

    const row = await db.LocalDataset.get(datasetId);
    expect(row?.parseStatus).toBe("ready");
    expect(row?.parquetData).toBeDefined();
    expect(row).toHaveProperty("sourceBytes");
    expect(row?.sourceBytes).toBeDefined();
    expect(row?.sourceFileSize).toBe(64);
  });
});
