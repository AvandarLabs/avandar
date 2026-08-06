import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { XYSeries } from "$/models/vizs/SeriesConfig.ts";

/**
 * Configuration for a bar chart. The chart is the host; individual
 * series declare how they render (bar by default — but a line or area
 * series can be embedded, in which case the renderer falls back to a
 * composite chart).
 */
export type BarChartVizConfig = {
  vizType: "bar";

  /**
   * The key of the column to use for the X (category) axis. This is a
   * column name, not an ID.
   *
   * TODO(jpsyx): create a concept of a QueryColumn and use QueryColumnId here.
   */
  xAxisKey: string | undefined;

  /**
   * One entry per rendered series. Each series carries its own `key`
   * (column name), `renderAs` (bar / line / area), color, and other
   * mark-level settings.
   */
  series: XYSeries[];

  /**
   * Bar layout when all series render as bars. Composite renders
   * (mixed `renderAs`) ignore this and always group.
   */
  layout: "group" | "stack" | "percent";

  /** Show the chart legend when `true`. */
  withLegend: boolean;

  /** Canvas-level styling (axes, grid, legend position). */
  chartStyle?: ChartStyle;
};
