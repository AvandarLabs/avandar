import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { AvaScatterSeries } from "$/models/vizs/series.types.ts";

/** Viz config for a multi-series scatter plot. */
export type AvaScatterPlotVizConfig = {
  vizType: "scatter";
  /** One entry per independent (X, Y) cloud of points. */
  series: AvaScatterSeries[];
  /** Canvas-level styling (axes, grid, legend position). */
  chartStyle?: ChartStyle;
};
