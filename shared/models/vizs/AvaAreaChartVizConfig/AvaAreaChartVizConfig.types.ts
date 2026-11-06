import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { AvaXYSeries } from "$/models/vizs/series.types.ts";

/**
 * The `AvaVizConfig` of an area chart, keyed by column ID. Each series
 * carries its own mark settings, such as `curveType` and `fillOpacity`,
 * and the host holds the shared X axis, the layout, and canvas styling.
 *
 * Use it wherever an area chart is edited or saved, for example a chart on
 * a dashboard. Renderers take the `UiVizConfig` form instead.
 */
export type AvaAreaChartVizConfig = {
  vizType: "area";

  /**
   * The key of the column to use for the X axis. This is a column ID, not a
   * `QueryResult` column name.
   */
  xAxisKey: QueryColumn.Id | undefined;

  /**
   * One entry per rendered series. Each series carries its own `key`
   * (column ID), `renderAs` (area by default - bar / line allowed),
   * `color`, `curveType`, `fillOpacity`, and other mark-level
   * settings.
   */
  series: AvaXYSeries[];

  /**
   * Multi-series layout. `"default"` draws each area independently
   * (overlapping). `"stacked"` stacks them. `"percent"` is 100%
   * stacked. `"split"` displays positive and negative values apart.
   */
  layout: "default" | "stacked" | "percent" | "split";

  /** Show the chart legend when `true`. */
  withLegend: boolean;

  /** Canvas-level styling (axes, grid, legend position). */
  chartStyle?: ChartStyle;
};
