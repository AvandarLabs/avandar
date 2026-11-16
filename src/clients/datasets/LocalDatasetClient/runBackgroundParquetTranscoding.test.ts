import "fake-indexeddb/auto";
import { Model } from "@avandar/models";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getReconcilableColumnsByOriginalName,
  makeTranscodeCompletionUpdateFromParquet,
  runBackgroundParquetTranscoding,
} from "@/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "@/db/dexie/dexieVersions/dexieVersions";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

const mocks = vi.hoisted(() => {
  return {
    loadCsv: vi.fn(),
    notifySuccess: vi.fn(),
    notifyWarning: vi.fn(),
    notifyError: vi.fn(),
  };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return { DuckDbClient: { loadCsv: mocks.loadCsv } };
});
vi.mock("@/utils/notifications/notify", () => {
  return {
    notifySuccess: mocks.notifySuccess,
    notifyWarning: mocks.notifyWarning,
    notifyError: mocks.notifyError,
  };
});
vi.mock("@/clients/datasets/ImportJobsManager", () => {
  return {
    ImportJobsManager: {
      startJob: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
      clearJob: vi.fn(),
    },
  };
});

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

describe("getReconcilableColumnsByOriginalName", () => {
  function _makeColumn(
    name: string,
    dictionaryBindingId: DictionaryBinding.Id | undefined,
  ): DatasetColumn.T {
    return Model.make("DatasetColumn", {
      id: `${name}-id` as DatasetColumn.Id,
      datasetId: "33333333-3333-4333-8333-333333333333" as Dataset.Id,
      workspaceId: "44444444-4444-4444-8444-444444444444" as Workspace.Id,
      createdAt: "2026-11-13T00:00:00.000Z",
      updatedAt: "2026-11-13T00:00:00.000Z",
      name,
      originalName: "GENDER",
      originalDataType: "BIGINT",
      detectedDataType: "BIGINT",
      dataType: "varchar",
      description: undefined,
      columnIdx: 0,
      dictionaryBindingId,
    });
  }

  it("keeps the converted column, not its keep-original copy", () => {
    const gender = _makeColumn("GENDER", undefined);
    const copy = _makeColumn(
      "GENDER_original",
      "55555555-5555-4555-8555-555555555555" as DictionaryBinding.Id,
    );

    const byName = getReconcilableColumnsByOriginalName([gender, copy]);

    expect(byName.get("GENDER")).toBe(gender);
    expect(byName.size).toBe(1);
  });
});

describe("runBackgroundParquetTranscoding toasts", () => {
  beforeEach(async () => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset();
    });
    mocks.loadCsv.mockResolvedValue({
      parquetData: new Blob(["parquet"]),
      columns: [],
    });
    await db.LocalDataset.put({
      datasetId,
      workspaceId,
      userId,
      parquetData: undefined,
      parseStatus: "parsing",
      parseStartedAt: 1_700_000_000_000,
      parseFailedReason: undefined,
      sourceBytes: undefined,
      sourceFileName: "mz-adm1.csv",
      sourceFileType: "csv",
      sourceFileSize: 12,
      lastSourceAccessedAt: undefined,
      isSourcePinned: false,
      parseOptions: undefined,
    });
  });

  async function _runWithDisplayName(
    displayName: string | undefined,
  ): Promise<void> {
    await runBackgroundParquetTranscoding({
      datasetId,
      workspaceId,
      userId,
      displayName,
      source: {
        kind: "csv",
        file: new File(["a,b\n1,2\n"], "mz-adm1.csv"),
        options: { type: "csv" },
      },
    });
  }

  it("names the dataset when a display name is given", async () => {
    await _runWithDisplayName("Mozambique provinces");

    expect(mocks.notifySuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          '"Mozambique provinces" finished processing and is ready to use.',
      }),
    );
  });

  it("names the file when no display name is given", async () => {
    await _runWithDisplayName(undefined);

    expect(mocks.notifySuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '"mz-adm1.csv" finished processing and is ready to use.',
      }),
    );
  });
});
