import { getAxisRoles } from "$/models/vizs/getAxisRoles/getAxisRoles";
import { useMemo } from "react";
import { applyChartStyle } from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import { useAxisValueExtent } from "@/lib/ui/viz/axis/useAxisValueExtent";
import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber/formatChartNumber";
import type { ChartStyleProps } from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import type { UnknownDataFrame } from "@avandar/utils";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types";
import type { BubbleSeries } from "$/models/vizs/SeriesConfig";

/** Returns the resolved axis style props for a bubble chart. */
export function useBubbleChartStyleProps({
  data,
  series,
  seriesData,
  chartStyle,
}: Readonly<{
  data: Readonly<UnknownDataFrame>;
  series: readonly BubbleSeries[];
  seriesData: ReadonlyArray<
    Readonly<{ points: ReadonlyArray<Readonly<{ x: number }>> }>
  >;
  chartStyle: Readonly<ChartStyle> | undefined;
}>): ChartStyleProps {
  const xExtent = useAxisValueExtent({
    data,
    axisStyle: chartStyle?.xAxis,
    series,
    seriesKey: "xKey",
  });
  const yExtent = useAxisValueExtent({
    data,
    axisStyle: chartStyle?.yAxis,
    series,
    seriesKey: "key",
  });
  const xTickLabels = useMemo(() => {
    return chartStyle?.xAxis?.tickAngle === undefined ?
        undefined
      : seriesData.flatMap((entry) => {
          return entry.points.map((point) => {
            return formatChartNumber(point.x, { compact: true });
          });
        });
  }, [seriesData, chartStyle?.xAxis?.tickAngle]);

  return useMemo(() => {
    return applyChartStyle({
      style: chartStyle,
      xExtent,
      yExtent,
      xTickLabels,
      axisRoles: getAxisRoles("bubble"),
    });
  }, [chartStyle, xExtent, yExtent, xTickLabels]);
}
