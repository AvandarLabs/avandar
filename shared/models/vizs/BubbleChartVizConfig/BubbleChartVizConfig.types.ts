import type { BubbleSeries } from "$/models/vizs/SeriesConfig.ts";

/** Viz config for a multi-series bubble chart. */
export type BubbleChartVizConfig = {
  vizType: "bubble";
  /** One entry per independent (X, Y, size) cloud of bubbles. */
  series: BubbleSeries[];
};
