import type { RatePlotPoint } from "../makeRatePlotPointsFromRows/makeRatePlotPointsFromRows";

/**
 * One row of the data `RatePlot` hands to the chart: the point, the whisker
 * lengths below and above the rate for `ErrorBar`, and the tooltip text.
 */
export type RatePlotChartRow = RatePlotPoint &
  Readonly<{
    rateError: readonly [number, number] | undefined;
    rateText: string;
  }>;
