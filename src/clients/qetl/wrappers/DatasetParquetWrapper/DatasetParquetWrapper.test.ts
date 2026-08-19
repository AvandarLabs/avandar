/** Tests that each Parquet source type is fetched the way it is today. */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatasetParquetWrapper } from "@/clients/qetl/wrappers/DatasetParquetWrapper/DatasetParquetWrapper";
import type { ILogger } from "@avandar/logger";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type { Workspace } from "$/models/Workspace/Workspace";

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const WORKSPACE_ID = "99999999-9999-4999-8999-999999999999" as Workspace.Id;
const CATALOG_ENTRY_ID = "55555555-5555-4555-8555-555555555555";

const DATASET_REF = {
  kind: "dataset",
  id: DATASET_ID,
} as const satisfies RelationRef.T;

const CONCEPT_REF = {
  kind: "concept",
  id: "22222222-2222-4222-8222-222222222222" as Concept.Id,
} as const satisfies RelationRef.T;

const CONTEXT = {
  workspaceId: WORKSPACE_ID,
  logger: console as unknown as ILogger,
};

const {
  catalogEntryGetOneMock,
  csvSourceGetAllMock,
  datasetColumnGetAllMock,
  datasetGetAllMock,
  downloadDatasetMock,
  openDataSourceGetAllMock,
  xlsxSourceGetAllMock,
} = vi.hoisted(() => {
  return {
    catalogEntryGetOneMock: vi.fn(),
    csvSourceGetAllMock: vi.fn(),
    datasetColumnGetAllMock: vi.fn(),
    datasetGetAllMock: vi.fn(),
    downloadDatasetMock: vi.fn(),
    openDataSourceGetAllMock: vi.fn(),
    xlsxSourceGetAllMock: vi.fn(),
  };
});

function _cachedClient(fns: Record<string, unknown>): {
  withCache: () => { withEnsureQueryData: () => Record<string, unknown> };
} {
  return {
    withCache: () => {
      return {
        withEnsureQueryData: () => {
          return fns;
        },
      };
    },
  };
}

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: _cachedClient({ getAll: datasetGetAllMock }),
  };
});

vi.mock("@/clients/datasets/source-datasets/CsvFileDatasetClient", () => {
  return {
    CsvFileDatasetClient: _cachedClient({ getAll: csvSourceGetAllMock }),
  };
});

vi.mock("@/clients/datasets/source-datasets/XlsxFileDatasetClient", () => {
  return {
    XlsxFileDatasetClient: _cachedClient({ getAll: xlsxSourceGetAllMock }),
  };
});

vi.mock("@/clients/datasets/source-datasets/OpenDataDatasetClient", () => {
  return {
    OpenDataDatasetClient: _cachedClient({ getAll: openDataSourceGetAllMock }),
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: _cachedClient({ getAll: datasetColumnGetAllMock }),
  };
});

vi.mock("@/clients/catalog-entries/OpenDataCatalogEntryClient", () => {
  return {
    OpenDataCatalogEntryClient: { getOne: catalogEntryGetOneMock },
  };
});

vi.mock(
  "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient",
  () => {
    return {
      DatasetParquetStorageClient: { downloadDataset: downloadDatasetMock },
    };
  },
);

function _mockDataset(sourceType: Dataset.T["sourceType"]): void {
  // `getAll` resolves a list, matching the shape every caller of this client
  // uses. The wrapper takes the first row.
  datasetGetAllMock.mockResolvedValue([
    {
      id: DATASET_ID,
      name: "cases",
      sourceType,
      workspaceId: WORKSPACE_ID,
    },
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  csvSourceGetAllMock.mockResolvedValue([{ datasetId: DATASET_ID }]);
  xlsxSourceGetAllMock.mockResolvedValue([{ datasetId: DATASET_ID }]);
  openDataSourceGetAllMock.mockResolvedValue([
    { datasetId: DATASET_ID, catalogEntryId: CATALOG_ENTRY_ID },
  ]);
  datasetColumnGetAllMock.mockResolvedValue([]);
});

describe("DatasetParquetWrapper", () => {
  it("handles dataset refs and leaves concept refs to another wrapper", () => {
    const wrapper = createDatasetParquetWrapper();

    expect(wrapper.handles(DATASET_REF)).toBe(true);
    expect(wrapper.handles(CONCEPT_REF)).toBe(false);
  });

  it("downloads a csv dataset's stored parquet from its own workspace", async () => {
    _mockDataset("csv_file");
    const parquetBlob = new Blob(["csv-parquet"]);
    downloadDatasetMock.mockResolvedValue(parquetBlob);
    const wrapper = createDatasetParquetWrapper();

    const acquired = await wrapper.acquire!(
      { ref: DATASET_REF, columns: "all" },
      CONTEXT,
    );

    expect(csvSourceGetAllMock).toHaveBeenCalledTimes(1);
    expect(xlsxSourceGetAllMock).not.toHaveBeenCalled();
    expect(downloadDatasetMock).toHaveBeenCalledWith({
      datasetId: DATASET_ID,
      workspaceId: WORKSPACE_ID,
    });
    expect(acquired).toEqual({
      ref: DATASET_REF,
      parquetBlob,
      sourceVersion: undefined,
    });
  });

  it("reads an xlsx dataset through the xlsx source client", async () => {
    _mockDataset("xlsx_file");
    downloadDatasetMock.mockResolvedValue(new Blob(["xlsx-parquet"]));
    const wrapper = createDatasetParquetWrapper();

    await wrapper.acquire!({ ref: DATASET_REF, columns: "all" }, CONTEXT);

    expect(xlsxSourceGetAllMock).toHaveBeenCalledTimes(1);
    expect(csvSourceGetAllMock).not.toHaveBeenCalled();
  });

  it("reports the dataset it failed to download when storage has no parquet", async () => {
    _mockDataset("csv_file");
    downloadDatasetMock.mockResolvedValue(undefined);
    const wrapper = createDatasetParquetWrapper();

    await expect(
      wrapper.acquire!({ ref: DATASET_REF, columns: "all" }, CONTEXT),
    ).rejects.toThrow(
      `Failed to download data for csv_file dataset '${DATASET_ID}' (cases)`,
    );
  });

  it("downloads open data from the parquet url its catalog entry names", async () => {
    _mockDataset("open_data");
    catalogEntryGetOneMock.mockResolvedValue({
      id: CATALOG_ENTRY_ID,
      canonicalUrls: [
        "https://data.example/cases.csv",
        "https://data.example/cases.PARQUET",
      ],
    });
    const parquetBlob = new Blob(["open-data-parquet"]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => {
        return parquetBlob;
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = createDatasetParquetWrapper();

    const acquired = await wrapper.acquire!(
      { ref: DATASET_REF, columns: "all" },
      CONTEXT,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://data.example/cases.PARQUET",
    );
    expect(downloadDatasetMock).not.toHaveBeenCalled();
    expect(acquired.parquetBlob).toBe(parquetBlob);
  });

  it("refuses open data whose catalog entry has no parquet url", async () => {
    _mockDataset("open_data");
    catalogEntryGetOneMock.mockResolvedValue({
      id: CATALOG_ENTRY_ID,
      canonicalUrls: ["https://data.example/cases.csv"],
    });
    const wrapper = createDatasetParquetWrapper();

    await expect(
      wrapper.acquire!({ ref: DATASET_REF, columns: "all" }, CONTEXT),
    ).rejects.toThrow("No Parquet URL in catalog for dataset 'cases'");
  });

  it("refuses a dataset whose source type belongs to another wrapper", async () => {
    _mockDataset("google_sheets");
    const wrapper = createDatasetParquetWrapper();

    await expect(
      wrapper.acquire!({ ref: DATASET_REF, columns: "all" }, CONTEXT),
    ).rejects.toThrow(/google_sheets dataset, which the dataset Parquet/);
  });

  it("fetches every column even when a subset is requested", async () => {
    const fetchParquet = vi.fn().mockResolvedValue(new Blob(["parquet"]));
    const wrapper = createDatasetParquetWrapper({ fetchParquet });

    await wrapper.acquire!({ ref: DATASET_REF, columns: ["a"] }, CONTEXT);

    expect(fetchParquet).toHaveBeenCalledWith(DATASET_REF);
  });

  it("describes a dataset with its stored columns as duckdb types", async () => {
    datasetColumnGetAllMock.mockResolvedValue([
      { name: "district", dataType: "varchar" },
      { name: "cases", dataType: "bigint" },
    ]);
    const wrapper = createDatasetParquetWrapper();

    await expect(wrapper.describe(DATASET_REF, CONTEXT)).resolves.toEqual({
      columns: [
        { name: "district", dataType: "VARCHAR", isArray: false },
        { name: "cases", dataType: "BIGINT", isArray: false },
      ],
    });
  });
});
