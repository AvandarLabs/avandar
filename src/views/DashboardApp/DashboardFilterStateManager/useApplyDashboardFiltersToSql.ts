import { useMemo } from "react";
import {
  type DataVizFilterProps,
  type LocalFilter,
  type LocalFilterStateApi,
  localFilterToRecord,
  resolveSubscribedFilterIds,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/useLocalFilterState";
import { applyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/applyDashboardFiltersToSql";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

/**
 * Returns `rawSql` amended with the viewer-selected dashboard filters that
 * this viz subscribes to, plus any local viz-only filters layered on top.
 *
 * Resolution order (applied as nested subselects, so SQL inside an inner
 * WHERE / GROUP BY composes correctly):
 *
 *   1. Global filters in the dashboard's filter state manager — filtered by
 *      `globalFilterSubscriptionMode`:
 *        - `"all"` (default): every active filter applies.
 *        - `"none"`: skip global filters entirely.
 *        - `"selected"`: only the listed `subscribedFilterIds` apply.
 *   2. Local filters owned by this viz. Each local filter is converted into
 *      the same `DashboardFilterRecord` shape used by global filters so the
 *      WHERE-clause logic stays in one place.
 *
 * Safe to call from inside a Puck `<Render>` tree because
 * `DashboardFilterStateManager.Provider` wraps both the editor and viewer.
 *
 * `filterProps` and `localFilterState` are both optional; passing neither
 * preserves the original "subscribe to all global filters, no local
 * filters" behaviour for callers that haven't been migrated yet.
 */
export function useApplyDashboardFiltersToSql(
  rawSql: string,
  options?: {
    filterProps?: DataVizFilterProps;
    localFilters?: readonly LocalFilter[];
    localFilterState?: LocalFilterStateApi;
  },
): string {
  const { filtersById } = DashboardFilterStateManager.useState();
  return useMemo(() => {
    const globalFilters = Object.values(filtersById);
    const subscribedIds =
      options?.filterProps ?
        resolveSubscribedFilterIds(
          options.filterProps.globalFilterSubscription,
          globalFilters,
        )
      : undefined;

    const afterGlobal = applyDashboardFiltersToSql({
      sql: rawSql,
      filters: globalFilters,
      ...(subscribedIds !== undefined ?
        { subscribedFilterIds: subscribedIds }
      : {}),
    });

    const localFilters = options?.localFilters ?? [];
    if (localFilters.length === 0 || !options?.localFilterState) {
      return afterGlobal;
    }

    const localRecords = localFilters.map((f) => {
      return localFilterToRecord(f, options.localFilterState!.valuesById[f.id]);
    });

    return applyDashboardFiltersToSql({
      sql: afterGlobal,
      filters: localRecords,
    });
  }, [
    rawSql,
    filtersById,
    options?.filterProps,
    options?.localFilters,
    options?.localFilterState,
  ]);
}
