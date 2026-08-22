import "fake-indexeddb/auto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { evictSourceCache } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "@/db/dexie/dexieVersions/dexieVersions";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

const db = AvaDexieVersionManager.getVersion(CURRENT_AVA_DEXIE_VERSION);

const workspaceId = "22222222-2222-4222-8222-222222222222" as WorkspaceId;
const userId = "33333333-3333-4333-8333-333333333333" as UserId;

const MB = 1024 * 1024;

/**
 * A Blob-like stand-in sized without actually allocating the bytes. Dexie /
 * fake-indexeddb only inspect `.size` and `.type` for our purposes here, and
 * a genuine 400-900MiB Blob per row would make the suite slow and memory
 * heavy.
 */
function _fakeBlob(sizeBytes: number): Blob {
  return { size: sizeBytes, type: "application/octet-stream" } as Blob;
}

async function _putRow(params: {
  datasetId: string;
  sizeBytes: number;
  lastSourceAccessedAt: number;
  isSourcePinned?: boolean;
}): Promise<void> {
  await db.LocalDataset.put({
    datasetId: params.datasetId as DatasetId,
    workspaceId,
    userId,
    parquetData: undefined,
    parseStatus: "parsing",
    parseStartedAt: params.lastSourceAccessedAt,
    parseFailedReason: undefined,
    sourceBytes: _fakeBlob(params.sizeBytes),
    sourceFileName: `${params.datasetId}.bin`,
    sourceFileType: "pdf",
    sourceFileSize: params.sizeBytes,
    lastSourceAccessedAt: params.lastSourceAccessedAt,
    isSourcePinned: params.isSourcePinned,
    parseOptions: undefined,
  });
}

beforeEach(async () => {
  await db.open();
  await db.LocalDataset.clear();
});

afterAll(async () => {
  await db.delete();
});

describe("evictSourceCache", () => {
  it("evicts the oldest unpinned rows first", async () => {
    await _putRow({
      datasetId: "11111111-1111-4111-8111-111111111111",
      sizeBytes: 400 * MB,
      lastSourceAccessedAt: 1_000,
    });
    await _putRow({
      datasetId: "22222222-2222-4222-8222-222222222222",
      sizeBytes: 400 * MB,
      lastSourceAccessedAt: 2_000,
    });

    // Reserving another 400MiB pushes the running total (800MiB + 400MiB)
    // over the 1GiB budget, so the older row must be evicted.
    await evictSourceCache(400 * MB);

    const older = await db.LocalDataset.get(
      "11111111-1111-4111-8111-111111111111" as DatasetId,
    );
    const newer = await db.LocalDataset.get(
      "22222222-2222-4222-8222-222222222222" as DatasetId,
    );

    expect(older?.sourceBytes).toBeUndefined();
    expect(newer?.sourceBytes).toBeDefined();
  });

  it("never evicts a pinned row, even when it is the oldest and largest", async () => {
    await _putRow({
      datasetId: "44444444-4444-4444-8444-444444444444",
      sizeBytes: 800 * MB,
      lastSourceAccessedAt: 1,
      isSourcePinned: true,
    });

    await evictSourceCache(1024 * MB);

    const row = await db.LocalDataset.get(
      "44444444-4444-4444-8444-444444444444" as DatasetId,
    );
    expect(row?.sourceBytes).toBeDefined();
  });

  it("reclaims what it can and terminates when a pinned row alone blows the budget", async () => {
    await _putRow({
      datasetId: "55555555-5555-4555-8555-555555555555",
      sizeBytes: 900 * MB,
      lastSourceAccessedAt: 1,
      isSourcePinned: true,
    });
    await _putRow({
      datasetId: "66666666-6666-4666-8666-666666666666",
      sizeBytes: 200 * MB,
      lastSourceAccessedAt: 2,
    });

    // 900 (pinned) + 200 (unpinned) already exceeds 1GiB, and the pinned row
    // alone cannot be freed. The evictor must drop the unpinned row and then
    // stop, rather than looping forever trying to get under budget.
    await expect(evictSourceCache(0)).resolves.toBeUndefined();

    const pinned = await db.LocalDataset.get(
      "55555555-5555-4555-8555-555555555555" as DatasetId,
    );
    const unpinned = await db.LocalDataset.get(
      "66666666-6666-4666-8666-666666666666" as DatasetId,
    );

    expect(pinned?.sourceBytes).toBeDefined();
    expect(unpinned?.sourceBytes).toBeUndefined();
  });
});
