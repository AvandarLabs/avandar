import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { AvaBubbleSeries } from "$/models/vizs/SeriesConfig.ts";

/** Viz config for a multi-series bubble chart. */
export type AvaBubbleChartVizConfig = {
  vizType: "bubble";
  /** One entry per independent (X, Y, size) cloud of bubbles. */
  series: AvaBubbleSeries[];
  /** Canvas-level styling (axes, grid, legend position). */
  chartStyle?: ChartStyle;
};
