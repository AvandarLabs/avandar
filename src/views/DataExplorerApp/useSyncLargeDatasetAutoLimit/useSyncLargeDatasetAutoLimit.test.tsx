import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";
import type { Workspace } from "$/models/Workspace/Workspace";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { renderHook, waitFor } from "@/test-utils";
import {
  clearDatasetRowCountCache,
  setCachedDatasetRowCount,
} from "@/views/DataExplorerApp/datasetRowCountCache";
import {
  LARGE_DATASET_AUTO_LIMIT,
  LARGE_DATASET_ROW_THRESHOLD,
} from "@/views/DataExplorerApp/manualQueryLimit/manualQueryLimit";
import { useSyncLargeDatasetAutoLimit } from "@/views/DataExplorerApp/useSyncLargeDatasetAutoLimit/useSyncLargeDatasetAutoLimit";

const workspaceId = "workspace_test" as Workspace.Id;
const datasetId = "dataset_large" as DatasetId;

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: workspaceId };
    },
  };
});

function _datasetQuery(): PartialStructuredQuery {
  return {
    ...StructuredQuery.makeEmpty(),
    dataSource: {
      __type: "Dataset",
      id: datasetId,
      name: "Large",
    },
  } as unknown as PartialStructuredQuery;
}

describe("useSyncLargeDatasetAutoLimit", () => {
  beforeEach(() => {
    clearDatasetRowCountCache();
  });

  it("applies auto-limit when a large dataset is selected in the manual form (no rawSql)", async () => {
    setCachedDatasetRowCount(datasetId, LARGE_DATASET_ROW_THRESHOLD + 1);
    const onApplyAutoLimit = vi.fn();

    renderHook(() => {
      return useSyncLargeDatasetAutoLimit({
        query: _datasetQuery(),
        rawSql: undefined,
        onApplyAutoLimit,
      });
    });

    await waitFor(() => {
      expect(onApplyAutoLimit).toHaveBeenCalledWith(LARGE_DATASET_AUTO_LIMIT);
    });
  });

  it("does NOT apply auto-limit when rawSql is set (LLM or hand-edited SQL)", async () => {
    setCachedDatasetRowCount(datasetId, LARGE_DATASET_ROW_THRESHOLD + 1);
    const onApplyAutoLimit = vi.fn();

    renderHook(() => {
      return useSyncLargeDatasetAutoLimit({
        query: _datasetQuery(),
        rawSql: 'SELECT COUNT(*) FROM "LONG_global_deaths.csv"',
        onApplyAutoLimit,
      });
    });

    // Give any pending microtasks a chance to flush; the callback must still
    // not fire because raw SQL is sacrosanct.
    await new Promise((resolve) => {
      return setTimeout(resolve, 0);
    });

    expect(onApplyAutoLimit).not.toHaveBeenCalled();
  });

  it("does not apply auto-limit when the structured query already has a limit", async () => {
    setCachedDatasetRowCount(datasetId, LARGE_DATASET_ROW_THRESHOLD + 1);
    const onApplyAutoLimit = vi.fn();

    renderHook(() => {
      return useSyncLargeDatasetAutoLimit({
        query: { ..._datasetQuery(), limit: 5 } as PartialStructuredQuery,
        rawSql: undefined,
        onApplyAutoLimit,
      });
    });

    await new Promise((resolve) => {
      return setTimeout(resolve, 0);
    });

    expect(onApplyAutoLimit).not.toHaveBeenCalled();
  });
});
