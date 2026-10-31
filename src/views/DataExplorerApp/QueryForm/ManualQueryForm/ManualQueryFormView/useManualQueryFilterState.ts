import { useLingui } from "@lingui/react/macro";
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeQueryFilters } from "$/models/queries/StructuredQuery/normalizeQueryFilters/normalizeQueryFilters";
import { notifyWarning } from "@/utils/notifications/notify";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ManualQueryFormHandlers } from "../ManualQueryForm";
import type { SourceColumnCatalog } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";

type Options = {
  filters: StructuredQuery.FilterGroup;
  sourceCatalog: SourceColumnCatalog;
  isStructuredQueryInSync: boolean;
  onSetFilters: ManualQueryFormHandlers["onSetFilters"];
};
type PruningOptions = Options & {
  normalized: ReturnType<typeof normalizeQueryFilters> | undefined;
};
type FilterState = {
  columnIdFilters: StructuredQuery.FilterGroup;
  pendingFilters: StructuredQuery.FilterGroup | undefined;
  onFiltersChange: (filters: StructuredQuery.FilterGroup) => void;
  onOverwrite: () => void;
  onDismiss: () => void;
};

function useFilterPruning({
  filters,
  sourceCatalog,
  isStructuredQueryInSync,
  onSetFilters,
  normalized,
}: Readonly<PruningOptions>): void {
  const { t } = useLingui();
  // Track fresh host handlers without retriggering pruning.
  const onSetFiltersRef = useRef(onSetFilters);
  useEffect(function trackLatestSetFilters() {
    onSetFiltersRef.current = onSetFilters;
  });
  const prunedColumnsRef = useRef<string | undefined>(undefined);
  const columns = sourceCatalog.columns;
  useEffect(
    function pruneFiltersWhenColumnsChange() {
      // Metadata updates must preserve unsupported hand-written SQL.
      const result = isStructuredQueryInSync ? normalized : undefined;
      const issueKey = JSON.stringify(result?.issues ?? []);
      if (result && JSON.stringify(result.filter) !== JSON.stringify(filters)) {
        onSetFiltersRef.current({
          filters: result.filter,
          sourceColumns: columns,
        });
      }
      if (
        result !== undefined &&
        issueKey !== "[]" &&
        issueKey !== prunedColumnsRef.current
      ) {
        prunedColumnsRef.current = issueKey;
        notifyWarning({
          title: t`Some filters were removed`,
          message: t`They referenced columns this data source does not have.`,
        });
      }
    },
    [normalized, columns, filters, isStructuredQueryInSync, t],
  );
}

/** Reconciles source filters and confirms edits that overwrite manual SQL. */
export function useManualQueryFilterState(
  options: Readonly<Options>,
): FilterState {
  const { filters, sourceCatalog, isStructuredQueryInSync, onSetFilters } =
    options;
  const [pendingFilters, setPendingFilters] = useState<
    StructuredQuery.FilterGroup | undefined
  >(undefined);
  const columns = sourceCatalog.columns;
  const normalized = useMemo(() => {
    return sourceCatalog.status === "ready"
      ? normalizeQueryFilters({ filter: filters, columns, clause: "where" })
      : undefined;
  }, [filters, columns, sourceCatalog.status]);
  useFilterPruning({ ...options, normalized });
  return {
    columnIdFilters: normalized?.filter ?? filters,
    pendingFilters,
    onFiltersChange: (changedFilters) => {
      if (isStructuredQueryInSync) {
        onSetFilters({ filters: changedFilters });
      } else {
        setPendingFilters(changedFilters);
      }
    },
    onOverwrite: () => {
      if (pendingFilters) {
        onSetFilters({ filters: pendingFilters });
      }
      setPendingFilters(undefined);
    },
    onDismiss: () => {
      return setPendingFilters(undefined);
    },
  };
}
