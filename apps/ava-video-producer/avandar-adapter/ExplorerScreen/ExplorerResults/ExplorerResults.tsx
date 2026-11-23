import { Box } from "@mantine/core";
import { BarChart } from "@/lib/ui/viz/BarChart/BarChart";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { DUR, Motion } from "../../../src/motion";
import {
  EXPLORER_DISTRICT_COUNTS,
  EXPLORER_DISPLAY_COLUMNS,
} from "../../Explorer.constants";
import { barConfig } from "../ExplorerTimeline";
import css from "./ExplorerResults.module.css";
import type { useExplorerFrame } from "../useExplorerFrame";
import type { ReactNode } from "react";

type Props = Pick<ReturnType<typeof useExplorerFrame>, "stage" | "rows">;
/** Show table or chart results while keeping the native grid configuration. */
export function ExplorerResults({ stage, rows }: Readonly<Props>): ReactNode {
  return (
    <div
      className={css.explorerResultsCanvas}
      data-video-target="explorer-results"
    >
      {stage.isChart ? (
        <Box
          h="100%"
          w="100%"
          style={Motion.enter({
            frame: stage.time,
            at: 650,
            opts: { y: 8, dur: DUR.hero },
          })}
        >
          <BarChart
            data={EXPLORER_DISTRICT_COUNTS}
            xAxisKey="district_name"
            series={barConfig.series}
            height="100%"
            withLegend
            layout="group"
          />
        </Box>
      ) : (
        <DataGrid
          columnNames={
            stage.isAggregate
              ? ["district_name", "recorded_cases"]
              : EXPLORER_DISPLAY_COLUMNS
          }
          data={rows}
          height="100%"
          onGridReady={(event) => {
            event.api.setGridOption("animateRows", false);
          }}
        />
      )}
    </div>
  );
}
