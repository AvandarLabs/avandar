import { applyDashboardFiltersToSql } from "./applyDashboardFiltersToSql/applyDashboardFiltersToSql";
import { makeLocalFilterColumnBindingsFromLocalFilters } from "./makeLocalFilterColumnBindingsFromLocalFilters/makeLocalFilterColumnBindingsFromLocalFilters";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { DashboardFilterRecord } from "./DashboardFilterStateManager";
import type { LocalFilter } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type { LocalFilterStateApi } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/useLocalFilterState";

type UseApplyDashboardFiltersToSqlOptions = {
  rawSql: string;
  columns: readonly QueryResult.ColumnWithId[] | undefined;
  globalFilters: readonly DashboardFilterRecord[];
  localFilters: readonly LocalFilter[];
  localFilterState: LocalFilterStateApi;
};

/**
 * Returns a chart's SQL wrapped with its bound dashboard filters and its local
 * filters, each local filter applied by the current `QueryResult` column name
 * of its column ID. Undefined until the chart's columns are known, so no
 * filtered query runs before the filters can bind. Use it to get the SQL a
 * chart runs, for example to fetch a dashboard chart's rows.
 */
export function useApplyDashboardFiltersToSql(
  options: Readonly<UseApplyDashboardFiltersToSqlOptions>,
): string | undefined {
  if (!options.columns) {
    return undefined;
  }
  const globalSql = applyDashboardFiltersToSql({
    sql: options.rawSql,
    filters: options.globalFilters,
  });
  const local = makeLocalFilterColumnBindingsFromLocalFilters({
    filters: options.localFilters,
    columns: options.columns,
    valuesById: options.localFilterState.valuesById,
  });
  return local.resolvedFilters.length
    ? applyDashboardFiltersToSql({
        sql: globalSql,
        filters: local.resolvedFilters,
      })
    : globalSql;
}
