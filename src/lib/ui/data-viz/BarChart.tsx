import { BarChart as MantineBarChart } from "@mantine/charts";
import { useMemo } from "react";
import { UnknownDataFrame } from "@/lib/types/common";

type Props = {
  /**
   * The `data` structure is a conventional dataframe (an array of objects), but
   * semantically the interpretation is different. Each object represents a
   * collection of bars for one bucket.
   *
   * One key in the object should be the `dataKey` which is used to bucket
   * the data. The remaining keys are the names of the series.
   * The value of each series should be a number.
   */
  data: UnknownDataFrame;
  height?: number;

  /**
   * The data object key that is used for the x-axis buckets.
   */
  xAxisKey: string;

  /**
   * The data object key that is used for the y-axis values. This key must
   * be mapped to a numeric value.
   */
  yAxisKey: string;
};

export function BarChart({
  data,
  xAxisKey,
  yAxisKey,
  height = 500,
}: Props): JSX.Element {
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
