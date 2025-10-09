import { ScatterChart as MantineScatterChart } from "@mantine/charts";
import { useMemo } from "react";
import { XYChartProps } from "./ChartTypes";
import type { ScatterChartSeries } from "@mantine/charts";

export function ScatterChart({
  data: rawData,
  xAxisKey,
  yAxisKey,
  height = 500,
}: XYChartProps): JSX.Element {
  // data needs special formatting and typing coercion for scatter chart
  const scatterSeries: ScatterChartSeries[] = useMemo(() => {
    const points = rawData
      .map((row) => {
        const rowObject = row as Record<string, unknown>;
        const xValue = Number(rowObject[xAxisKey]);
        const yValue = Number(rowObject[yAxisKey]);
        return { x: xValue, y: yValue };
      })
      .filter((point) => {
        return Number.isFinite(point.x) && Number.isFinite(point.y);
      });

    return [
      {
        name: `${yAxisKey} vs ${xAxisKey}`,
        color: "blue",
        data: points,
      },
    ];
  }, [rawData, xAxisKey, yAxisKey]);

  return (
    <MantineScatterChart
      h={height}
      data={scatterSeries}
      dataKey={{ x: "x", y: "y" }}
      xAxisLabel={`${xAxisKey}`}
      yAxisLabel={`${yAxisKey}`}
      withLegend
    />
  );
}
