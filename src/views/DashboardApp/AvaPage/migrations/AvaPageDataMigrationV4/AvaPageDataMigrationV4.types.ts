/**
 * Frozen AvaPage v4 root, block, filter, and row-key chart shapes.
 * Only external library types and isolated historical schemas may be imported.
 */
import type {
  V3_AvaPageData,
  V3_AvaPageRootProps,
  V3_PBlockPropsRegistry,
  V3_VizConfig,
} from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV3/AvaPageDataMigrationV3.types";
import type { Config as PuckConfig, Data as PuckData } from "@puckeditor/core";
import type { Simplify } from "type-fest";
type V4_BarSeries = {
  renderAs: "bar";
  key: string;
  label?: string;
  color?: string;
  fillOpacity?: number;
  stackId?: string;
};

type V4_LineSeries = {
  renderAs: "line";
  key: string;
  label?: string;
  color?: string;
  curveType?: V4_CurveType;
  strokeWidth?: number;
  withDots?: boolean;
};

type V4_AreaSeries = {
  renderAs: "area";
  key: string;
  label?: string;
  color?: string;
  curveType?: V4_CurveType;
  strokeWidth?: number;
  fillOpacity?: number;
  withDots?: boolean;
};

type V4_VizConfigBar = {
  vizType: "bar";
  xAxisKey: string | undefined;
  series: V4_XYSeries[];
  layout: "group" | "stack" | "percent";
  withLegend: boolean;
  chartStyle?: V4_ChartStyle;
};

type V4_VizConfigLine = {
  vizType: "line";
  xAxisKey: string | undefined;
  series: V4_XYSeries[];
  withLegend: boolean;
  chartStyle?: V4_ChartStyle;
};

type V4_VizConfigArea = {
  vizType: "area";
  xAxisKey: string | undefined;
  series: V4_XYSeries[];
  layout: "default" | "stacked" | "percent" | "split";
  withLegend: boolean;
  chartStyle?: V4_ChartStyle;
};

type V4_VizConfigPie = {
  vizType: "pie";
  nameKey: string | undefined;
  valueKey: string | undefined;
  isDonut: boolean;
  withLabels: boolean;
  labelsType: "value" | "percent";
  seriesColors?: Record<string, string>;
};

type V4_VizConfigFunnel = {
  vizType: "funnel";
  nameKey: string | undefined;
  valueKey: string | undefined;
  seriesColors?: Record<string, string>;
};

type V4_VizConfigRadar = {
  vizType: "radar";
  nameKey: string | undefined;
  series: V4_RadarSeries[];
  withLegend?: boolean;
  chartStyle?: V4_ChartStyle;
};

export type {
  V3_AvaPageData,
  V3_AvaPageRootProps,
  V3_PBlockPropsRegistry,
  V3_VizConfig,
};

type V4_RootPadding = "none" | "xs" | "sm" | "md" | "lg" | "xl";

/** Frozen document-level presentation properties for schema version 4. */
export type V4_AvaPageRootProps = {
  author: string;
  publishedAt: string;
  subtitle: string;
  title: string;
  horizontalPadding: V4_RootPadding;
  verticalPadding: V4_RootPadding;
  containerMaxWidth: {
    unit: "%" | "px";
    value: number;
  };
  theme: "default" | "ocean" | "forest" | "rose" | "amber" | "graphite";
  typography: "system" | "serif" | "mono";
  isAuthorHidden: boolean;
  isPublishedAtHidden: boolean;
  isSubtitleHidden: boolean;
  isTitleHidden: boolean;
  schemaVersion: 4;
};

type V4_CurveType = "linear" | "natural" | "monotone" | "step";

type V4_AxisStyle = {
  label?: string;
  labelColor?: string;
  tickColor?: string;
  hide?: boolean;
  min?: number;
  max?: number;
  tickInterval?: number;
  tickAngle?: number;
};

type V4_ChartStyle = {
  xAxis?: V4_AxisStyle;
  yAxis?: V4_AxisStyle;
  grid?: {
    color?: string;
    horizontal?: boolean;
    vertical?: boolean;
  };
  legend?: { position?: "top" | "bottom" | "left" | "right" };
};

type V4_XYSeries = V4_BarSeries | V4_LineSeries | V4_AreaSeries;

type V4_ScatterSeries = {
  key: string;
  xKey: string;
  label?: string;
  color?: string;
};

type V4_RadarSeries = {
  key: string;
  label?: string;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
};

/** Frozen name-based visualization configurations for schema version 4. */
export type V4_VizConfig =
  | { vizType: "table" }
  | V4_VizConfigBar
  | V4_VizConfigLine
  | V4_VizConfigArea
  | {
      vizType: "scatter";
      series: V4_ScatterSeries[];
      chartStyle?: V4_ChartStyle;
    }
  | V4_VizConfigPie
  | V4_VizConfigFunnel
  | V4_VizConfigRadar
  | {
      vizType: "bubble";
      series: Array<V4_ScatterSeries & { sizeKey: string }>;
      chartStyle?: V4_ChartStyle;
    };

type V4_DataVizProps = {
  nlQuery: {
    prompt: string;
    rawSql: string;
    generations: ReadonlyArray<
      | { prompt: string; rawSql: string; error?: undefined }
      | { prompt: string; rawSql: undefined; error: string }
    >;
  };
  vizType: V4_VizConfig["vizType"];
  vizConfig: V4_VizConfig;
  globalFilterSubscription: {
    mode: "all" | "selected" | "none";
    subscribedFilterIds: readonly string[];
  };
  localFilters: readonly V4_LocalFilter[];
};

type V4_LocalFilter = {
  id: string;
  label: string;
  columnName: string;
  mode: "select_single" | "select_multi" | "contains";
  optionsRaw: string;
  defaultValue: string;
};

type V4_FilterProps = {
  filterId: string;
  label: string;
  columnName: string;
  mode: "select_single" | "select_multi" | "contains";
  optionsRaw: string;
  defaultValue: string;
};

type V4_HeadingBlockProps = {
  align: "left" | "center" | "right";
  level: 1 | 2 | 3 | 4;
  text: string;
};

type V4_ParagraphBlockProps = {
  align: "left" | "center" | "right";
  text: string;
};

type V4_QuoteBlockProps = {
  cite: string;
  quote: string;
};

type V4_DividerBlockProps = {
  /** Reserved so the props shape matches Puck's `WithId<Props>` expectation. */
  _empty?: never;
};

type V4_FigureBlockProps = {
  alt: string;
  caption: string;
  src: string;
};

type V4_CalloutBlockProps = {
  body: string;
  title: string;
  tone: "info" | "warning" | "neutral";
};

type V4_ListBlockProps = {
  items: ReadonlyArray<{ text: string }>;
  type: "ordered" | "unordered";
};

type V4_CodeBlockProps = {
  code: string;
  language: string;
};

type V4_EmbedBlockProps = {
  height: number;
  title: string;
  url: string;
};

type V4_TableBlockProps = {
  data: string;
  delimiter: "comma" | "tab" | "pipe";
  hasHeader: boolean;
};

type V4_SectionProps = {
  background: "none" | "subtle";
  content: unknown;
  maxWidth: "narrow" | "normal" | "wide" | "full";
  padding: "sm" | "md" | "lg";
};

type V4_ColumnsProps = {
  collapseAt: "sm" | "md" | "lg";
  col1: unknown;
  col10: unknown;
  col11: unknown;
  col12: unknown;
  col2: unknown;
  col3: unknown;
  col4: unknown;
  col5: unknown;
  col6: unknown;
  col7: unknown;
  col8: unknown;
  col9: unknown;
  gap: "xs" | "sm" | "md" | "lg";
  leftSpan?: number;
  numColumns: number;
  rightSpan?: number;
};

type V4_SidebarLayoutProps = {
  collapseAt: "sm" | "md" | "lg";
  gap: "xs" | "sm" | "md" | "lg";
  main: unknown;
  sidebar: unknown;
  sidebarPosition: "left" | "right";
  sidebarSpan: number;
};

type V4_GridProps = {
  gap: "xs" | "sm" | "md" | "lg";
  numColumns: number;
  numRows: number;
} & Record<`r${number}c${number}`, unknown>;

type V4_CardProps = {
  content: unknown;
  title: string;
};

/** Frozen saved block properties for schema version 4. */
export type V4_PBlockPropsRegistry = {
  Card: V4_CardProps;
  CalloutBlock: V4_CalloutBlockProps;
  Columns: V4_ColumnsProps;
  CodeBlock: V4_CodeBlockProps;
  DataViz: V4_DataVizProps;
  DividerBlock: V4_DividerBlockProps;
  EmbedBlock: V4_EmbedBlockProps;
  FigureBlock: V4_FigureBlockProps;
  Filter: V4_FilterProps;
  Grid: V4_GridProps;
  HeadingBlock: V4_HeadingBlockProps;
  ListBlock: V4_ListBlockProps;
  ParagraphBlock: V4_ParagraphBlockProps;
  QuoteBlock: V4_QuoteBlockProps;
  Section: V4_SectionProps;
  SidebarLayout: V4_SidebarLayoutProps;
  TableBlock: V4_TableBlockProps;
};

/** Saved document shape for schema version 4. */
export type V4_AvaPageData = Simplify<
  PuckData<V4_PBlockPropsRegistry, V4_AvaPageRootProps>
>;
/** Editor configuration corresponding to schema version 4. */
export type V4_AvaPageConfig = PuckConfig<V4_PBlockPropsRegistry>;
