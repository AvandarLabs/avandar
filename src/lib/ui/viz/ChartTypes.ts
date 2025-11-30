import { UnknownDataFrame } from "$/lib/types/common";

export type XYSettings = {
  xAxisKey: string;
  yAxisKey: string;
};

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
