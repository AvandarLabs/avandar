import { Model } from "@models";
import { useCallback, useRef, useState } from "react";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import {
  LARGE_DATASET_AUTO_LIMIT,
  LARGE_DATASET_ROW_THRESHOLD,
  shouldAutoLimitLargeDataset,
} from "@/views/DataExplorerApp/manualQueryLimit";
import { LARGE_DATASET_LIMIT_HINT_VISIBLE_MS } from "@/views/DataExplorerApp/QueryForm/ManualQueryLargeDatasetLimitHint";
import type { ManualQueryFormHandlers } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";

type Result = {
  onDataSourceChange: (dataSource: QueryDataSource | null) => void;
  isLargeDatasetLimitHintVisible: boolean;
  dismissLargeDatasetLimitHint: () => void;
};

/**
 * Wraps manual-form data source changes: applies a default LIMIT on very large
 * datasets when the query has no filters, and drives the hint visibility timer.
 */
export function useManualQueryDataSourceChange(opts: {
  query: PartialStructuredQuery;
  handlers: ManualQueryFormHandlers;
}): Result {
  const { query, handlers } = opts;
  const workspace = useCurrentWorkspace();
  const [isLargeDatasetLimitHintVisible, setIsLargeDatasetLimitHintVisible] =
    useState(false);
  const applyRequestIdRef = useRef(0);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHintTimeout = useCallback((): void => {
    if (hintTimeoutRef.current !== null) {
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
  }, []);

  const hideLargeDatasetLimitHint = useCallback((): void => {
    clearHintTimeout();
    setIsLargeDatasetLimitHintVisible(false);
  }, [clearHintTimeout]);

  const showLargeDatasetLimitHint = useCallback((): void => {
    clearHintTimeout();
    setIsLargeDatasetLimitHintVisible(true);
    hintTimeoutRef.current = setTimeout(() => {
      setIsLargeDatasetLimitHintVisible(false);
      hintTimeoutRef.current = null;
    }, LARGE_DATASET_LIMIT_HINT_VISIBLE_MS);
  }, [clearHintTimeout]);

  const onDataSourceChange = useCallback(
    (dataSource: QueryDataSource | null): void => {
      const requestId = applyRequestIdRef.current + 1;
      applyRequestIdRef.current = requestId;
      hideLargeDatasetLimitHint();

      const nextDataSource = dataSource ?? undefined;
      handlers.onSetDataSource(nextDataSource);

      if (
        nextDataSource === undefined ||
        !Model.isOfModelType(nextDataSource, "Dataset") ||
        !shouldAutoLimitLargeDataset(query)
      ) {
        return;
      }

      void DatasetQueryClient.getDatasetMeta({
        datasetId: nextDataSource.id,
        workspaceId: workspace.id,
      })
        .then((meta) => {
          if (applyRequestIdRef.current !== requestId) {
            return;
          }
          if (meta.rows <= LARGE_DATASET_ROW_THRESHOLD) {
            return;
          }
          handlers.onSetLimit(LARGE_DATASET_AUTO_LIMIT);
          showLargeDatasetLimitHint();
        })
        .catch(() => {
          // Row count is best-effort; the form stays usable without auto-limit.
        });
    },
    [
      handlers,
      hideLargeDatasetLimitHint,
      query,
      showLargeDatasetLimitHint,
      workspace.id,
    ],
  );

  return {
    onDataSourceChange,
    isLargeDatasetLimitHintVisible,
    dismissLargeDatasetLimitHint: hideLargeDatasetLimitHint,
  };
}
