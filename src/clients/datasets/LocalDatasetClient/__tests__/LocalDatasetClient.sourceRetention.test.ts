import "fake-indexeddb/auto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "@/db/dexie/dexieVersions/dexieVersions";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

vi.mock("@/clients/datasets/pdfSniff", () => {
  return {
    sniffPdfFile: vi.fn().mockResolvedValue({
      type: "result",
      pageCount: 1,
      pages: [],
      documentMetadata: {
        title: null,
        organisation: null,
        reportNumber: null,
        publishedAt: null,
      },
    }),
  };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      sniffCsv: vi
        .fn()
        .mockResolvedValue({ csvSniff: {}, columns: [], previewRows: [] }),
    },
  };
});

vi.mock(
  "@/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding",
  () => {
    return { runBackgroundParquetTranscoding: vi.fn() };
  },
);

const db = AvaDexieVersionManager.getVersion(CURRENT_AVA_DEXIE_VERSION);

const workspaceId = "22222222-2222-4222-8222-222222222222" as WorkspaceId;
const userId = "33333333-3333-4333-8333-333333333333" as UserId;
const datasetId = "11111111-1111-4111-8111-111111111111" as DatasetId;

const MB = 1024 * 1024;

/** Comfortably over `SOURCE_CACHE_PER_FILE_MAX_BYTES`, which is 200MiB. */
const OVERSIZED_BYTES = 300 * MB;

/**
 * A File-like stand-in sized without allocating the bytes. Nothing on this
 * path reads the content: the sniffers are mocked and `_putParsingDataset`
 * only reads `name` and `size`.
 */
function _fakeFile(name: string, sizeBytes: number, type: string): File {
  return { name, size: sizeBytes, type } as File;
}

beforeEach(async () => {
  await db.open();
  await db.LocalDataset.clear();
});

afterAll(async () => {
  await db.delete();
});

describe("source-bytes retention at import time", () => {
  it("keeps the bytes of a PDF that is over the per-file cache ceiling", async () => {
    // The ceiling exists so a huge spreadsheet does not fill IndexedDB for
    // the sake of a resumable parse. A PDF is not that: its bytes are the
    // only copy of the thing extraction is lossy against, and large PDFs are
    // ordinary in this corpus. Dropping them here used to produce a pinned
    // row with nothing in it, and the failure only surfaced at save time as
    // "no original file is cached locally".
    await LocalDatasetClient.startPdfImport({
      datasetId,
      workspaceId,
      userId,
      file: _fakeFile("big.pdf", OVERSIZED_BYTES, "application/pdf"),
      parseOptions: {},
    });

    const row = await db.LocalDataset.get(datasetId);
    expect(row?.isSourcePinned).toBe(true);
    expect(row?.sourceBytes).toBeDefined();
    expect(row?.sourceBytes?.size).toBe(OVERSIZED_BYTES);
    expect(row?.lastSourceAccessedAt).toBeDefined();
  });

  it("never writes a pinned row without its bytes", async () => {
    // The invariant, stated directly: a pin claims "these bytes are the
    // retained original", so a pinned row with no bytes is a lie the rest of
    // the system believes until the upload fails.
    await LocalDatasetClient.startPdfImport({
      datasetId,
      workspaceId,
      userId,
      file: _fakeFile("big.pdf", OVERSIZED_BYTES, "application/pdf"),
      parseOptions: {},
    });

    const rows = await db.LocalDataset.toArray();
    const pinnedWithoutBytes = rows.filter((row) => {
      return row.isSourcePinned === true && row.sourceBytes === undefined;
    });
    expect(pinnedWithoutBytes).toEqual([]);
  });

  it("still skips caching a CSV that is over the ceiling", async () => {
    // The exemption is for sources that require retention, not a removal of
    // the ceiling. A CSV is reconstructable from its parquet plus its parse
    // options, so its cached bytes stay a convenience the cap may refuse.
    await LocalDatasetClient.startCsvImport({
      datasetId,
      workspaceId,
      userId,
      file: _fakeFile("big.csv", OVERSIZED_BYTES, "text/csv"),
      parseOptions: {},
    });

    const row = await db.LocalDataset.get(datasetId);
    expect(row?.isSourcePinned).toBe(false);
    expect(row?.sourceBytes).toBeUndefined();
    expect(row?.lastSourceAccessedAt).toBeUndefined();
  });

  it("caches a PDF under the ceiling as before", async () => {
    await LocalDatasetClient.startPdfImport({
      datasetId,
      workspaceId,
      userId,
      file: _fakeFile("small.pdf", 2 * MB, "application/pdf"),
      parseOptions: {},
    });

    const row = await db.LocalDataset.get(datasetId);
    expect(row?.sourceBytes?.size).toBe(2 * MB);
  });
});
