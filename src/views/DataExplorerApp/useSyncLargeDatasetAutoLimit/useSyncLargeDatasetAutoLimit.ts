import { Model } from "@models";
import { useEffect, useRef } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import {
  largeDatasetAutoLimitFromRowCount,
  shouldAutoLimitLargeDataset,
} from "@/views/DataExplorerApp/manualQueryLimit/manualQueryLimit";
import { fetchDatasetRowCount } from "@/views/DataExplorerApp/resolveManualQueryForExecution/resolveManualQueryForExecution";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";

type Options = {
  query: PartialStructuredQuery;
  /**
   * When a `rawSql` string is present (set by direct SQL edits or
   * LLM-generated SQL) the auto-limit is suppressed — those SQL strings are
   * sacrosanct and must run verbatim.
   */
  rawSql: string | undefined;
  onApplyAutoLimit: (limit: number) => void;
};

/**
 * When the manual query can return unbounded rows from a large dataset,
 * resolves row count (cached) and writes the auto LIMIT into structured-query
 * state so the
 * form and executed SQL stay aligned.
 */
export function useSyncLargeDatasetAutoLimit(opts: Options): void {
  const { query, rawSql, onApplyAutoLimit } = opts;
  const workspace = useCurrentWorkspace();
  const syncRequestIdRef = useRef(0);
  const onApplyAutoLimitRef = useRef(onApplyAutoLimit);
  onApplyAutoLimitRef.current = onApplyAutoLimit;
  const queryRef = useRef(query);
  queryRef.current = query;
  const rawSqlRef = useRef(rawSql);
  rawSqlRef.current = rawSql;

  const dataSource = query.dataSource;
  const datasetId =
    dataSource !== undefined && Model.isOfModelType(dataSource, "Dataset") ?
      dataSource.id
    : undefined;

  useEffect(
    function syncLargeDatasetAutoLimit() {
      if (
        rawSql !== undefined ||
        datasetId === undefined ||
        !shouldAutoLimitLargeDataset(query)
      ) {
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
          if (rawSqlRef.current !== undefined) {
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
      // Only the listed fields influence `shouldAutoLimitLargeDataset`; the
      // async callback reads the latest query via `queryRef.current`, so adding
      // `query` here would re-fire on every render without changing behavior.
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      datasetId,
      query.aggregations,
      query.filters,
      query.having,
      query.limit,
      rawSql,
      workspace.id,
    ],
  );
}
