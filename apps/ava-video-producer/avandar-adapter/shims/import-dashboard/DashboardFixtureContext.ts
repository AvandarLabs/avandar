import { createContext } from "react";
import { EXPLORER_AGGREGATE_SQL } from "../../Explorer.constants";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";

/**
 * Hands the current frame, and the frame the saved chart starts revealing
 * on, from `DashboardScreen` down to `FixtureDataViz`. The chart renders
 * inside the dashboard's memoized block config, so this context is how each
 * frame reaches it without a product data client.
 */
export const DashboardFixtureContext = createContext({
  frame: 0,
  chartAt: -100,
});

/**
 * The fixture dashboard's name. `CreateModal` types it into the new
 * dashboard form, and `DashboardScreen` gives it to the dashboard record,
 * its page title, and its block config.
 */
export const DASHBOARD_NAME = "Video - Harborfield response overview - pilot";

/** The same aggregate SQL the Explorer screen saved this chart from. */
export const DASHBOARD_SQL = EXPLORER_AGGREGATE_SQL;

/** Column metadata for the saved chart, matching `EXPLORER_DISTRICT_COUNTS`. */
export const chartColumns: QueryResult.ColumnWithId[] = [
  {
    id: "film-district" as QueryColumn.Id,
    name: "district_name",
    dataType: "varchar",
  },
  {
    id: "film-cases" as QueryColumn.Id,
    name: "recorded_cases",
    dataType: "bigint",
  },
];

/** The saved chart's bar visualization config. */
export const chartConfig: AvaVizConfig.T = {
  vizType: "bar",
  xAxisKey: "film-district" as QueryColumn.Id,
  layout: "group",
  withLegend: true,
  series: [
    {
      key: "film-cases" as QueryColumn.Id,
      label: "Recorded cases",
      color: "primary.6",
      renderAs: "bar",
    },
  ],
};
