import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";

type NameBoundVizConfigBar = {
  vizType: "bar";
  xAxisKey: string | undefined;
  series: NameBoundXYSeries[];
  layout: "group" | "stack" | "percent";
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type NameBoundVizConfigLine = {
  vizType: "line";
  xAxisKey: string | undefined;
  series: NameBoundXYSeries[];
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type NameBoundVizConfigArea = {
  vizType: "area";
  xAxisKey: string | undefined;
  series: NameBoundXYSeries[];
  layout: "default" | "stacked" | "percent" | "split";
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type NameBoundVizConfigRadar = {
  vizType: "radar";
  nameKey: string | undefined;
  series: NameBoundRadarSeries[];
  withLegend?: boolean;
  chartStyle?: ChartStyle;
};

type NameBoundVizConfigPie = {
  vizType: "pie";
  nameKey: string | undefined;
  valueKey: string | undefined;
  isDonut: boolean;
  withLabels: boolean;
  labelsType: "value" | "percent";
  seriesColors?: Record<string, string>;
};

type NameBoundVizConfigFunnel = {
  vizType: "funnel";
  nameKey: string | undefined;
  valueKey: string | undefined;
  seriesColors?: Record<string, string>;
};

type NameBoundBarSeriesShape = {
  renderAs: "bar";
  key: string;
  label?: string;
  color?: string;
  fillOpacity?: number;
  stackId?: string;
};

type NameBoundLineSeriesShape = {
  renderAs: "line";
  key: string;
  label?: string;
  color?: string;
  curveType?: "linear" | "natural" | "monotone" | "step";
  strokeWidth?: number;
  withDots?: boolean;
};

type NameBoundAreaSeriesShape = {
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
export type NameBoundVizConfig =
  | { vizType: "table" }
  | NameBoundVizConfigBar
  | NameBoundVizConfigLine
  | NameBoundVizConfigArea
  | {
      vizType: "scatter";
      series: NameBoundScatterSeries[];
      chartStyle?: ChartStyle;
    }
  | {
      vizType: "bubble";
      series: NameBoundBubbleSeries[];
      chartStyle?: ChartStyle;
    }
  | NameBoundVizConfigRadar
  | NameBoundVizConfigPie
  | NameBoundVizConfigFunnel;

/** Mark settings for mixed XY charts, keyed by `QueryResult` column name. */
export type NameBoundXYSeries =
  | NameBoundBarSeriesShape
  | NameBoundLineSeriesShape
  | NameBoundAreaSeriesShape;

/** Scatter cloud settings, keyed by `QueryResult` column name. */
export type NameBoundScatterSeries = {
  key: string;
  xKey: string;
  label?: string;
  color?: string;
};

/** Bubble cloud settings, keyed by `QueryResult` column name. */
export type NameBoundBubbleSeries = NameBoundScatterSeries & {
  sizeKey: string;
};

/** Radar polygon settings, keyed by `QueryResult` column name. */
export type NameBoundRadarSeries = {
  key: string;
  label?: string;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
};

/** Row-key bar marks. */
export type NameBoundBarSeries = Extract<
  NameBoundXYSeries,
  { renderAs: "bar" }
>;
/** Row-key line marks. */
export type NameBoundLineSeries = Extract<
  NameBoundXYSeries,
  { renderAs: "line" }
>;
/** Row-key area marks. */
export type NameBoundAreaSeries = Extract<
  NameBoundXYSeries,
  { renderAs: "area" }
>;
