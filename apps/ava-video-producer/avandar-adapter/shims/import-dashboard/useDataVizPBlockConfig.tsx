import { useMemo } from "react";
import {
  FixtureDataViz,
  chartConfig,
  DASHBOARD_SQL,
} from "./DashboardFixtureContext";

/** Replaces client/query and interactive editor-field controllers only.
 * The block itself remains the unchanged product DataVizContent component.
 * No DataViz properties are selected or edited in this film.
 */
export function useDataVizPBlockConfig() {
  return useMemo(
    () => ({
      label: "Data Visualization",
      fields: {},
      defaultProps: {
        nlQuery: {
          prompt: "Saved from Data Explorer",
          rawSql: DASHBOARD_SQL,
          generations: [],
        },
        vizType: "bar",
        vizConfig: chartConfig,
        globalFilterSubscription: { mode: "all" },
        localFilters: [],
      },
      render: FixtureDataViz,
    }),
    [],
  );
}
