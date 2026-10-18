import { beforeEach, describe, expect, it, vi } from "vitest";
import { readPostgresTableCsvAsText } from "@/clients/qetl/QueryMediator/relationLoading/readPostgresTableCsvAsText/readPostgresTableCsvAsText";
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

describe("readPostgresTableCsvAsText", () => {
  beforeEach(() => {
    loadCsvMock.mockReset().mockResolvedValue({ parquetData: new Blob([]) });
    // Stored out of order, as a query result may return them.
    getAllColumnsMock.mockReset().mockResolvedValue([
      { originalName: "zip_code", columnIdx: 1, dataType: "varchar" },
      { originalName: "id", columnIdx: 0, dataType: "bigint" },
    ]);
  });

  it("reads every stored column as text, in the table's column order, so no value is sniffed into another type", async () => {
    await readPostgresTableCsvAsText({
      datasetId: DATASET_ID,
      csvText: "id,zip_code\r\n1,02134",
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
});
