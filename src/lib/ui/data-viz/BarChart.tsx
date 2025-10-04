import { BarChart as MantineBarChart } from "@mantine/charts";
import { useMemo } from "react";
import { XYChartProps } from "./ChartTypes";

export function BarChart({
  data,
  xAxisKey,
  yAxisKey,
  height = 500,
}: XYChartProps): JSX.Element {
  const series = useMemo(() => {
    return [{ name: yAxisKey }];
  }, [yAxisKey]);

  return (
    <MantineBarChart
      h={height}
      data={data}
      dataKey={xAxisKey}
      series={series}
    />
  );
}
