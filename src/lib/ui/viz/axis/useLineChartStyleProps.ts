import type { ChartStyle } from "$/models/vizs/ChartStyle.types";
import type { XYSeries } from "$/models/vizs/SeriesConfig";
import type {
  ApplyChartStyleOptions,
  ChartStyleProps,
} from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import type { UnknownDataFrame } from "@avandar/utils";

import { useMemo } from "react";

import { getAxisRolesFromVizType } from "$/models/vizs/getAxisRolesFromVizType/getAxisRolesFromVizType";
import { applyChartStyle } from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import { useAxisValueExtent } from "@/lib/ui/viz/axis/useAxisValueExtent";
import { useXTickLabels } from "@/lib/ui/viz/axis/useXTickLabels";

/** Returns the resolved axis style props for a line chart. */
export function useLineChartStyleProps({
  data,
  series,
  chartStyle,
  xAxisKey,
  tickFormatter,
  baseXAxisProps,
}: Readonly<{
  data: Readonly<UnknownDataFrame>;
  series: readonly XYSeries[];
  chartStyle: Readonly<ChartStyle> | undefined;
  xAxisKey: string;
  tickFormatter: ((value: unknown) => string) | undefined;
  baseXAxisProps: ApplyChartStyleOptions["baseXAxisProps"];
}>): ChartStyleProps {
  const yExtent = useAxisValueExtent({
    data,
    axisStyle: chartStyle?.yAxis,
    series,
    seriesKey: "key",
  });
  const xTickLabels = useXTickLabels({
    data,
    xAxisKey,
    tickAngle: chartStyle?.xAxis?.tickAngle,
    tickFormatter,
  });

  return useMemo(() => {
    return applyChartStyle({
      style: chartStyle,
      baseXAxisProps,
      yExtent,
      xTickLabels,
      axisRoles: getAxisRolesFromVizType("line"),
    });
  }, [chartStyle, baseXAxisProps, yExtent, xTickLabels]);
}
