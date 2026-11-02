import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { AvaScatterSeries } from "$/models/vizs/series.types.ts";

/**
 * The `AvaVizConfig` of a multi-series scatter plot, keyed by column ID.
 * Use it wherever a scatter plot is edited or saved, for example a chart on
 * a dashboard. Renderers take the `UiVizConfig` form instead.
 */
export type AvaScatterPlotVizConfig = {
  vizType: "scatter";
  /** One entry per independent (X, Y) cloud of points. */
  series: AvaScatterSeries[];
  /** Canvas-level styling (axes, grid, legend position). */
  chartStyle?: ChartStyle;
};
