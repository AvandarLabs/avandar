import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { AvaXYSeries } from "$/models/vizs/series.types.ts";

/**
 * The `AvaVizConfig` of a bar chart, keyed by column ID. The chart is the
 * host. Each series declares how it renders, bar by default, and a line or
 * area series makes the renderer fall back to a composite chart.
 *
 * Use it wherever a bar chart is edited or saved, for example a chart on a
 * dashboard. Renderers take the `UiVizConfig` form instead.
 */
export type AvaBarChartVizConfig = {
  vizType: "bar";

  /**
   * The key of the column to use for the X (category) axis. This is a
   * stable result-column ID.
   *
   */
  xAxisKey: QueryColumn.Id | undefined;

  /**
   * One entry per rendered series. Each series carries its own `key`
   * (column ID), `renderAs` (bar / line / area), color, and other
   * mark-level settings.
   */
  series: AvaXYSeries[];

  /**
   * Bar layout when all series render as bars. Composite renders
   * (mixed `renderAs`) ignore this and always group.
   */
  layout: "group" | "stack" | "percent";

  /**
   * Space between bar categories. `"none"` draws neighboring bars touching,
   * as an epicurve or a histogram needs. Unset draws the renderer's default
   * gap.
   */
  barGap?: "default" | "none";

  /** Show the chart legend when `true`. */
  withLegend: boolean;

  /** Canvas-level styling (axes, grid, legend position). */
  chartStyle?: ChartStyle;
};
