import { isDefined } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeQueryFilters } from "$/models/queries/StructuredQuery/normalizeQueryFilters/normalizeQueryFilters";
import { notifyWarning } from "@/utils/notifications/notify";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ManualQueryFormHandlers } from "../ManualQueryForm";
import type { SourceColumnCatalog } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";

type UseManualQueryFilterStateOptions = {
  filters: StructuredQuery.FilterGroup;
  sourceCatalog: SourceColumnCatalog;
  isStructuredQueryInSync: boolean;
  onSetFilters: ManualQueryFormHandlers["onSetFilters"];
};
type PruningOptions = UseManualQueryFilterStateOptions & {
  normalized: ReturnType<typeof normalizeQueryFilters> | undefined;
};
type FilterState = {
  columnIdFilters: StructuredQuery.FilterGroup;
  pendingFilters: StructuredQuery.FilterGroup | undefined;
  onFiltersChange: (filters: StructuredQuery.FilterGroup) => void;
  onOverwrite: () => void;
  onDismiss: () => void;
};

type FilterIssues = ReturnType<typeof normalizeQueryFilters>["issues"];

/**
 * Returns a function that says why filters were removed: their column is
 * gone, or their field keeps every value and cannot be filtered on.
 */
function useRemovedFiltersMessage(): (issues: FilterIssues) => string {
  const { t } = useLingui();
  return useCallback(
    (issues) => {
      const hasMissingColumn = issues.some((issue) => {
        return issue.reason !== "unsupported";
      });
      const hasListField = issues.some((issue) => {
        return issue.reason === "unsupported";
      });
      return [
        hasMissingColumn
          ? t`They referenced columns this data source does not have.`
          : undefined,
        hasListField
          ? t`Fields that keep every value cannot be filtered on.`
          : undefined,
      ]
        .filter(isDefined)
        .join(" ");
    },
    [t],
  );
}

function useFilterPruning({
  filters,
  sourceCatalog,
  isStructuredQueryInSync,
  onSetFilters,
  normalized,
}: Readonly<PruningOptions>): void {
  const { t } = useLingui();
  const buildRemovedFiltersMessage = useRemovedFiltersMessage();
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
          message: buildRemovedFiltersMessage(result.issues),
        });
      }
    },
    [
      normalized,
      columns,
      filters,
      isStructuredQueryInSync,
      t,
      buildRemovedFiltersMessage,
    ],
  );
}

/**
 * Holds the manual query form's filter state. Once the source's columns are
 * ready, it binds filters to their column IDs and, while the form matches
 * the SQL, drops filters on columns the source does not have and warns the
 * user. While the form does not match hand-written SQL, an edit waits in
 * `pendingFilters` until the user confirms the overwrite.
 * Used only by `ManualQueryFormView`.
 */
export function useManualQueryFilterState(
  options: Readonly<UseManualQueryFilterStateOptions>,
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
