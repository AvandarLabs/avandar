import type { UiPluginVizConfig } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";

type UiVizConfigBar = {
  vizType: "bar";
  xAxisKey: string | undefined;
  series: XYSeries[];
  layout: "group" | "stack" | "percent";
  barGap?: "default" | "none";
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type UiVizConfigLine = {
  vizType: "line";
  xAxisKey: string | undefined;
  series: XYSeries[];
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type UiVizConfigArea = {
  vizType: "area";
  xAxisKey: string | undefined;
  series: XYSeries[];
  layout: "default" | "stacked" | "percent" | "split";
  withLegend: boolean;
  chartStyle?: ChartStyle;
};

type UiVizConfigRadar = {
  vizType: "radar";
  nameKey: string | undefined;
  series: RadarSeries[];
  withLegend?: boolean;
  chartStyle?: ChartStyle;
};

type UiVizConfigPie = {
  vizType: "pie";
  nameKey: string | undefined;
  valueKey: string | undefined;
  isDonut: boolean;
  withLabels: boolean;
  labelsType: "value" | "percent";
  seriesColors?: Record<string, string>;
};

type UiVizConfigFunnel = {
  vizType: "funnel";
  nameKey: string | undefined;
  valueKey: string | undefined;
  seriesColors?: Record<string, string>;
};

type BarSeriesShape = {
  renderAs: "bar";
  key: string;
  label?: string;
  color?: string;
  fillOpacity?: number;
  stackId?: string;
};

type LineSeriesShape = {
  renderAs: "line";
  key: string;
  label?: string;
  color?: string;
  curveType?: "linear" | "natural" | "monotone" | "step";
  strokeWidth?: number;
  withDots?: boolean;
};

type AreaSeriesShape = {
  renderAs: "area";
  key: string;
  label?: string;
  color?: string;
  curveType?: "linear" | "natural" | "monotone" | "step";
  strokeWidth?: number;
  fillOpacity?: number;
  withDots?: boolean;
};

/** The `UiVizConfig` of a chart or table type Avandar draws itself. */
export type BuiltInUiVizConfig =
  | { vizType: "table" }
  | UiVizConfigBar
  | UiVizConfigLine
  | UiVizConfigArea
  | {
      vizType: "scatter";
      series: ScatterSeries[];
      chartStyle?: ChartStyle;
    }
  | {
      vizType: "bubble";
      series: BubbleSeries[];
      chartStyle?: ChartStyle;
    }
  | UiVizConfigRadar
  | UiVizConfigPie
  | UiVizConfigFunnel;

/**
 * The conventional chart config a renderer takes, with no business logic: an
 * `AvaVizConfig.T` with each column ID replaced by its `QueryResult` column
 * name, the key each result row is read by. `makeUiVizConfigFromAvaVizConfig`
 * builds one. Chart renderers consume it. It also holds charts where there
 * are no column IDs yet, for example in Explorer URLs and in dashboards saved
 * before column IDs, until they bind.
 *
 * A `QueryResult` column name is not always the source column's name. An
 * aggregate is emitted as `sum(revenue)` rather than `revenue`, and an
 * explicit alias replaces the name entirely.
 */
export type UiVizConfig = BuiltInUiVizConfig | UiPluginVizConfig;

/** Mark settings for mixed XY charts, keyed by `QueryResult` column name. */
export type XYSeries = BarSeriesShape | LineSeriesShape | AreaSeriesShape;

/** Scatter cloud settings, keyed by `QueryResult` column name. */
export type ScatterSeries = {
  key: string;
  xKey: string;
  label?: string;
  color?: string;
};

/** Bubble cloud settings, keyed by `QueryResult` column name. */
export type BubbleSeries = ScatterSeries & {
  sizeKey: string;
};

/** Radar polygon settings, keyed by `QueryResult` column name. */
export type RadarSeries = {
  key: string;
  label?: string;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
};

/** Row-key bar marks. */
export type BarSeries = Extract<XYSeries, { renderAs: "bar" }>;
/** Row-key line marks. */
export type LineSeries = Extract<XYSeries, { renderAs: "line" }>;
/** Row-key area marks. */
export type AreaSeries = Extract<XYSeries, { renderAs: "area" }>;
