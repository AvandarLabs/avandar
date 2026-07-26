import { Model } from "@models";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { shouldAutoLimitLargeDataset } from "@/views/DataExplorerApp/manualQueryLimit/manualQueryLimit";
import { LARGE_DATASET_LIMIT_HINT_VISIBLE_MS } from "@/views/DataExplorerApp/QueryForm/ManualQueryLargeDatasetLimitHint/ManualQueryLargeDatasetLimitHint";
import { buildDataSourceCommitOptions } from "@/views/DataExplorerApp/resolveManualQueryForExecution/resolveManualQueryForExecution";
import type { ManualQueryFormHandlers } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";

type Result = {
  onDataSourceChange: (dataSource: QueryDataSource | null) => void;
  isLargeDatasetLimitHintVisible: boolean;
  dismissLargeDatasetLimitHint: () => void;
};

/**
 * Wraps manual-form data source changes: resolves row count before committing
 * the data source when a large-dataset auto LIMIT may apply, then applies
 * source and limit in one update so the first query is bounded.
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

  useEffect(() => {
    return clearHintTimeout;
  }, [clearHintTimeout]);

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
      const shouldCheckRowCount =
        nextDataSource !== undefined &&
        Model.isOfModelType(nextDataSource, "Dataset") &&
        shouldAutoLimitLargeDataset(query);

      if (!shouldCheckRowCount) {
        handlers.onSetDataSource(nextDataSource);
        return;
      }

      void buildDataSourceCommitOptions({
        dataSource: nextDataSource,
        query,
        workspaceId: workspace.id,
      })
        .then((commitOptions) => {
          if (applyRequestIdRef.current !== requestId) {
            return;
          }
          handlers.onSetDataSource(nextDataSource, commitOptions);
          if (commitOptions?.limit !== undefined) {
            showLargeDatasetLimitHint();
          }
        })
        .catch(() => {
          if (applyRequestIdRef.current !== requestId) {
            return;
          }
          // Row count is best-effort; commit the source without auto-limit.
          handlers.onSetDataSource(nextDataSource);
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
