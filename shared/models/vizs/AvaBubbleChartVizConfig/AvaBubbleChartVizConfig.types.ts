import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { AvaBubbleSeries } from "$/models/vizs/series.types.ts";

/**
 * The `AvaVizConfig` of a multi-series bubble chart, keyed by column ID.
 * Use it wherever a bubble chart is edited or saved, for example a chart on
 * a dashboard. Renderers take the `UiVizConfig` form instead.
 */
export type AvaBubbleChartVizConfig = {
  vizType: "bubble";
  /** One entry per independent (X, Y, size) cloud of bubbles. */
  series: AvaBubbleSeries[];
  /** Canvas-level styling (axes, grid, legend position). */
  chartStyle?: ChartStyle;
};
