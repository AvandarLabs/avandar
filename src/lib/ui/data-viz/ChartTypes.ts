<<<<<<< HEAD
import { UnknownDataFrame } from "@/lib/types/common";
=======
import type { UnknownDataFrame } from "@/lib/types/common";
>>>>>>> e11f28c (refactored chart types)

export type XYSettings = {
  xAxisKey: string;
  yAxisKey: string;
};

<<<<<<< HEAD
/** Common props for charts with X and Y axes. */
export type XYChartProps = {
  /**
   * The `data` structure is a conventional dataframe (an array of objects).
   * Each object's keys can be referenced by `xAxisKey` and `yAxisKey`.
   */
  data: UnknownDataFrame;
  xAxisKey: string;
  yAxisKey: string;
  height: number;
};
=======
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
>>>>>>> e11f28c (refactored chart types)
