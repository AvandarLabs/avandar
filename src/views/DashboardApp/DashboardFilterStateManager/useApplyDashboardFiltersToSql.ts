import { objectValues } from "@avandar/utils";
import { useMemo } from "react";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import { applyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/applyDashboardFiltersToSql/applyDashboardFiltersToSql";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type {
  DataVizFilterProps,
  LocalFilter,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type { LocalFilterStateApi } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/useLocalFilterState";
import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

type Options = {
  rawSql: string;
  filterProps?: DataVizFilterProps;
  localFilters?: readonly LocalFilter[];
  localFilterState?: LocalFilterStateApi;
};

function _buildLocalFilterRecords(
  options: Readonly<Options>,
): DashboardFilterRecord[] {
  if (!options.localFilterState) {
    return [];
  }
  return (options.localFilters ?? []).map((localFilter) => {
    return DataVizFilters.localFilterToRecord({
      filter: localFilter,
      value: options.localFilterState?.valuesById[localFilter.id],
    });
  });
}

/** Returns SQL amended with active global and visualization-local filters. */
export function useApplyDashboardFiltersToSql(
  options: Readonly<Options>,
): string {
  const { filtersById } = DashboardFilterStateManager.useState();
  return useMemo(() => {
    const globalFilters = objectValues(filtersById);
    const subscribedFilterIds =
      options.filterProps ?
        DataVizFilters.resolveSubscribedFilterIds({
          subscription: options.filterProps.globalFilterSubscription,
          registeredFilters: globalFilters,
        })
      : undefined;
    const globallyFilteredSql = applyDashboardFiltersToSql({
      sql: options.rawSql,
      filters: globalFilters,
      ...(subscribedFilterIds !== undefined ? { subscribedFilterIds } : {}),
    });
    const localFilterRecords = _buildLocalFilterRecords(options);
    return localFilterRecords.length > 0 ?
        applyDashboardFiltersToSql({
          sql: globallyFilteredSql,
          filters: localFilterRecords,
        })
      : globallyFilteredSql;
  }, [filtersById, options]);
}
