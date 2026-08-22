import "fake-indexeddb/auto";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";
import type { LocalDataset } from "@/models/LocalDataset/LocalDataset.types";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { dropLocalDatasetData } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "@/db/dexie/dexieVersions/dexieVersions";

const db = AvaDexieVersionManager.getVersion(CURRENT_AVA_DEXIE_VERSION);

const datasetId = "77777777-7777-4777-8777-777777777777" as DatasetId;
const workspaceId = "22222222-2222-4222-8222-222222222222" as WorkspaceId;
const userId = "33333333-3333-4333-8333-333333333333" as UserId;

async function _putRow(overrides: Partial<LocalDataset> = {}): Promise<void> {
  await db.LocalDataset.put({
    datasetId,
    workspaceId,
    userId,
    parquetData: new Blob(["parquet"]),
    parseStatus: "ready",
    parseStartedAt: undefined,
    parseFailedReason: undefined,
    sourceBytes: new Blob([new Uint8Array(16)]),
    sourceFileName: "contract.pdf",
    sourceFileType: "pdf",
    sourceFileSize: 16,
    lastSourceAccessedAt: 1_000,
    isSourcePinned: true,
    parseOptions: undefined,
    ...overrides,
  });
}

beforeEach(async () => {
  await db.open();
  await db.LocalDataset.clear();
});

afterAll(async () => {
  await db.delete();
});

describe("dropLocalDatasetData", () => {
  it("keeps a pinned row's retained original and the metadata needed to rebuild from it", async () => {
    await _putRow();

    // This is the cache-bust that fires on something as innocuous as editing
    // a column description. For an offline-only PDF the pinned bytes are the
    // only copy of the user's document in existence, so it must survive.
    const result = await dropLocalDatasetData(datasetId);

    const row = await db.LocalDataset.get(datasetId);
    expect(result.retainedOriginal).toBe(true);
    expect(row).toBeDefined();
    expect(row?.sourceBytes).toBeDefined();
    expect(row?.sourceFileName).toBe("contract.pdf");
    expect(row?.sourceFileType).toBe("pdf");
    expect(row?.sourceFileSize).toBe(16);
    expect(row?.isSourcePinned).toBe(true);
  });

  it("clears a pinned row's derived data so it re-materializes", async () => {
    await _putRow();

    await dropLocalDatasetData(datasetId);

    const row = await db.LocalDataset.get(datasetId);
    expect(row?.parquetData).toBeUndefined();
    expect(row?.parseStatus).toBe("parsing");
  });

  it("fully drops an unpinned row", async () => {
    // CSV / XLSX source bytes are only ever a resume cache and the parquet can
    // be re-downloaded or re-uploaded, so losing the row is a recoverable
    // cache miss and the old behaviour must not change.
    await _putRow({
      sourceFileName: "sales.csv",
      sourceFileType: "csv",
      isSourcePinned: undefined,
    });

    const result = await dropLocalDatasetData(datasetId);

    expect(result.retainedOriginal).toBe(false);
    await expect(db.LocalDataset.get(datasetId)).resolves.toBeUndefined();
  });

  it("fully drops a pinned row whose bytes are already gone", async () => {
    // Nothing left to protect, so there's no reason to keep a husk of a row
    // around blocking a re-fetch.
    await _putRow({ sourceBytes: undefined });

    const result = await dropLocalDatasetData(datasetId);

    expect(result.retainedOriginal).toBe(false);
    await expect(db.LocalDataset.get(datasetId)).resolves.toBeUndefined();
  });
});
