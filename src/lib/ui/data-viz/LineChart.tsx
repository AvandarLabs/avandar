import { LineChart as MantineLineChart } from "@mantine/charts";
import { useMemo } from "react";
import { UnknownDataFrame } from "@/lib/types/common";

type Props = {
  data: UnknownDataFrame;
  height?: number;
  xAxisKey: string; // bucket key
  yAxisKey: string; // must be numeric
};

export function LineChart({
  data,
  xAxisKey,
  yAxisKey,
  height = 500,
}: Props): JSX.Element {
  const series = useMemo(() => {
    return [{ name: yAxisKey }];
  }, [yAxisKey]);

  return (
    <MantineLineChart
      h={height}
      data={data}
      dataKey={xAxisKey}
      series={series}
      // optional Mantine props:
      // curveType="linear"  // or "monotone"
      // withLegend={false}
      // withDots={false}
    />
  );
}
