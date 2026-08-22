import "fake-indexeddb/auto";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";
import type { LocalDataset } from "@/models/LocalDataset/LocalDataset.types";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "@/db/dexie/dexieVersions/dexieVersions";

import { deleteRetainedOriginalFromCloud } from "./deleteRetainedOriginalFromCloud";

const db = AvaDexieVersionManager.getVersion(CURRENT_AVA_DEXIE_VERSION);

const workspaceId = "22222222-2222-4222-8222-222222222222" as WorkspaceId;
const userId = "33333333-3333-4333-8333-333333333333" as UserId;
const datasetId = "77777777-7777-4777-8777-777777777777" as DatasetId;

const { deleteOriginalFileMock } = vi.hoisted(() => {
  return { deleteOriginalFileMock: vi.fn() };
});

vi.mock(
  "@/clients/storage/DatasetOriginalFileStorageClient/DatasetOriginalFileStorageClient",
  () => {
    return {
      DatasetOriginalFileStorageClient: {
        deleteOriginalFile: deleteOriginalFileMock,
      },
    };
  },
);

async function _putPinnedPdfRow(
  overrides: Partial<LocalDataset> = {},
): Promise<void> {
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
    lastSourceAccessedAt: Date.now(),
    isSourcePinned: true,
    parseOptions: undefined,
    ...overrides,
  });
}

beforeEach(async () => {
  deleteOriginalFileMock.mockReset();
  deleteOriginalFileMock.mockResolvedValue(undefined);
  await db.open();
  await db.LocalDataset.clear();
});

afterAll(async () => {
  await db.delete();
});

describe("deleteRetainedOriginalFromCloud", () => {
  it("deletes a pdf dataset's retained original under the source type's extension", async () => {
    await _putPinnedPdfRow();

    await deleteRetainedOriginalFromCloud({
      workspaceId,
      datasetId,
      sourceType: "pdf_file",
    });

    expect(deleteOriginalFileMock).toHaveBeenCalledOnce();
    expect(deleteOriginalFileMock).toHaveBeenCalledWith({
      workspaceId,
      datasetId,
      fileExtension: "pdf",
    });
  });

  it("does nothing for a source type that retains no original", async () => {
    await _putPinnedPdfRow({
      sourceFileType: "csv",
      isSourcePinned: undefined,
    });

    await deleteRetainedOriginalFromCloud({
      workspaceId,
      datasetId,
      sourceType: "csv_file",
    });

    expect(deleteOriginalFileMock).not.toHaveBeenCalled();
  });

  it("refuses to delete the cloud copy when the original is not on this device", async () => {
    // Offline-only means "the original lives in IndexedDB and nowhere else".
    // With no local copy, removing the cloud blob would be data loss dressed
    // up as a privacy action.
    await _putPinnedPdfRow({ sourceBytes: undefined });

    await expect(
      deleteRetainedOriginalFromCloud({
        workspaceId,
        datasetId,
        sourceType: "pdf_file",
      }),
    ).rejects.toThrow(/not stored on this device/i);

    expect(deleteOriginalFileMock).not.toHaveBeenCalled();
  });

  it("propagates a failed deletion instead of swallowing it", async () => {
    await _putPinnedPdfRow();
    deleteOriginalFileMock.mockRejectedValue(new Error("storage exploded"));

    // Unlike the full-delete path, nothing has been committed yet here, so a
    // failure means the offline-only request was not honoured and the user has
    // to be told rather than shown a success toast over a file still online.
    await expect(
      deleteRetainedOriginalFromCloud({
        workspaceId,
        datasetId,
        sourceType: "pdf_file",
      }),
    ).rejects.toThrow("storage exploded");
  });
});
