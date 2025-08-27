import type { UnknownDataFrame } from "@/lib/types/common";

export type XYSettings = {
  /**
   * The data object key used to bucket the X-axis (categories or time).
   * Must correspond to a string or date-like field in the dataset.
   */
  xAxisKey: string;
  /**
   * The data object key used for Y-axis numeric values.
   * Must map to a number for each row in the dataframe.
   */
  yAxisKey: string;
};

export type XYChartProps = {
  /**
   * The `data` structure is a conventional dataframe (an array of objects).
   * Each object represents a single row (or bucket).
   *
   * One key in the object should be the `dataKey`, which is used to bucket
   * the data. The remaining keys are treated as series names, and their values
   * must be numeric.
   */
  data: UnknownDataFrame;
  height?: number;
} & Required<Pick<XYSettings, "xAxisKey" | "yAxisKey">>;

export type ChartType = "bar" | "line";
