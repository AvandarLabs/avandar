import type { UnknownDataFrame } from "@/lib/types/common";

export type XYSettings = {
  xAxisKey: string;
  yAxisKey: string;
};

export type XYChartProps = {
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
} & Required<Pick<XYSettings, "xAxisKey" | "yAxisKey">>;

export type ChartType = "bar" | "line";
