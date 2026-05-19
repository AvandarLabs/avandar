import { useMemo } from "react";
import { applyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/applyDashboardFiltersToSql";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

/**
 * Returns the rawSQL amended with any active viewer-selected filters. When
 * no filters are registered or none have a value, the original SQL is
 * returned untouched. Safe to call from inside a Puck `<Render>` tree
 * because `DashboardFilterStateManager.Provider` wraps both the editor and
 * the viewer.
 */
export function useApplyDashboardFiltersToSql(rawSql: string): string {
  const { filtersById } = DashboardFilterStateManager.useState();
  return useMemo(() => {
    const filters = Object.values(filtersById);
    if (filters.length === 0) {
      return rawSql;
    }
    return applyDashboardFiltersToSql({
      sql: rawSql,
      filters,
    });
  }, [rawSql, filtersById]);
}
