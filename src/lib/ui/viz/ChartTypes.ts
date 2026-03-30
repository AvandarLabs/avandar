import type {
  FormattableTimezone,
} from "@utils/dates/formatDate/formatDate";
import type { UnknownDataFrame } from "@utils/types/common.types";

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

  /**
   * Column names whose values should be formatted as dates on the X axis.
   * When `xAxisKey` is in this set, tick labels and tooltip headers are
   * formatted with `formatDate` using `dateFormat` and `timezone`.
   */
  dateColumns?: ReadonlySet<string>;

  /**
   * Format string passed to `formatDate` for date tick labels and tooltip
   * headers. Defaults to `"YYYY-MM-DD"` (shorter than the DataGrid default
   * to fit within chart tick width).
   */
  dateFormat?: string;

  /** Timezone passed to `formatDate`. Defaults to `"local"`. */
  timezone?: FormattableTimezone;
};
