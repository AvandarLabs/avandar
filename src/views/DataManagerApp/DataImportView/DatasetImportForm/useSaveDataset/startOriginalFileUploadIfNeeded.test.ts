import "fake-indexeddb/auto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "@/db/dexie/dexieVersions/dexieVersions";
import { startOriginalFileUploadIfNeeded } from "./startOriginalFileUploadIfNeeded";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

const db = AvaDexieVersionManager.getVersion(CURRENT_AVA_DEXIE_VERSION);

const workspaceId = "22222222-2222-4222-8222-222222222222" as WorkspaceId;
const userId = "33333333-3333-4333-8333-333333333333" as UserId;
const datasetId = "77777777-7777-4777-8777-777777777777" as DatasetId;

const { uploadOriginalFileMock } = vi.hoisted(() => {
  return { uploadOriginalFileMock: vi.fn() };
});

vi.mock(
  "@/clients/storage/DatasetOriginalFileStorageClient/DatasetOriginalFileStorageClient",
  () => {
    return {
      DatasetOriginalFileStorageClient: {
        uploadOriginalFile: uploadOriginalFileMock,
      },
    };
  },
);

async function _putPinnedPdfRow(
  overrides: Partial<Parameters<typeof db.LocalDataset.put>[0]> = {},
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
  uploadOriginalFileMock.mockReset();
  uploadOriginalFileMock.mockResolvedValue(undefined);
  await db.open();
  await db.LocalDataset.clear();
});

afterAll(async () => {
  await db.delete();
});

describe("startOriginalFileUploadIfNeeded", () => {
  it("uploads the retained original for a cloud-synced pdf dataset", async () => {
    await _putPinnedPdfRow();

    await startOriginalFileUploadIfNeeded({
      workspaceId,
      datasetId,
      sourceType: "pdf_file",
      onlineStorageAllowed: true,
    });

    expect(uploadOriginalFileMock).toHaveBeenCalledOnce();
    expect(uploadOriginalFileMock).toHaveBeenCalledWith({
      workspaceId,
      datasetId,
      file: expect.any(File),
      fileExtension: "pdf",
    });
  });

  it("uploads under the source type's extension, not the file name's", async () => {
    // The blob is addressed by source type at every one of upload / download
    // / delete. A file the user happened to name `contract.pdf.bak` must
    // still land at `<datasetId>.original.pdf`, otherwise the later delete
    // silently misses and the original is orphaned in the bucket.
    await _putPinnedPdfRow({ sourceFileName: "contract.pdf.bak" });

    await startOriginalFileUploadIfNeeded({
      workspaceId,
      datasetId,
      sourceType: "pdf_file",
      onlineStorageAllowed: true,
    });

    expect(uploadOriginalFileMock).toHaveBeenCalledWith(
      expect.objectContaining({ fileExtension: "pdf" }),
    );
  });

  it("uploads nothing for an offline-only pdf dataset", async () => {
    await _putPinnedPdfRow();

    // This is the whole point of the offline-only guarantee: when the user
    // declines cloud sync, the retained original must never leave
    // IndexedDB, even though it is exactly the kind of dataset that would
    // otherwise qualify for upload.
    await startOriginalFileUploadIfNeeded({
      workspaceId,
      datasetId,
      sourceType: "pdf_file",
      onlineStorageAllowed: false,
    });

    expect(uploadOriginalFileMock).not.toHaveBeenCalled();
  });

  it("uploads nothing for a reconstructable source type", async () => {
    await _putPinnedPdfRow();

    await startOriginalFileUploadIfNeeded({
      workspaceId,
      datasetId,
      sourceType: "csv_file",
      onlineStorageAllowed: true,
    });

    expect(uploadOriginalFileMock).not.toHaveBeenCalled();
  });

  it("throws when the original is missing locally", async () => {
    await _putPinnedPdfRow({ sourceBytes: undefined });

    // Silently skipping here would leave a cloud-synced dataset with no
    // original and no indication anything went wrong, defeating the
    // retention guarantee at precisely the moment it matters.
    await expect(
      startOriginalFileUploadIfNeeded({
        workspaceId,
        datasetId,
        sourceType: "pdf_file",
        onlineStorageAllowed: true,
      }),
    ).rejects.toThrow(/original file/i);

    expect(uploadOriginalFileMock).not.toHaveBeenCalled();
  });
});
