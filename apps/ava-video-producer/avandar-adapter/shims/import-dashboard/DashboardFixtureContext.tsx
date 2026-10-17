import { createContext, useContext } from "react";
import { DataVizContent } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizContent";
import { ramp } from "../../../src/motion";
import {
  EXPLORER_AGGREGATE_SQL,
  EXPLORER_DISTRICT_COUNTS,
} from "../../Explorer.constants";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { DataVizFilterProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";

/**
 * Frame and chart-reveal-start carried down to `FixtureDataViz` without a
 * product data client.
 */
export const DashboardFixtureContext = createContext({
  frame: 0,
  chartAt: -100,
});

/**
 * The fixture dashboard's display name, reused for its saved chart and
 * preview banner.
 */
export const DASHBOARD_NAME = "Video - Harborfield response overview - pilot";

/** The same aggregate SQL the Explorer screen saved this chart from. */
export const DASHBOARD_SQL = EXPLORER_AGGREGATE_SQL;

/** Column metadata for the saved chart, matching `EXPLORER_DISTRICT_COUNTS`. */
export const chartColumns: QueryResult.BoundColumn[] = [
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
export const chartConfig: VizConfig.T = {
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

/**
 * The saved chart with no subscribed filters, since this film never changes
 * them.
 */
const chartFilterProps: DataVizFilterProps = {
  localFilters: [],
  globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
};

/**
 * The dashboard's saved chart, revealed bar-by-bar as `chartAt` advances
 * across frames.
 */
export function FixtureDataViz() {
  const { frame, chartAt } = useContext(DashboardFixtureContext);
  // The complete, exact fixture totals stay in the chart. Frame-driven clipping
  // reveals bar geometry without changing the data or Recharts' axis domain.
  const barRules = EXPLORER_DISTRICT_COUNTS.map(
    (_, index) =>
      `.film-dashboard-viz .recharts-bar-rectangle:nth-child(${index + 1}) { clip-path: inset(${(1 - ramp(frame, chartAt + index * 3, 22)) * 100}% 0 0 0); }`,
  ).join("\n");
  return (
    <div className="film-dashboard-viz">
      <style>{barRules}</style>
      <DataVizContent
        prompt="Saved from Data Explorer"
        rawSql={DASHBOARD_SQL}
        isLoading={false}
        columns={chartColumns}
        data={EXPLORER_DISTRICT_COUNTS}
        dateColumns={new Set()}
        displayVizConfig={chartConfig}
        filterProps={chartFilterProps}
        localFilterState={{
          valuesById: {},
          setValue: () => {},
          reset: () => {},
        }}
        queryErrorMessage={undefined}
      />
    </div>
  );
}
