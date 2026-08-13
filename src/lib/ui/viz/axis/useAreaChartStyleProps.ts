import { getAxisRoles } from "$/models/vizs/getAxisRoles/getAxisRoles";
import { useMemo } from "react";
import { applyChartStyle } from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import { computeValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import { getAreaStacking } from "@/lib/ui/viz/axis/getAreaStacking/getAreaStacking";
import { needsValueExtent } from "@/lib/ui/viz/axis/needsValueExtent/needsValueExtent";
import { toExtentSeries } from "@/lib/ui/viz/axis/toExtentSeries/toExtentSeries";
import { useXTickLabels } from "@/lib/ui/viz/axis/useXTickLabels";
import type {
  ApplyChartStyleOptions,
  ChartStyleProps,
} from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import type { ValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import type { AreaLayout } from "@/lib/ui/viz/axis/getAreaStacking/getAreaStacking";
import type { UnknownDataFrame } from "@avandar/utils";
import type { AxisStyle, ChartStyle } from "$/models/vizs/ChartStyle.types";
import type { XYSeries } from "$/models/vizs/SeriesConfig";

function _computeAreaValueExtent({
  data,
  series,
  axisStyle,
  layout,
  allAreas,
}: Readonly<{
  data: Readonly<UnknownDataFrame>;
  series: readonly XYSeries[];
  axisStyle: Readonly<AxisStyle> | undefined;
  layout: AreaLayout;
  allAreas: boolean;
}>): ValueExtent | undefined {
  if (!needsValueExtent(axisStyle)) {
    return undefined;
  }
  const { isPercent, sharedStackId } = getAreaStacking(layout);
  if (allAreas && isPercent) {
    return { min: 0, max: 1 };
  }
  return computeValueExtent({
    data,
    series: toExtentSeries({
      series: series.map((seriesConfig) => {
        return { key: seriesConfig.key };
      }),
      sharedStackId: allAreas ? sharedStackId : undefined,
    }),
  });
}

/** Returns the resolved axis style props for an area chart. */
export function useAreaChartStyleProps({
  data,
  series,
  chartStyle,
  xAxisKey,
  tickFormatter,
  baseXAxisProps,
  layout,
  allAreas,
}: Readonly<{
  data: Readonly<UnknownDataFrame>;
  series: readonly XYSeries[];
  chartStyle: Readonly<ChartStyle> | undefined;
  xAxisKey: string;
  tickFormatter: ((value: unknown) => string) | undefined;
  baseXAxisProps: ApplyChartStyleOptions["baseXAxisProps"];
  layout: AreaLayout;
  allAreas: boolean;
}>): ChartStyleProps {
  const yExtent = useMemo(() => {
    return _computeAreaValueExtent({
      data,
      series,
      axisStyle: chartStyle?.yAxis,
      layout,
      allAreas,
    });
  }, [data, series, layout, allAreas, chartStyle?.yAxis]);
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
      axisRoles: getAxisRoles("area"),
    });
  }, [chartStyle, baseXAxisProps, yExtent, xTickLabels]);
}
