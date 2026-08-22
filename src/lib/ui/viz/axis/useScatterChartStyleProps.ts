import type { ChartStyle } from "$/models/vizs/ChartStyle.types";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig";
import type { ChartStyleProps } from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import type { UnknownDataFrame } from "@avandar/utils";
import type { ScatterChartSeries } from "@mantine/charts";

import { useMemo } from "react";

import { getAxisRolesFromVizType } from "$/models/vizs/getAxisRolesFromVizType/getAxisRolesFromVizType";
import { applyChartStyle } from "@/lib/ui/viz/applyChartStyle/applyChartStyle";
import { useAxisValueExtent } from "@/lib/ui/viz/axis/useAxisValueExtent";
import { formatChartNumber } from "@/lib/ui/viz/formatChartNumber/formatChartNumber";

/** Returns the resolved axis style props for a scatter chart. */
export function useScatterChartStyleProps({
  data,
  series,
  scatterSeries,
  chartStyle,
}: Readonly<{
  data: Readonly<UnknownDataFrame>;
  series: readonly ScatterSeries[];
  scatterSeries: readonly ScatterChartSeries[];
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
    return chartStyle?.xAxis?.tickAngle === undefined
      ? undefined
      : scatterSeries.flatMap((scatterSeriesEntry) => {
          return scatterSeriesEntry.data.map((point) => {
            return formatChartNumber(point.x);
          });
        });
  }, [scatterSeries, chartStyle?.xAxis?.tickAngle]);

  return useMemo(() => {
    return applyChartStyle({
      style: chartStyle,
      xExtent,
      yExtent,
      xTickLabels,
      axisRoles: getAxisRolesFromVizType("scatter"),
    });
  }, [chartStyle, xExtent, yExtent, xTickLabels]);
}
