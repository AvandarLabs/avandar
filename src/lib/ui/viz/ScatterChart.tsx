import { ScatterChart as MantineScatterChart } from "@mantine/charts";
import { useMemo } from "react";
import type { UnknownDataFrame } from "@utils";
import type { ScatterChartSeries } from "@mantine/charts";

type Props = {
  data: UnknownDataFrame;
  xAxisKey: string;
  yAxisKey: string;
  height: number;
};

export function ScatterChart({
  data,
  xAxisKey,
  yAxisKey,
  height = 500,
}: Props): JSX.Element {
  // data needs special formatting and typing coercion for scatter chart
  const scatterSeries: ScatterChartSeries[] = useMemo(() => {
    const points = data
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
  }, [data, xAxisKey, yAxisKey]);

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
