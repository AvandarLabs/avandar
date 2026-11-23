import { useContext } from "react";
import { DataVizContent } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizContent";
import { Motion } from "../../../src/motion";
import { EXPLORER_DISTRICT_COUNTS } from "../../Explorer.constants";
import {
  chartColumns,
  chartConfig,
  DashboardFixtureContext,
  DASHBOARD_SQL,
} from "./DashboardFixtureContext";
import type { DataVizFilterProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type { ReactNode } from "react";
/**
 * The filter props `FixtureDataViz` gives the saved chart: no local filters
 * and no subscribed dashboard filters, since this film never changes them.
 */
const chartFilterProps: DataVizFilterProps = {
  localFilters: [],
  globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
};
/**
 * Draws the film dashboard's saved chart through the product's
 * `DataVizContent` with fixture rows, revealing one bar at a time once the
 * frame passes `chartAt`. It is the data viz block's `render` in
 * `useDataVizPBlockConfig`, so it reads the frame from
 * `DashboardFixtureContext`.
 */
export function FixtureDataViz(): ReactNode {
  const { frame, chartAt } = useContext(DashboardFixtureContext);
  // The complete, exact fixture totals stay in the chart. Frame-driven clipping
  // reveals bar geometry without changing the data or Recharts' axis domain.
  const barRules = EXPLORER_DISTRICT_COUNTS.map((_, index) => {
    return `.film-dashboard-viz .recharts-bar-rectangle:nth-child(${index + 1}) { clip-path: inset(${
      (1 -
        Motion.ramp({
          frame,
          at: chartAt + index * 3,
          dur: 22,
        })) *
      100
    }% 0 0 0); }`;
  }).join("\n");
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
