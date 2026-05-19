import type { ChartStyle } from "$/models/vizs/ChartStyle.ts";
import type { XYSeries } from "$/models/vizs/SeriesConfig.ts";

/**
 * Configuration for a line chart. Each series carries its own
 * `curveType`, `strokeWidth`, and so on; the host config holds canvas
 * styling and the shared X axis.
 */
export type LineChartVizConfig = {
  vizType: "line";

  /**
   * The key of the column to use for the X axis. This is a column
   * name, not an ID.
   *
   * TODO(jpsyx): create a concept of a QueryColumn and use QueryColumnId here.
   */
  xAxisKey: string | undefined;

  /**
   * One entry per rendered series. Each series carries its own `key`
   * (column name), `renderAs` (line by default — bar / area allowed),
   * `color`, `curveType`, and other mark-level settings.
   */
  series: XYSeries[];

  /** Show the chart legend when `true`. */
  withLegend: boolean;

  /** Canvas-level styling (axes, grid, legend position). */
  chartStyle?: ChartStyle;
};
