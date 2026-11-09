import { ParquetCopyError } from "@pipeline-server/openDataParquetCache/buildOpenDataParquetCache/buildOpenDataParquetCache";
import { runParquetCopyBuild } from "@pipeline-server/openDataParquetCache/runParquetCopyBuild/runParquetCopyBuild";
import { describe, expect, it, vi } from "vitest";
import type { OpenDataParquetCache } from "@pipeline-server/openDataParquetCache/buildOpenDataParquetCache/buildOpenDataParquetCache";
import type { ParquetCopyStore } from "@pipeline-server/openDataParquetCache/runParquetCopyBuild/runParquetCopyBuild";

const LISTING_ID = "e8ad4499-10e1-47d7-9a34-64e6ea79a8e6";
const BUILD_ID = "9f1d2c3b-0000-4000-8000-000000000002";
const JOB = { catalogListingId: LISTING_ID, buildId: BUILD_ID };

const LISTING = {
  id: LISTING_ID,
  pipelineName: "socrata",
  currentBuildId: BUILD_ID,
  apiBaseUrl: "https://data.cityofnewyork.us",
  apiResourceId: "3h2n-5cm9",
  externalDatasetId: "3h2n-5cm9",
  apiResourceFormat: "CSV",
  columnNames: ["boro", "block"],
};

const COPY: OpenDataParquetCache = {
  folderPath: `catalog-cache/${LISTING_ID}/${BUILD_ID}`,
  partCount: 4,
  sourceVersion: "socrata:rowsUpdatedAt:1794163358",
  rowCount: 2_477_725,
  byteSize: 81_640_564,
  columns: [{ name: "boro", dataType: "VARCHAR" }],
};

function _createStore(overrides: Partial<ParquetCopyStore> = {}) {
  return {
    readListing: vi.fn().mockResolvedValue(LISTING),
    writeCopy: vi
      .fn()
      .mockResolvedValue({ isApplied: true, previousFolderPath: undefined }),
    failCopy: vi.fn().mockResolvedValue(true),
    markInvalid: vi.fn().mockResolvedValue(undefined),
    writeVerifiedColumns: vi.fn().mockResolvedValue(undefined),
    uploadPart: vi.fn().mockResolvedValue(undefined),
    removeFolder: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } satisfies ParquetCopyStore;
}

function _run(
  store: ParquetCopyStore,
  buildCopy = vi.fn().mockResolvedValue(COPY),
) {
  return {
    buildCopy,
    outcome: runParquetCopyBuild({
      job: JOB,
      store,
      loadPipelineDownload: vi.fn(),
      downloadToFile: vi.fn(),
      buildCopy,
    }),
  };
}

describe("runParquetCopyBuild", () => {
  it("records the copy, deletes the one it replaced, and verifies the columns", async () => {
    const store = _createStore({
      writeCopy: vi.fn().mockResolvedValue({
        isApplied: true,
        previousFolderPath: `catalog-cache/${LISTING_ID}/old-build`,
      }),
    });
    const { buildCopy, outcome } = _run(store);

    await expect(outcome).resolves.toEqual({
      status: "written",
      copy: COPY,
      areColumnsVerified: true,
    });
    expect(buildCopy).toHaveBeenCalledWith(
      expect.objectContaining({ listing: LISTING, buildId: BUILD_ID }),
    );
    expect(store.writeCopy).toHaveBeenCalledWith({ ...JOB, copy: COPY });
    expect(store.removeFolder).toHaveBeenCalledExactlyOnceWith(
      `catalog-cache/${LISTING_ID}/old-build`,
    );
    expect(store.writeVerifiedColumns).toHaveBeenCalledWith({
      catalogListingId: LISTING_ID,
      columns: COPY.columns,
    });
  });

  it("builds from a complete sample when the job carries one", async () => {
    const store = _createStore();
    const buildCopy = vi.fn().mockResolvedValue(COPY);

    await runParquetCopyBuild({
      job: { ...JOB, completeSampleCsv: "county\nKings\n" },
      store,
      loadPipelineDownload: vi.fn(),
      downloadToFile: vi.fn(),
      buildCopy,
    });

    expect(buildCopy).toHaveBeenCalledWith(
      expect.objectContaining({ completeSampleCsv: "county\nKings\n" }),
    );
    expect(store.writeCopy).toHaveBeenCalledWith({ ...JOB, copy: COPY });
  });

  it("verifies the columns of a listing that has none yet", async () => {
    const store = _createStore({
      readListing: vi.fn().mockResolvedValue({ ...LISTING, columnNames: [] }),
    });

    await expect(_run(store).outcome).resolves.toMatchObject({
      areColumnsVerified: true,
    });
    expect(store.writeVerifiedColumns).toHaveBeenCalled();
  });

  it("keeps the listing's columns when the copy shares none of them", async () => {
    const store = _createStore({
      readListing: vi
        .fn()
        .mockResolvedValue({ ...LISTING, columnNames: ["country", "cases"] }),
    });

    await expect(_run(store).outcome).resolves.toEqual({
      status: "written",
      copy: COPY,
      areColumnsVerified: false,
    });
    expect(store.writeCopy).toHaveBeenCalled();
    expect(store.writeVerifiedColumns).not.toHaveBeenCalled();
  });

  it("skips a build that is no longer the listing's running build", async () => {
    const store = _createStore({
      readListing: vi
        .fn()
        .mockResolvedValue({ ...LISTING, currentBuildId: "another-build" }),
    });
    const { buildCopy, outcome } = _run(store);

    await expect(outcome).resolves.toEqual({ status: "superseded" });
    expect(buildCopy).not.toHaveBeenCalled();
  });

  it("skips a listing that no longer exists", async () => {
    const store = _createStore({
      readListing: vi.fn().mockResolvedValue(undefined),
    });

    await expect(_run(store).outcome).resolves.toEqual({
      status: "superseded",
    });
  });

  it("deletes its own copy when another build replaced it while it ran", async () => {
    const store = _createStore({
      writeCopy: vi
        .fn()
        .mockResolvedValue({ isApplied: false, previousFolderPath: undefined }),
    });

    await expect(_run(store).outcome).resolves.toEqual({
      status: "discarded",
    });
    expect(store.removeFolder).toHaveBeenCalledExactlyOnceWith(COPY.folderPath);
    expect(store.writeVerifiedColumns).not.toHaveBeenCalled();
  });

  it("records a failure, and marks the listing invalid when the dataset is at fault", async () => {
    const store = _createStore();
    const { outcome } = _run(
      store,
      vi.fn().mockRejectedValue(new ParquetCopyError("source-empty")),
    );

    await expect(outcome).resolves.toEqual({
      status: "failed",
      failure: { code: "source-empty", invalidReason: "empty_dataset" },
      isRecorded: true,
    });
    expect(store.failCopy).toHaveBeenCalledWith({
      ...JOB,
      code: "source-empty",
    });
    expect(store.markInvalid).toHaveBeenCalledWith({
      catalogListingId: LISTING_ID,
      reason: "empty_dataset",
    });
  });

  it("leaves the listing alone when a newer build already replaced the failed one", async () => {
    const store = _createStore({ failCopy: vi.fn().mockResolvedValue(false) });
    const { outcome } = _run(
      store,
      vi.fn().mockRejectedValue(new ParquetCopyError("source-empty")),
    );

    await expect(outcome).resolves.toMatchObject({ isRecorded: false });
    expect(store.markInvalid).not.toHaveBeenCalled();
  });

  it("records a listing no pipeline wrote as one that cannot be copied", async () => {
    const store = _createStore({
      readListing: vi
        .fn()
        .mockResolvedValue({ ...LISTING, pipelineName: undefined }),
    });
    const { buildCopy, outcome } = _run(store);

    await expect(outcome).resolves.toMatchObject({
      status: "failed",
      failure: { code: "copy-unsupported" },
    });
    expect(buildCopy).not.toHaveBeenCalled();
  });
});
