import { beforeEach, describe, expect, it, vi } from "vitest";
import { readRelationCsv } from "@/clients/qetl/QueryMediator/relationLoading/readRelationCsv/readRelationCsv";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";

const { getAllColumnsMock, loadCsvMock } = vi.hoisted(() => {
  return { getAllColumnsMock: vi.fn(), loadCsvMock: vi.fn() };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: getAllColumnsMock };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return { DuckDbClient: { loadCsv: loadCsvMock } };
});

vi.mock("@/config/AvaQueryClient", () => {
  return { AvaQueryClient: {} };
});

const DATASET_ID = "30000000-0000-4000-8000-000000000001" as Dataset.Id;

describe("readRelationCsv", () => {
  beforeEach(() => {
    loadCsvMock.mockReset().mockResolvedValue({ parquetData: new Blob([]) });
    // Stored out of order, as a query result may return them.
    getAllColumnsMock.mockReset().mockResolvedValue([
      { originalName: "zip_code", columnIdx: 1, dataType: "varchar" },
      { originalName: "id", columnIdx: 0, dataType: "bigint" },
    ]);
  });

  it("reads a source-schema relation's stored columns as text, in the table's column order, so no value is guessed into another type", async () => {
    await readRelationCsv({
      datasetId: DATASET_ID,
      csvText: "id,zip_code\r\n1,02134",
      columnTypes: "source-schema",
      datasetDuckDbLease: {} as DatasetDuckDbLease,
    });

    expect(loadCsvMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tableName: DATASET_ID,
        columns: [
          ["id", "VARCHAR"],
          ["zip_code", "VARCHAR"],
        ],
      }),
    );
  });

  it("lets DuckDB infer an inferred relation's column types from the values, without forcing any column", async () => {
    await readRelationCsv({
      datasetId: DATASET_ID,
      csvText: "id,zip_code\r\n1,02134",
      columnTypes: "inferred",
      datasetDuckDbLease: {} as DatasetDuckDbLease,
    });

    expect(loadCsvMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ columns: expect.anything() }),
    );
    expect(getAllColumnsMock).not.toHaveBeenCalled();
  });
});
