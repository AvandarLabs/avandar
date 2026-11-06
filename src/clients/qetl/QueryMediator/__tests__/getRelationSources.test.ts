/**
 * Characterization tests for the source-type dispatch in
 * `getRelationSources.ts`. These pin the pairing of each source type to its
 * source record, including `google_sheets` now that acquisition is wired.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearQueryableRelationColumns,
  rememberQueryableColumns,
} from "@/clients/qetl/QueryMediator/queryableRelationColumns/queryableRelationColumns";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const CSV_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const XLSX_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const VIRTUAL_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;
const OPEN_DATA_ID = "44444444-4444-4444-8444-444444444444" as Dataset.Id;
const GOOGLE_SHEETS_ID = "55555555-5555-4555-8555-555555555555" as Dataset.Id;
const MISSING_ID = "66666666-6666-4666-8666-666666666666" as Dataset.Id;
const LOADED_ID = "77777777-7777-4777-8777-777777777777" as Dataset.Id;

const {
  datasetGetAllMock,
  csvGetAllMock,
  xlsxGetAllMock,
  virtualGetAllMock,
  openDataGetAllMock,
  googleSheetsGetAllMock,
  getTableOrViewNamesMock,
} = vi.hoisted(() => {
  return {
    datasetGetAllMock: vi.fn(),
    csvGetAllMock: vi.fn(),
    xlsxGetAllMock: vi.fn(),
    virtualGetAllMock: vi.fn(),
    openDataGetAllMock: vi.fn(),
    googleSheetsGetAllMock: vi.fn(),
    getTableOrViewNamesMock: vi.fn(),
  };
});

function _withCacheChain(getAll: ReturnType<typeof vi.fn>) {
  return {
    withCache: () => {
      return {
        withEnsureQueryData: () => {
          return { getAll };
        },
      };
    },
  };
}

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: _withCacheChain(datasetGetAllMock) };
});

vi.mock("@/clients/datasets/source-datasets/CsvFileDatasetClient", () => {
  return { CsvFileDatasetClient: _withCacheChain(csvGetAllMock) };
});

vi.mock("@/clients/datasets/source-datasets/XlsxFileDatasetClient", () => {
  return { XlsxFileDatasetClient: _withCacheChain(xlsxGetAllMock) };
});

vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return { VirtualDatasetClient: _withCacheChain(virtualGetAllMock) };
});

vi.mock("@/clients/datasets/source-datasets/OpenDataDatasetClient", () => {
  return { OpenDataDatasetClient: _withCacheChain(openDataGetAllMock) };
});

vi.mock("@/clients/datasets/source-datasets/GoogleSheetsDatasetClient", () => {
  return {
    GoogleSheetsDatasetClient: _withCacheChain(googleSheetsGetAllMock),
  };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return { DuckDbClient: { getTableOrViewNames: getTableOrViewNamesMock } };
});

beforeEach(() => {
  vi.clearAllMocks();
  clearQueryableRelationColumns();
  datasetGetAllMock.mockResolvedValue([]);
  csvGetAllMock.mockResolvedValue([]);
  xlsxGetAllMock.mockResolvedValue([]);
  virtualGetAllMock.mockResolvedValue([]);
  openDataGetAllMock.mockResolvedValue([]);
  googleSheetsGetAllMock.mockResolvedValue([]);
  getTableOrViewNamesMock.mockResolvedValue([]);
});

describe("getRelationSources", () => {
  it("pairs a csv_file dataset with its source record", async () => {
    const dataset = {
      id: CSV_ID,
      name: "csv dataset",
      sourceType: "csv_file" as const,
      workspaceId: "workspace-1",
    };
    const sourceDataset = { datasetId: CSV_ID, delimiter: "," };
    datasetGetAllMock.mockResolvedValue([dataset]);
    csvGetAllMock.mockResolvedValue([sourceDataset]);

    const { getRelationSources } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await getRelationSources([CSV_ID]);

    expect(result).toEqual([
      { dataset, sourceType: "csv_file", sourceDataset },
    ]);
  });

  it("pairs an xlsx_file dataset with its source record", async () => {
    const dataset = {
      id: XLSX_ID,
      name: "xlsx dataset",
      sourceType: "xlsx_file" as const,
      workspaceId: "workspace-1",
    };
    const sourceDataset = { datasetId: XLSX_ID, sheetName: "Sheet1" };
    datasetGetAllMock.mockResolvedValue([dataset]);
    xlsxGetAllMock.mockResolvedValue([sourceDataset]);

    const { getRelationSources } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await getRelationSources([XLSX_ID]);

    expect(result).toEqual([
      { dataset, sourceType: "xlsx_file", sourceDataset },
    ]);
  });

  it("pairs a virtual dataset with its source record", async () => {
    const dataset = {
      id: VIRTUAL_ID,
      name: "virtual dataset",
      sourceType: "virtual" as const,
      workspaceId: "workspace-1",
    };
    const sourceDataset = { datasetId: VIRTUAL_ID, rawSql: "SELECT 1" };
    datasetGetAllMock.mockResolvedValue([dataset]);
    virtualGetAllMock.mockResolvedValue([sourceDataset]);

    const { getRelationSources } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await getRelationSources([VIRTUAL_ID]);

    expect(result).toEqual([{ dataset, sourceType: "virtual", sourceDataset }]);
  });

  it("pairs an open_data dataset with its source record", async () => {
    const dataset = {
      id: OPEN_DATA_ID,
      name: "open data dataset",
      sourceType: "open_data" as const,
      workspaceId: "workspace-1",
    };
    const sourceDataset = { datasetId: OPEN_DATA_ID, sourceUrl: "https://x" };
    datasetGetAllMock.mockResolvedValue([dataset]);
    openDataGetAllMock.mockResolvedValue([sourceDataset]);

    const { getRelationSources } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await getRelationSources([OPEN_DATA_ID]);

    expect(result).toEqual([
      { dataset, sourceType: "open_data", sourceDataset },
    ]);
  });

  it("pairs a google_sheets dataset with its source record", async () => {
    const dataset = {
      id: GOOGLE_SHEETS_ID,
      name: "google sheets dataset",
      sourceType: "google_sheets" as const,
      workspaceId: "workspace-1",
    };
    const sourceDataset = {
      datasetId: GOOGLE_SHEETS_ID,
      googleDocumentId: "1sheetFileId",
      sheetName: "Kenya",
    };
    datasetGetAllMock.mockResolvedValue([dataset]);
    googleSheetsGetAllMock.mockResolvedValue([sourceDataset]);

    const { getRelationSources } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await getRelationSources([GOOGLE_SHEETS_ID]);

    expect(result).toEqual([
      { dataset, sourceType: "google_sheets", sourceDataset },
    ]);
  });

  it("returns nothing when no relations are requested", async () => {
    const { getRelationSources } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");

    await expect(getRelationSources([])).resolves.toEqual([]);
    expect(csvGetAllMock).not.toHaveBeenCalled();
  });

  it("silently drops a dataset that has no source record", async () => {
    const dataset = {
      id: CSV_ID,
      name: "csv dataset",
      sourceType: "csv_file" as const,
      workspaceId: "workspace-1",
    };
    datasetGetAllMock.mockResolvedValue([dataset]);
    csvGetAllMock.mockResolvedValue([]);

    const { getRelationSources } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");

    await expect(getRelationSources([CSV_ID])).resolves.toEqual([]);
  });

  // The current code looks the dataset up with a non-null assertion
  // (`options.datasetsById[sourceDataset.datasetId]!`), so a source record
  // whose dataset is absent produces an extractor with an `undefined`
  // dataset instead of an error. This pins that down as it is today.
  it("emits an extractor with an undefined dataset for an orphan source record", async () => {
    const dataset = {
      id: CSV_ID,
      name: "csv dataset",
      sourceType: "csv_file" as const,
      workspaceId: "workspace-1",
    };
    const orphanSourceDataset = { datasetId: MISSING_ID, delimiter: "," };
    datasetGetAllMock.mockResolvedValue([dataset]);
    csvGetAllMock.mockResolvedValue([orphanSourceDataset]);

    const { getRelationSources } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await getRelationSources([CSV_ID]);

    expect(result).toEqual([
      {
        dataset: undefined,
        sourceType: "csv_file",
        sourceDataset: orphanSourceDataset,
      },
    ]);
  });

  it("pairs google_sheets and csv_file datasets in the same batch", async () => {
    const csvDataset = {
      id: CSV_ID,
      name: "csv dataset",
      sourceType: "csv_file" as const,
      workspaceId: "workspace-1",
    };
    const googleSheetsDataset = {
      id: GOOGLE_SHEETS_ID,
      name: "google sheets dataset",
      sourceType: "google_sheets" as const,
      workspaceId: "workspace-1",
    };
    const csvSourceDataset = { datasetId: CSV_ID, delimiter: "," };
    const sheetsSourceDataset = {
      datasetId: GOOGLE_SHEETS_ID,
      googleDocumentId: "1sheetFileId",
      sheetName: "Kenya",
    };
    datasetGetAllMock.mockResolvedValue([csvDataset, googleSheetsDataset]);
    csvGetAllMock.mockResolvedValue([csvSourceDataset]);
    googleSheetsGetAllMock.mockResolvedValue([sheetsSourceDataset]);

    const { getRelationSources } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await getRelationSources([CSV_ID, GOOGLE_SHEETS_ID]);

    expect(result).toEqual(
      expect.arrayContaining([
        {
          dataset: csvDataset,
          sourceType: "csv_file",
          sourceDataset: csvSourceDataset,
        },
        {
          dataset: googleSheetsDataset,
          sourceType: "google_sheets",
          sourceDataset: sheetsSourceDataset,
        },
      ]),
    );
    expect(result).toHaveLength(2);
  });

  it("matches multiple csv_file datasets in one call by their own datasetId", async () => {
    const firstDataset = {
      id: CSV_ID,
      name: "first csv dataset",
      sourceType: "csv_file" as const,
      workspaceId: "workspace-1",
    };
    const secondDataset = {
      id: XLSX_ID,
      name: "second csv dataset",
      sourceType: "csv_file" as const,
      workspaceId: "workspace-1",
    };
    const firstSourceDataset = { datasetId: CSV_ID, delimiter: "," };
    const secondSourceDataset = { datasetId: XLSX_ID, delimiter: ";" };
    datasetGetAllMock.mockResolvedValue([firstDataset, secondDataset]);
    // Returned in reverse of the datasets' order, to confirm matching is by
    // `datasetId` and not by position.
    csvGetAllMock.mockResolvedValue([secondSourceDataset, firstSourceDataset]);

    const { getRelationSources } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await getRelationSources([CSV_ID, XLSX_ID]);

    expect(result).toEqual([
      {
        dataset: secondDataset,
        sourceType: "csv_file",
        sourceDataset: secondSourceDataset,
      },
      {
        dataset: firstDataset,
        sourceType: "csv_file",
        sourceDataset: firstSourceDataset,
      },
    ]);
  });

  it("scopes each source type's getAll call to only that bucket's ids", async () => {
    const csvDataset = {
      id: CSV_ID,
      name: "csv dataset",
      sourceType: "csv_file" as const,
      workspaceId: "workspace-1",
    };
    const virtualDataset = {
      id: VIRTUAL_ID,
      name: "virtual dataset",
      sourceType: "virtual" as const,
      workspaceId: "workspace-1",
    };
    datasetGetAllMock.mockResolvedValue([csvDataset, virtualDataset]);
    csvGetAllMock.mockResolvedValue([]);
    virtualGetAllMock.mockResolvedValue([]);

    const { getRelationSources } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    await getRelationSources([CSV_ID, VIRTUAL_ID]);

    expect(csvGetAllMock).toHaveBeenCalledWith({
      where: { dataset_id: { in: [CSV_ID] } },
    });
    expect(virtualGetAllMock).toHaveBeenCalledWith({
      where: { dataset_id: { in: [VIRTUAL_ID] } },
    });
  });

  it("dispatches a mixed request to each source's extractor, in the order source types are first seen in the dataset list (observed, not asserted as designed)", async () => {
    const csvDataset = {
      id: CSV_ID,
      name: "csv dataset",
      sourceType: "csv_file" as const,
      workspaceId: "workspace-1",
    };
    const virtualDataset = {
      id: VIRTUAL_ID,
      name: "virtual dataset",
      sourceType: "virtual" as const,
      workspaceId: "workspace-1",
    };
    const openDataDataset = {
      id: OPEN_DATA_ID,
      name: "open data dataset",
      sourceType: "open_data" as const,
      workspaceId: "workspace-1",
    };
    const csvSourceDataset = { datasetId: CSV_ID, delimiter: "," };
    const virtualSourceDataset = { datasetId: VIRTUAL_ID, rawSql: "SELECT 1" };
    const openDataSourceDataset = {
      datasetId: OPEN_DATA_ID,
      sourceUrl: "https://x",
    };
    // Datasets come back in a deliberately non-alphabetical, non-input order
    // to observe whatever grouping order the current code produces.
    datasetGetAllMock.mockResolvedValue([
      virtualDataset,
      csvDataset,
      openDataDataset,
    ]);
    csvGetAllMock.mockResolvedValue([csvSourceDataset]);
    virtualGetAllMock.mockResolvedValue([virtualSourceDataset]);
    openDataGetAllMock.mockResolvedValue([openDataSourceDataset]);

    const { getRelationSources } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await getRelationSources([VIRTUAL_ID, CSV_ID, OPEN_DATA_ID]);

    // Observed: groups come out in the order their source type is first
    // encountered while scanning `datasets` (virtual, then csv_file, then
    // open_data), matching the mocked getAll() return order above, not the
    // order of the ids passed to getRelationSources.
    expect(result).toEqual([
      {
        dataset: virtualDataset,
        sourceType: "virtual",
        sourceDataset: virtualSourceDataset,
      },
      {
        dataset: csvDataset,
        sourceType: "csv_file",
        sourceDataset: csvSourceDataset,
      },
      {
        dataset: openDataDataset,
        sourceType: "open_data",
        sourceDataset: openDataSourceDataset,
      },
    ]);
  });
});

describe("probeRelationCache", () => {
  it("returns an empty array without calling any client for an empty request", async () => {
    const { probeRelationCache } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");

    const result = await probeRelationCache([]);

    expect(result).toEqual([]);
    expect(getTableOrViewNamesMock).not.toHaveBeenCalled();
  });

  it("returns only the dependencies not already loaded as DuckDB tables", async () => {
    getTableOrViewNamesMock.mockResolvedValue([LOADED_ID]);

    const { probeRelationCache } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await probeRelationCache([LOADED_ID, MISSING_ID]);

    expect(result).toEqual([MISSING_ID]);
  });

  it("treats a present table as a miss when its loaded columns do not cover the request", async () => {
    getTableOrViewNamesMock.mockResolvedValue([LOADED_ID]);
    rememberQueryableColumns(LOADED_ID, ["a"]);

    const { probeRelationCache } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await probeRelationCache([LOADED_ID], {
      [LOADED_ID]: ["a", "b"],
    });

    expect(result).toEqual([LOADED_ID]);
  });

  it("still serves a present table whose loaded columns cover the request", async () => {
    getTableOrViewNamesMock.mockResolvedValue([LOADED_ID]);
    rememberQueryableColumns(LOADED_ID, ["a", "b"]);

    const { probeRelationCache } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await probeRelationCache([LOADED_ID], {
      [LOADED_ID]: ["a"],
    });

    expect(result).toEqual([]);
  });
});
