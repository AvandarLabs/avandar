import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { AvaXYSeries } from "$/models/vizs/series.types.ts";

/**
 * The `AvaVizConfig` of a line chart, keyed by column ID. Each series
 * carries its own mark settings, such as `curveType` and `strokeWidth`,
 * and the host holds the shared X axis and canvas styling.
 *
 * Use it wherever a line chart is edited or saved, for example a chart on a
 * dashboard. Renderers take the `UiVizConfig` form instead.
 */
export type AvaLineChartVizConfig = {
  vizType: "line";

  /**
   * The key of the column to use for the X axis. This is a column ID, not a
   * `QueryResult` column name.
   */
  xAxisKey: QueryColumn.Id | undefined;

  /**
   * One entry per rendered series. Each series carries its own `key`
   * (column ID), `renderAs` (line by default - bar / area allowed),
   * `color`, `curveType`, and other mark-level settings.
   */
  series: AvaXYSeries[];

  /** Show the chart legend when `true`. */
  withLegend: boolean;

  /** Canvas-level styling (axes, grid, legend position). */
  chartStyle?: ChartStyle;
};
