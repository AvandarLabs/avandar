import { LineChart as MantineLineChart } from "@mantine/charts";
import { useMemo } from "react";
import { XYChartProps } from "./ChartTypes";

export function LineChart({
  data,
  xAxisKey,
  yAxisKey,
  height = 500,
}: XYChartProps): JSX.Element {
  const series = useMemo(() => {
    return [{ name: yAxisKey }];
  }, [yAxisKey]);

  return (
    <MantineLineChart
      h={height}
      data={data}
      dataKey={xAxisKey}
      series={series}
    />
  );
}
