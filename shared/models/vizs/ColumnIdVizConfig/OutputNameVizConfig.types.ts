import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";

type OutputNameVizConfigBar = {
  vizType: "bar";
  xAxisKey: string | undefined;
  series: OutputNameXYSeries[];
  layout: "group" | "stack" | "percent";
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type OutputNameVizConfigLine = {
  vizType: "line";
  xAxisKey: string | undefined;
  series: OutputNameXYSeries[];
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type OutputNameVizConfigArea = {
  vizType: "area";
  xAxisKey: string | undefined;
  series: OutputNameXYSeries[];
  layout: "default" | "stacked" | "percent" | "split";
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type OutputNameVizConfigRadar = {
  vizType: "radar";
  nameKey: string | undefined;
  series: OutputNameRadarSeries[];
  withLegend?: boolean;
  chartStyle?: ChartStyle;
};

type OutputNameVizConfigPie = {
  vizType: "pie";
  nameKey: string | undefined;
  valueKey: string | undefined;
  isDonut: boolean;
  withLabels: boolean;
  labelsType: "value" | "percent";
  seriesColors?: Record<string, string>;
};

type OutputNameVizConfigFunnel = {
  vizType: "funnel";
  nameKey: string | undefined;
  valueKey: string | undefined;
  seriesColors?: Record<string, string>;
};

type OutputNameBarSeriesShape = {
  renderAs: "bar";
  key: string;
  label?: string;
  color?: string;
  fillOpacity?: number;
  stackId?: string;
};

type OutputNameLineSeriesShape = {
  renderAs: "line";
  key: string;
  label?: string;
  color?: string;
  curveType?: "linear" | "natural" | "monotone" | "step";
  strokeWidth?: number;
  withDots?: boolean;
};

type OutputNameAreaSeriesShape = {
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
 * Chart configuration whose column slots store output names: the row keys a
 * query result is read by. The renderers in `src/lib/ui/viz` consume it,
 * Explorer URLs store charts in it, and dashboards saved before column IDs
 * still hold it until they bind.
 */
export type OutputNameVizConfig =
  | { vizType: "table" }
  | OutputNameVizConfigBar
  | OutputNameVizConfigLine
  | OutputNameVizConfigArea
  | {
      vizType: "scatter";
      series: OutputNameScatterSeries[];
      chartStyle?: ChartStyle;
    }
  | {
      vizType: "bubble";
      series: OutputNameBubbleSeries[];
      chartStyle?: ChartStyle;
    }
  | OutputNameVizConfigRadar
  | OutputNameVizConfigPie
  | OutputNameVizConfigFunnel;

/** Mark settings for mixed XY charts, keyed by output name. */
export type OutputNameXYSeries =
  | OutputNameBarSeriesShape
  | OutputNameLineSeriesShape
  | OutputNameAreaSeriesShape;

/** Scatter cloud settings, keyed by output name. */
export type OutputNameScatterSeries = {
  key: string;
  xKey: string;
  label?: string;
  color?: string;
};

/** Bubble cloud settings, keyed by output name. */
export type OutputNameBubbleSeries = OutputNameScatterSeries & {
  sizeKey: string;
};

/** Radar polygon settings, keyed by output name. */
export type OutputNameRadarSeries = {
  key: string;
  label?: string;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
};

/** Row-key bar marks. */
export type OutputNameBarSeries = Extract<
  OutputNameXYSeries,
  { renderAs: "bar" }
>;
/** Row-key line marks. */
export type OutputNameLineSeries = Extract<
  OutputNameXYSeries,
  { renderAs: "line" }
>;
/** Row-key area marks. */
export type OutputNameAreaSeries = Extract<
  OutputNameXYSeries,
  { renderAs: "area" }
>;
