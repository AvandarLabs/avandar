import { beforeEach, describe, expect, it, vi } from "vitest";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import {
  clearDatasetRowCountCache,
  getCachedDatasetRowCount,
  setCachedDatasetRowCount,
} from "@/views/DataExplorerApp/datasetRowCountCache";
import {
  LARGE_DATASET_AUTO_LIMIT,
  LARGE_DATASET_ROW_THRESHOLD,
} from "@/views/DataExplorerApp/manualQueryLimit/manualQueryLimit";
import {
  fetchDatasetRowCount,
  resolveManualQueryForExecution,
} from "@/views/DataExplorerApp/resolveManualQueryForExecution/resolveManualQueryForExecution";
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
          dataType: "integer",
          datasetId,
          columnIdx: 0,
        },
        aggregation: "none",
      },
    ],
  } as unknown as ReturnType<typeof StructuredQuery.makeEmpty>;
}

describe("resolveManualQueryForExecution", () => {
  beforeEach(() => {
    clearDatasetRowCountCache();
    vi.mocked(DatasetQueryClient.getDatasetMeta).mockReset();
  });

  it("returns the query unchanged when an explicit limit is set", async () => {
    const query = { ..._datasetQuery(), limit: 10 };

    const result = await resolveManualQueryForExecution({ query, workspaceId });

    expect(result).toEqual({ query, didAutoLimit: false });
    expect(DatasetQueryClient.getDatasetMeta).not.toHaveBeenCalled();
  });

  it("returns the query unchanged when aggregations are active", async () => {
    const query = {
      ..._datasetQuery(),
      aggregations: { col_1: "count" },
    };

    const result = await resolveManualQueryForExecution({ query, workspaceId });

    expect(result).toEqual({ query, didAutoLimit: false });
    expect(DatasetQueryClient.getDatasetMeta).not.toHaveBeenCalled();
  });

  it("applies auto limit when row count exceeds the threshold", async () => {
    vi.mocked(DatasetQueryClient.getDatasetMeta).mockResolvedValue({
      rows: LARGE_DATASET_ROW_THRESHOLD + 1,
      columns: [],
    });

    const query = _datasetQuery();
    const result = await resolveManualQueryForExecution({ query, workspaceId });

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
    const result = await resolveManualQueryForExecution({ query, workspaceId });

    expect(result).toEqual({
      query,
      didAutoLimit: false,
      rowCount: LARGE_DATASET_ROW_THRESHOLD,
    });
  });

  it("uses cached row count without calling getDatasetMeta again", async () => {
    setCachedDatasetRowCount(datasetId, LARGE_DATASET_ROW_THRESHOLD + 1);

    const query = _datasetQuery();
    await resolveManualQueryForExecution({ query, workspaceId });

    expect(DatasetQueryClient.getDatasetMeta).not.toHaveBeenCalled();
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
