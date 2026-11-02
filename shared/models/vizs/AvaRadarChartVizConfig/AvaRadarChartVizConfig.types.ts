import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { AvaRadarSeries } from "$/models/vizs/series.types.ts";

/**
 * The `AvaVizConfig` of a radar (spider) chart, keyed by column ID. Each
 * series renders as one polygon, and all polygons share the category axes
 * that `nameKey` defines.
 *
 * Use it wherever a radar chart is edited or saved, for example a chart on
 * a dashboard. Renderers take the `UiVizConfig` form instead.
 */
export type AvaRadarChartVizConfig = {
  vizType: "radar";

  /**
   * The column whose values label each axis of the radar (category).
   * This is a stable result-column ID.
   */
  nameKey: QueryColumn.Id | undefined;

  /** One polygon per entry. */
  series: AvaRadarSeries[];

  /** Show the chart legend when `true`. */
  withLegend?: boolean;

  /** Canvas-level styling (legend position, etc.). */
  chartStyle?: ChartStyle;
};
