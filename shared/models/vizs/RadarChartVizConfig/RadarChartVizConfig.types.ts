import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { RadarSeries } from "$/models/vizs/SeriesConfig.ts";

/**
 * Configuration for a radar (spider) chart. Each series renders as one
 * radar polygon; multiple polygons share the categorical axis defined
 * by `nameKey`.
 */
export type RadarChartVizConfig = {
  vizType: "radar";

  /**
   * The column whose values label each axis of the radar (category).
   * This is a stable result-column ID.
   */
  nameKey: QueryColumn.Id | undefined;

  /** One polygon per entry. */
  series: RadarSeries[];

  /** Show the chart legend when `true`. */
  withLegend?: boolean;

  /** Canvas-level styling (legend position, etc.). */
  chartStyle?: ChartStyle;
};
