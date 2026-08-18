/**
 * Characterization tests for the source-type dispatch in
 * `qetlDiceExtractors.ts`, ahead of replacing its `ts-pattern` match with a
 * registry lookup. These pin down current behavior, including behavior that
 * looks wrong (the `google_sheets` throw), so a later refactor can be checked
 * against them without editing any assertion here.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
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
  getTableOrViewNamesMock,
} = vi.hoisted(() => {
  return {
    datasetGetAllMock: vi.fn(),
    csvGetAllMock: vi.fn(),
    xlsxGetAllMock: vi.fn(),
    virtualGetAllMock: vi.fn(),
    openDataGetAllMock: vi.fn(),
    getTableOrViewNamesMock: vi.fn(),
  };
});

function _withCacheChain(getAll: ReturnType<typeof vi.fn>) {
  return {
    withCache: () => {
      return { withEnsureQueryData: () => ({ getAll }) };
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

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return { DuckDbClient: { getTableOrViewNames: getTableOrViewNamesMock } };
});

beforeEach(() => {
  vi.clearAllMocks();
  datasetGetAllMock.mockResolvedValue([]);
  csvGetAllMock.mockResolvedValue([]);
  xlsxGetAllMock.mockResolvedValue([]);
  virtualGetAllMock.mockResolvedValue([]);
  openDataGetAllMock.mockResolvedValue([]);
  getTableOrViewNamesMock.mockResolvedValue([]);
});

describe("getDiceExtractors", () => {
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

    const { getDiceExtractors } =
      await import("@/clients/qetl/QetlClient/qetlDiceExtractors");
    const result = await getDiceExtractors([CSV_ID]);

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

    const { getDiceExtractors } =
      await import("@/clients/qetl/QetlClient/qetlDiceExtractors");
    const result = await getDiceExtractors([XLSX_ID]);

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

    const { getDiceExtractors } =
      await import("@/clients/qetl/QetlClient/qetlDiceExtractors");
    const result = await getDiceExtractors([VIRTUAL_ID]);

    expect(result).toEqual([
      { dataset, sourceType: "virtual", sourceDataset },
    ]);
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

    const { getDiceExtractors } =
      await import("@/clients/qetl/QetlClient/qetlDiceExtractors");
    const result = await getDiceExtractors([OPEN_DATA_ID]);

    expect(result).toEqual([
      { dataset, sourceType: "open_data", sourceDataset },
    ]);
  });

  it("throws for google_sheets datasets, which are not supported yet", async () => {
    const dataset = {
      id: GOOGLE_SHEETS_ID,
      name: "google sheets dataset",
      sourceType: "google_sheets" as const,
      workspaceId: "workspace-1",
    };
    datasetGetAllMock.mockResolvedValue([dataset]);

    const { getDiceExtractors } =
      await import("@/clients/qetl/QetlClient/qetlDiceExtractors");

    await expect(getDiceExtractors([GOOGLE_SHEETS_ID])).rejects.toThrow(
      "Google Sheets extraction is not supported yet",
    );
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

    const { getDiceExtractors } =
      await import("@/clients/qetl/QetlClient/qetlDiceExtractors");
    const result = await getDiceExtractors([
      VIRTUAL_ID,
      CSV_ID,
      OPEN_DATA_ID,
    ]);

    // Observed: groups come out in the order their source type is first
    // encountered while scanning `datasets` (virtual, then csv_file, then
    // open_data), matching the mocked getAll() return order above, not the
    // order of the ids passed to getDiceExtractors.
    expect(result).toEqual([
      { dataset: virtualDataset, sourceType: "virtual", sourceDataset: virtualSourceDataset },
      { dataset: csvDataset, sourceType: "csv_file", sourceDataset: csvSourceDataset },
      { dataset: openDataDataset, sourceType: "open_data", sourceDataset: openDataSourceDataset },
    ]);
  });
});

describe("getMissingDice", () => {
  it("returns an empty array without calling any client for an empty request", async () => {
    const { getMissingDice } =
      await import("@/clients/qetl/QetlClient/qetlDiceExtractors");

    const result = await getMissingDice([]);

    expect(result).toEqual([]);
    expect(getTableOrViewNamesMock).not.toHaveBeenCalled();
  });

  it("returns only the dependencies not already loaded as DuckDB tables", async () => {
    getTableOrViewNamesMock.mockResolvedValue([LOADED_ID]);

    const { getMissingDice } =
      await import("@/clients/qetl/QetlClient/qetlDiceExtractors");
    const result = await getMissingDice([LOADED_ID, MISSING_ID]);

    expect(result).toEqual([MISSING_ID]);
  });
});
