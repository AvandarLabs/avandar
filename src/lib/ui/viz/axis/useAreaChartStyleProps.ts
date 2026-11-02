import { useMemo } from "react";
import { getAxisRolesFromVizType } from "$/models/vizs/getAxisRolesFromVizType/getAxisRolesFromVizType";
import { applyChartStyle } from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import { applySharedStackId } from "@/lib/ui/viz/axis/applySharedStackId/applySharedStackId";
import { doesAxisNeedValueExtent } from "@/lib/ui/viz/axis/doesAxisNeedValueExtent/doesAxisNeedValueExtent";
import { getAreaStackingFromLayout } from "@/lib/ui/viz/axis/getAreaStackingFromLayout/getAreaStackingFromLayout";
import { getValueExtentFromSeries } from "@/lib/ui/viz/axis/getValueExtentFromSeries/getValueExtentFromSeries";
import { useXTickLabels } from "@/lib/ui/viz/axis/useXTickLabels";
import type { AxisStyle, ChartStyle } from "$/models/vizs/ChartStyle.types";
import type { XYSeries } from "$/models/vizs/SeriesConfig";
import type {
  ApplyChartStyleOptions,
  ChartStyleProps,
} from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import type { AreaLayout } from "@/lib/ui/viz/axis/getAreaStackingFromLayout/getAreaStackingFromLayout";
import type { ValueExtent } from "@/lib/ui/viz/axis/getValueExtentFromSeries/getValueExtentFromSeries";
import type { UnknownDataFrame } from "@avandar/utils";

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
  if (!doesAxisNeedValueExtent(axisStyle)) {
    return undefined;
  }
  const { isPercent, sharedStackId } = getAreaStackingFromLayout(layout);
  if (allAreas && isPercent) {
    return { min: 0, max: 1 };
  }
  return getValueExtentFromSeries({
    data,
    series: applySharedStackId({
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
      axisRoles: getAxisRolesFromVizType("area"),
    });
  }, [chartStyle, baseXAxisProps, yExtent, xTickLabels]);
}
