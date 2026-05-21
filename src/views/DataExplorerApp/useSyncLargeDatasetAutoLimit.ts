import { Model } from "@models";
import { useEffect, useRef } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import {
  largeDatasetAutoLimitFromRowCount,
  shouldAutoLimitLargeDataset,
} from "@/views/DataExplorerApp/manualQueryLimit";
import { fetchDatasetRowCount } from "@/views/DataExplorerApp/resolveManualQueryForExecution";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";

type Options = {
  query: PartialStructuredQuery;
  onApplyAutoLimit: (limit: number) => void;
};

/**
 * When the manual query can return unbounded rows from a large dataset,
 * resolves row count (cached) and writes the auto LIMIT into structured-query
 * state so the
 * form and executed SQL stay aligned.
 */
export function useSyncLargeDatasetAutoLimit(opts: Options): void {
  const { query, onApplyAutoLimit } = opts;
  const workspace = useCurrentWorkspace();
  const syncRequestIdRef = useRef(0);
  const onApplyAutoLimitRef = useRef(onApplyAutoLimit);
  onApplyAutoLimitRef.current = onApplyAutoLimit;
  const queryRef = useRef(query);
  queryRef.current = query;

  const dataSource = query.dataSource;
  const datasetId =
    dataSource !== undefined && Model.isOfModelType(dataSource, "Dataset") ?
      dataSource.id
    : undefined;

  useEffect(() => {
    if (datasetId === undefined || !shouldAutoLimitLargeDataset(query)) {
      return;
    }

    const requestId = syncRequestIdRef.current + 1;
    syncRequestIdRef.current = requestId;

    void fetchDatasetRowCount({
      datasetId,
      workspaceId: workspace.id,
    })
      .then((rowCount) => {
        if (syncRequestIdRef.current !== requestId) {
          return;
        }
        if (!shouldAutoLimitLargeDataset(queryRef.current)) {
          return;
        }
        const autoLimit = largeDatasetAutoLimitFromRowCount(rowCount);
        if (autoLimit === undefined) {
          return;
        }
        onApplyAutoLimitRef.current(autoLimit);
      })
      .catch(() => {
        // Row count is best-effort; leave limit unset.
      });
  }, [
    datasetId,
    query.aggregations,
    query.filters,
    query.having,
    query.limit,
    workspace.id,
  ]);
}
