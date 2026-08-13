import { getAxisRoles } from "$/models/vizs/getAxisRoles/getAxisRoles";
import { useMemo } from "react";
import { applyChartStyle } from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import { computeValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import { needsValueExtent } from "@/lib/ui/viz/axis/needsValueExtent/needsValueExtent";
import { toExtentSeries } from "@/lib/ui/viz/axis/toExtentSeries/toExtentSeries";
import { useXTickLabels } from "@/lib/ui/viz/axis/useXTickLabels";
import type {
  ApplyChartStyleOptions,
  ChartStyleProps,
} from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import type { ValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import type { UnknownDataFrame } from "@avandar/utils";
import type { AxisStyle, ChartStyle } from "$/models/vizs/ChartStyle.types";
import type { XYSeries } from "$/models/vizs/SeriesConfig";

function _computeBarValueExtent({
  data,
  series,
  axisStyle,
  layout,
  allBars,
}: Readonly<{
  data: Readonly<UnknownDataFrame>;
  series: readonly XYSeries[];
  axisStyle: Readonly<AxisStyle> | undefined;
  layout: "group" | "stack" | "percent";
  allBars: boolean;
}>): ValueExtent | undefined {
  if (!needsValueExtent(axisStyle)) {
    return undefined;
  }
  if (allBars && layout === "percent") {
    return { min: 0, max: 1 };
  }
  return computeValueExtent({
    data,
    series: toExtentSeries({
      series: series.map((seriesConfig) => {
        return {
          key: seriesConfig.key,
          stackId: "stackId" in seriesConfig ? seriesConfig.stackId : undefined,
        };
      }),
      sharedStackId: allBars && layout === "stack" ? "stack" : undefined,
    }),
  });
}

/** Returns the resolved axis style props for a bar chart. */
export function useBarChartStyleProps({
  data,
  series,
  chartStyle,
  xAxisKey,
  tickFormatter,
  baseXAxisProps,
  layout,
  allBars,
}: Readonly<{
  data: Readonly<UnknownDataFrame>;
  series: readonly XYSeries[];
  chartStyle: Readonly<ChartStyle> | undefined;
  xAxisKey: string;
  tickFormatter: ((value: unknown) => string) | undefined;
  baseXAxisProps: ApplyChartStyleOptions["baseXAxisProps"];
  layout: "group" | "stack" | "percent";
  allBars: boolean;
}>): ChartStyleProps {
  const yExtent = useMemo(() => {
    return _computeBarValueExtent({
      data,
      series,
      axisStyle: chartStyle?.yAxis,
      layout,
      allBars,
    });
  }, [data, series, layout, allBars, chartStyle?.yAxis]);
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
      axisRoles: getAxisRoles("bar"),
    });
  }, [chartStyle, baseXAxisProps, yExtent, xTickLabels]);
}
