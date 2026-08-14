import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig.ts";

/** Viz config for a multi-series scatter plot. */
export type ScatterPlotVizConfig = {
  vizType: "scatter";
  /** One entry per independent (X, Y) cloud of points. */
  series: ScatterSeries[];
  /** Canvas-level styling (axes, grid, legend position). */
  chartStyle?: ChartStyle;
};
