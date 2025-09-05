<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { UnknownDataFrame } from "@/lib/types/common";
=======
import type { UnknownDataFrame } from "@/lib/types/common";
>>>>>>> e11f28c (refactored chart types)

=======
>>>>>>> b526f1e (accepted all PR suggestions)
=======
import { UnknownDataFrame } from "@/lib/types/common";

>>>>>>> 212b3a4 (fixed more type issues)
export type XYSettings = {
  xAxisKey: string;
  yAxisKey: string;
};

<<<<<<< HEAD
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
<<<<<<< HEAD
};
=======
=======
/** Common props for charts with X and Y axes. */
>>>>>>> b526f1e (accepted all PR suggestions)
export type XYChartProps = {
  /**
   * The `data` structure is a conventional dataframe (an array of objects).
   * Each object's keys can be referenced by `xAxisKey` and `yAxisKey`.
   */
<<<<<<< HEAD
  data: UnknownDataFrame;
  height?: number;
} & Required<Pick<XYSettings, "xAxisKey" | "yAxisKey">>;

export type ChartType = "bar" | "line";
>>>>>>> e11f28c (refactored chart types)
=======
  data: Array<Record<string, unknown>>;
  settings: XYSettings;
=======
>>>>>>> 212b3a4 (fixed more type issues)
};
>>>>>>> b526f1e (accepted all PR suggestions)
