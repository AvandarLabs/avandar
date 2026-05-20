import type { FormattableTimezone, UnknownDataFrame } from "@utils";
import type { ChartStyle } from "$/models/vizs/ChartStyle";
import type { XYSeries } from "$/models/vizs/SeriesConfig";

/**
 * Common props for XY charts (bar / line / area). Each chart wrapper
 * accepts a `series` array; when any series's `renderAs` differs from
 * the wrapper's own type, the wrapper falls back to a composite
 * renderer.
 */
export type XYChartProps = {
  data: UnknownDataFrame;
  xAxisKey: string;
  series: readonly XYSeries[];
  height: number | string;
  withLegend?: boolean;
  chartStyle?: ChartStyle;

  /**
   * Column names whose values should be formatted as dates on the X
   * axis. When `xAxisKey` is in this set, tick labels and tooltip
   * headers are formatted with `formatDate` using `dateFormat` and
   * `timezone`.
   */
  dateColumns?: ReadonlySet<string>;
  dateFormat?: string;
  timezone?: FormattableTimezone;
};
