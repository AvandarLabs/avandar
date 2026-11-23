import { useMemo } from "react";
import { chartConfig, DASHBOARD_SQL } from "./DashboardFixtureContext";
import { FixtureDataViz } from "./FixtureDataViz";

type DataVizPBlockConfig = {
  label: string;
  fields: Record<never, never>;
  defaultProps: {
    nlQuery: { prompt: string; rawSql: string; generations: never[] };
    vizType: string;
    vizConfig: typeof chartConfig;
    globalFilterSubscription: { mode: string };
    localFilters: never[];
  };
  render: typeof FixtureDataViz;
};

/** Replaces client/query and interactive editor-field controllers only.
 * The block itself remains the unchanged product DataVizContent component.
 * No DataViz properties are selected or edited in this film.
 */
export function useDataVizPBlockConfig(): DataVizPBlockConfig {
  return useMemo(() => {
    return {
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
    };
  }, []);
}
