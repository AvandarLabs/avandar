import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { XYSeries } from "$/models/vizs/SeriesConfig.ts";

/**
 * Configuration for an area chart. Each series carries its own
 * `curveType`, `fillOpacity`, and so on; the host config holds canvas
 * styling, the shared X axis, and the multi-series layout.
 */
export type AreaChartVizConfig = {
  vizType: "area";

  /**
   * The key of the column to use for the X axis. This is a column
   * name, not an ID.
   */
  xAxisKey: string | undefined;

  /**
   * One entry per rendered series. Each series carries its own `key`
   * (column name), `renderAs` (area by default — bar / line allowed),
   * `color`, `curveType`, `fillOpacity`, and other mark-level
   * settings.
   */
  series: XYSeries[];

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
