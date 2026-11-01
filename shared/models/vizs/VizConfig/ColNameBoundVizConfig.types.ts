import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";

type ColNameBoundVizConfigBar = {
  vizType: "bar";
  xAxisKey: string | undefined;
  series: ColNameBoundXYSeries[];
  layout: "group" | "stack" | "percent";
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type ColNameBoundVizConfigLine = {
  vizType: "line";
  xAxisKey: string | undefined;
  series: ColNameBoundXYSeries[];
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type ColNameBoundVizConfigArea = {
  vizType: "area";
  xAxisKey: string | undefined;
  series: ColNameBoundXYSeries[];
  layout: "default" | "stacked" | "percent" | "split";
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type ColNameBoundVizConfigRadar = {
  vizType: "radar";
  nameKey: string | undefined;
  series: ColNameBoundRadarSeries[];
  withLegend?: boolean;
  chartStyle?: ChartStyle;
};

type ColNameBoundVizConfigPie = {
  vizType: "pie";
  nameKey: string | undefined;
  valueKey: string | undefined;
  isDonut: boolean;
  withLabels: boolean;
  labelsType: "value" | "percent";
  seriesColors?: Record<string, string>;
};

type ColNameBoundVizConfigFunnel = {
  vizType: "funnel";
  nameKey: string | undefined;
  valueKey: string | undefined;
  seriesColors?: Record<string, string>;
};

type ColNameBoundBarSeriesShape = {
  renderAs: "bar";
  key: string;
  label?: string;
  color?: string;
  fillOpacity?: number;
  stackId?: string;
};

type ColNameBoundLineSeriesShape = {
  renderAs: "line";
  key: string;
  label?: string;
  color?: string;
  curveType?: "linear" | "natural" | "monotone" | "step";
  strokeWidth?: number;
  withDots?: boolean;
};

type ColNameBoundAreaSeriesShape = {
  renderAs: "area";
  key: string;
  label?: string;
  color?: string;
  curveType?: "linear" | "natural" | "monotone" | "step";
  strokeWidth?: number;
  fillOpacity?: number;
  withDots?: boolean;
};

/**
 * A `VizConfig.T` bound to its columns by name: each column ID replaced by its
 * `QueryResult` column name, the key each result row is read by. The
 * renderers in `src/lib/ui/viz` consume it, Explorer URLs store charts in it,
 * and dashboards saved before column IDs still hold it until they bind.
 *
 * A `QueryResult` column name is not always the source column's name. An
 * aggregate is emitted as `sum(revenue)` rather than `revenue`, and an
 * explicit alias replaces the name entirely.
 */
export type ColNameBoundVizConfig =
  | { vizType: "table" }
  | ColNameBoundVizConfigBar
  | ColNameBoundVizConfigLine
  | ColNameBoundVizConfigArea
  | {
      vizType: "scatter";
      series: ColNameBoundScatterSeries[];
      chartStyle?: ChartStyle;
    }
  | {
      vizType: "bubble";
      series: ColNameBoundBubbleSeries[];
      chartStyle?: ChartStyle;
    }
  | ColNameBoundVizConfigRadar
  | ColNameBoundVizConfigPie
  | ColNameBoundVizConfigFunnel;

/** Mark settings for mixed XY charts, keyed by `QueryResult` column name. */
export type ColNameBoundXYSeries =
  | ColNameBoundBarSeriesShape
  | ColNameBoundLineSeriesShape
  | ColNameBoundAreaSeriesShape;

/** Scatter cloud settings, keyed by `QueryResult` column name. */
export type ColNameBoundScatterSeries = {
  key: string;
  xKey: string;
  label?: string;
  color?: string;
};

/** Bubble cloud settings, keyed by `QueryResult` column name. */
export type ColNameBoundBubbleSeries = ColNameBoundScatterSeries & {
  sizeKey: string;
};

/** Radar polygon settings, keyed by `QueryResult` column name. */
export type ColNameBoundRadarSeries = {
  key: string;
  label?: string;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
};

/** Row-key bar marks. */
export type ColNameBoundBarSeries = Extract<
  ColNameBoundXYSeries,
  { renderAs: "bar" }
>;
/** Row-key line marks. */
export type ColNameBoundLineSeries = Extract<
  ColNameBoundXYSeries,
  { renderAs: "line" }
>;
/** Row-key area marks. */
export type ColNameBoundAreaSeries = Extract<
  ColNameBoundXYSeries,
  { renderAs: "area" }
>;
