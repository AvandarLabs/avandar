import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { EXPLORER_DISTRICT_COUNTS } from "../../Explorer.constants";
import {
  chartColumns,
  chartConfig,
} from "../../shims/import-dashboard/DashboardFixtureContext";
import css from "./SourceChart.module.css";
import { SourceChartMenu } from "./SourceChartMenu/SourceChartMenu";
import type { ReactNode } from "react";

type Props = { frame: number };

/**
 * The Data Explorer chart leaf this film saves to a dashboard, with its real
 * Save menu.
 */
export function SourceChart({ frame }: Readonly<Props>): ReactNode {
  return (
    <div className={css.sourceChartRoot}>
      <SourceChartMenu frame={frame} />
      <div className={css.sourceChartBody}>
        <VisualizationContainer
          columns={chartColumns}
          data={EXPLORER_DISTRICT_COUNTS}
          dateColumns={new Set()}
          vizConfig={chartConfig}
        />
      </div>
    </div>
  );
}
