import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";

type NameResolvedVizConfigBar = {
  vizType: "bar";
  xAxisKey: string | undefined;
  series: NameResolvedXYSeries[];
  layout: "group" | "stack" | "percent";
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type NameResolvedVizConfigLine = {
  vizType: "line";
  xAxisKey: string | undefined;
  series: NameResolvedXYSeries[];
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type NameResolvedVizConfigArea = {
  vizType: "area";
  xAxisKey: string | undefined;
  series: NameResolvedXYSeries[];
  layout: "default" | "stacked" | "percent" | "split";
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type NameResolvedVizConfigRadar = {
  vizType: "radar";
  nameKey: string | undefined;
  series: NameResolvedRadarSeries[];
  withLegend?: boolean;
  chartStyle?: ChartStyle;
};

type NameResolvedVizConfigPie = {
  vizType: "pie";
  nameKey: string | undefined;
  valueKey: string | undefined;
  isDonut: boolean;
  withLabels: boolean;
  labelsType: "value" | "percent";
  seriesColors?: Record<string, string>;
};

type NameResolvedVizConfigFunnel = {
  vizType: "funnel";
  nameKey: string | undefined;
  valueKey: string | undefined;
  seriesColors?: Record<string, string>;
};

type NameResolvedBarSeriesShape = {
  renderAs: "bar";
  key: string;
  label?: string;
  color?: string;
  fillOpacity?: number;
  stackId?: string;
};

type NameResolvedLineSeriesShape = {
  renderAs: "line";
  key: string;
  label?: string;
  color?: string;
  curveType?: "linear" | "natural" | "monotone" | "step";
  strokeWidth?: number;
  withDots?: boolean;
};

type NameResolvedAreaSeriesShape = {
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
 * A `VizConfig.T` whose column IDs have each been resolved to a name string:
 * the output name a query result row is keyed by. The renderers in
 * `src/lib/ui/viz` consume it, Explorer URLs store charts in it, and dashboards
 * saved before column IDs still hold it until they bind.
 */
export type NameResolvedVizConfig =
  | { vizType: "table" }
  | NameResolvedVizConfigBar
  | NameResolvedVizConfigLine
  | NameResolvedVizConfigArea
  | {
      vizType: "scatter";
      series: NameResolvedScatterSeries[];
      chartStyle?: ChartStyle;
    }
  | {
      vizType: "bubble";
      series: NameResolvedBubbleSeries[];
      chartStyle?: ChartStyle;
    }
  | NameResolvedVizConfigRadar
  | NameResolvedVizConfigPie
  | NameResolvedVizConfigFunnel;

/** Mark settings for mixed XY charts, keyed by output name. */
export type NameResolvedXYSeries =
  | NameResolvedBarSeriesShape
  | NameResolvedLineSeriesShape
  | NameResolvedAreaSeriesShape;

/** Scatter cloud settings, keyed by output name. */
export type NameResolvedScatterSeries = {
  key: string;
  xKey: string;
  label?: string;
  color?: string;
};

/** Bubble cloud settings, keyed by output name. */
export type NameResolvedBubbleSeries = NameResolvedScatterSeries & {
  sizeKey: string;
};

/** Radar polygon settings, keyed by output name. */
export type NameResolvedRadarSeries = {
  key: string;
  label?: string;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
};

/** Row-key bar marks. */
export type NameResolvedBarSeries = Extract<
  NameResolvedXYSeries,
  { renderAs: "bar" }
>;
/** Row-key line marks. */
export type NameResolvedLineSeries = Extract<
  NameResolvedXYSeries,
  { renderAs: "line" }
>;
/** Row-key area marks. */
export type NameResolvedAreaSeries = Extract<
  NameResolvedXYSeries,
  { renderAs: "area" }
>;
