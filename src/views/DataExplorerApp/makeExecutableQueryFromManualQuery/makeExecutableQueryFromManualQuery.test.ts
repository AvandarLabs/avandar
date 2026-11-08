import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createConceptAttributeQueryColumn,
  createDatasetQueryColumn,
} from "$/models/queries/QueryColumn/QueryColumn.fixtures";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import {
  clearDatasetRowCountCache,
  getCachedDatasetRowCount,
  setCachedDatasetRowCount,
} from "@/views/DataExplorerApp/datasetRowCountCache";
import {
  fetchDatasetRowCount,
  makeExecutableQueryFromManualQuery,
} from "@/views/DataExplorerApp/makeExecutableQueryFromManualQuery/makeExecutableQueryFromManualQuery";
import {
  LARGE_DATASET_AUTO_LIMIT,
  LARGE_DATASET_ROW_THRESHOLD,
} from "@/views/DataExplorerApp/manualQueryLimit/manualQueryLimit";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";

vi.mock("@/clients/datasets/DatasetQueryClient", () => {
  return {
    DatasetQueryClient: {
      getDatasetMeta: vi.fn(),
    },
  };
});

const workspaceId = "workspace_test" as Workspace.Id;
const datasetId = "dataset_large" as DatasetId;

function _datasetQuery(): ReturnType<typeof StructuredQuery.makeEmpty> {
  return {
    ...StructuredQuery.makeEmpty(),
    dataSource: {
      __type: "Dataset",
      id: datasetId,
      name: "Large",
    },
    queryColumns: [
      {
        id: "col_1",
        baseColumn: {
          __type: "DatasetColumn",
          id: "dc_1",
          name: "id",
          dataType: "bigint",
          datasetId,
          columnIdx: 0,
        },
        aggregation: "none",
      },
    ],
  } as unknown as ReturnType<typeof StructuredQuery.makeEmpty>;
}

describe("makeExecutableQueryFromManualQuery", () => {
  beforeEach(() => {
    clearDatasetRowCountCache();
    vi.mocked(DatasetQueryClient.getDatasetMeta).mockReset();
  });

  it("returns the query unchanged when an explicit limit is set", async () => {
    const query = { ..._datasetQuery(), limit: 10 };

    const result = await makeExecutableQueryFromManualQuery({
      query,
      workspaceId,
    });

    expect(result).toEqual({ query, didAutoLimit: false });
    expect(DatasetQueryClient.getDatasetMeta).not.toHaveBeenCalled();
  });

  it("returns the query unchanged when aggregations are active", async () => {
    const query = {
      ..._datasetQuery(),
      aggregations: { col_1: "count" },
    };

    const result = await makeExecutableQueryFromManualQuery({
      query,
      workspaceId,
    });

    expect(result).toEqual({ query, didAutoLimit: false });
    expect(DatasetQueryClient.getDatasetMeta).not.toHaveBeenCalled();
  });

  it("applies auto limit when row count exceeds the threshold", async () => {
    vi.mocked(DatasetQueryClient.getDatasetMeta).mockResolvedValue({
      rows: LARGE_DATASET_ROW_THRESHOLD + 1,
      columns: [],
    });

    const query = _datasetQuery();
    const result = await makeExecutableQueryFromManualQuery({
      query,
      workspaceId,
    });

    expect(result.didAutoLimit).toBe(true);
    expect(result.query.limit).toBe(LARGE_DATASET_AUTO_LIMIT);
    expect(result.rowCount).toBe(LARGE_DATASET_ROW_THRESHOLD + 1);
    expect(getCachedDatasetRowCount(datasetId)).toBe(
      LARGE_DATASET_ROW_THRESHOLD + 1,
    );
  });

  it("does not apply auto limit when row count is at or below the threshold", async () => {
    vi.mocked(DatasetQueryClient.getDatasetMeta).mockResolvedValue({
      rows: LARGE_DATASET_ROW_THRESHOLD,
      columns: [],
    });

    const query = _datasetQuery();
    const result = await makeExecutableQueryFromManualQuery({
      query,
      workspaceId,
    });

    expect(result).toEqual({
      query,
      didAutoLimit: false,
      rowCount: LARGE_DATASET_ROW_THRESHOLD,
    });
  });

  it("uses cached row count without calling getDatasetMeta again", async () => {
    setCachedDatasetRowCount(datasetId, LARGE_DATASET_ROW_THRESHOLD + 1);

    const query = _datasetQuery();
    await makeExecutableQueryFromManualQuery({ query, workspaceId });

    expect(DatasetQueryClient.getDatasetMeta).not.toHaveBeenCalled();
  });

  it("keeps max on a date column, which DuckDB runs even though the form does not offer it", async () => {
    const reportDate = createDatasetQueryColumn({
      name: "report_date",
      dataType: "date",
    });
    const original = {
      ..._datasetQuery(),
      queryColumns: [reportDate],
      aggregations: { [reportDate.id]: "max" as const },
      limit: 10,
    };

    const { query } = await makeExecutableQueryFromManualQuery({
      query: original,
      workspaceId,
    });

    expect(query).toBe(original);
  });

  describe("with a case type field that keeps every value", () => {
    function _listFieldQuery(
      aggregation: "sum" | "count",
    ): ReturnType<typeof StructuredQuery.makeEmpty> {
      const column = createConceptAttributeQueryColumn({
        name: "Daily new cases",
        dataType: "bigint",
        isArray: true,
      });
      return {
        ..._datasetQuery(),
        queryColumns: [column],
        aggregations: { [column.id]: aggregation },
        limit: 10,
      };
    }

    it("resets a saved sum to none so the SQL never sums a list", async () => {
      const { query } = await makeExecutableQueryFromManualQuery({
        query: _listFieldQuery("sum"),
        workspaceId,
      });

      expect(Object.values(query.aggregations)).toEqual(["none"]);
      expect(structuredQueryToSql(query)).not.toMatch(/SUM\(/i);
    });

    it("keeps a saved count, which works on a list", async () => {
      const original = _listFieldQuery("count");

      const { query } = await makeExecutableQueryFromManualQuery({
        query: original,
        workspaceId,
      });

      expect(query).toBe(original);
    });
  });
});

describe("fetchDatasetRowCount", () => {
  beforeEach(() => {
    clearDatasetRowCountCache();
    vi.mocked(DatasetQueryClient.getDatasetMeta).mockReset();
  });

  it("reads from cache when available", async () => {
    setCachedDatasetRowCount(datasetId, 99_999);

    const rows = await fetchDatasetRowCount({ datasetId, workspaceId });

    expect(rows).toBe(99_999);
    expect(DatasetQueryClient.getDatasetMeta).not.toHaveBeenCalled();
  });
});
