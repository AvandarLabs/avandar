import { ScatterChart as MantineScatterChart } from "@mantine/charts";
import { useMemo } from "react";
import { useVizDataLimit } from "@/lib/ui/viz/useVizDataLimit";
import type { XYChartProps } from "@/lib/ui/viz/ChartTypes";
import type { ScatterChartSeries } from "@mantine/charts";

export function ScatterChart({
  data: rawData,
  xAxisKey,
  yAxisKey,
  height = 500,
}: XYChartProps): JSX.Element {
  const limitedData = useVizDataLimit("scatter", rawData);
  // data needs special formatting and typing coercion for scatter chart
  const scatterSeries: ScatterChartSeries[] = useMemo(() => {
    const points = limitedData
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
  }, [limitedData, xAxisKey, yAxisKey]);

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
