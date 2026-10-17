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

export type {
  V3_AvaPageData,
  V3_AvaPageRootProps,
  V3_PBlockPropsRegistry,
  V3_VizConfig,
};

type V4_AvaPageRootWidthUnit = "%" | "px";

type V4_RootPadding = "none" | "xs" | "sm" | "md" | "lg" | "xl";

type V4_AvaPageThemeName =
  | "default"
  | "ocean"
  | "forest"
  | "rose"
  | "amber"
  | "graphite";

type V4_AvaPageTypographyName = "system" | "serif" | "mono";

export type V4_AvaPageRootProps = {
  author: string;
  publishedAt: string;
  subtitle: string;
  title: string;
  horizontalPadding: V4_RootPadding;
  verticalPadding: V4_RootPadding;
  containerMaxWidth: {
    unit: V4_AvaPageRootWidthUnit;
    value: number;
  };
  theme: V4_AvaPageThemeName;
  typography: V4_AvaPageTypographyName;
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

type V4_XYSeries =
  | {
      renderAs: "bar";
      key: string;
      label?: string;
      color?: string;
      fillOpacity?: number;
      stackId?: string;
    }
  | {
      renderAs: "line";
      key: string;
      label?: string;
      color?: string;
      curveType?: V4_CurveType;
      strokeWidth?: number;
      withDots?: boolean;
    }
  | {
      renderAs: "area";
      key: string;
      label?: string;
      color?: string;
      curveType?: V4_CurveType;
      strokeWidth?: number;
      fillOpacity?: number;
      withDots?: boolean;
    };

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

export type V4_VizConfig =
  | { vizType: "table" }
  | {
      vizType: "bar";
      xAxisKey: string | undefined;
      series: V4_XYSeries[];
      layout: "group" | "stack" | "percent";
      withLegend: boolean;
      chartStyle?: V4_ChartStyle;
    }
  | {
      vizType: "line";
      xAxisKey: string | undefined;
      series: V4_XYSeries[];
      withLegend: boolean;
      chartStyle?: V4_ChartStyle;
    }
  | {
      vizType: "area";
      xAxisKey: string | undefined;
      series: V4_XYSeries[];
      layout: "default" | "stacked" | "percent" | "split";
      withLegend: boolean;
      chartStyle?: V4_ChartStyle;
    }
  | {
      vizType: "scatter";
      series: V4_ScatterSeries[];
      chartStyle?: V4_ChartStyle;
    }
  | {
      vizType: "pie";
      nameKey: string | undefined;
      valueKey: string | undefined;
      isDonut: boolean;
      withLabels: boolean;
      labelsType: "value" | "percent";
      seriesColors?: Record<string, string>;
    }
  | {
      vizType: "funnel";
      nameKey: string | undefined;
      valueKey: string | undefined;
      seriesColors?: Record<string, string>;
    }
  | {
      vizType: "radar";
      nameKey: string | undefined;
      series: V4_RadarSeries[];
      withLegend?: boolean;
      chartStyle?: V4_ChartStyle;
    }
  | {
      vizType: "bubble";
      series: Array<V4_ScatterSeries & { sizeKey: string }>;
      chartStyle?: V4_ChartStyle;
    };

type V4_NLQuery = {
  prompt: string;
  rawSql: string;
  generations: ReadonlyArray<
    | { prompt: string; rawSql: string; error?: undefined }
    | { prompt: string; rawSql: undefined; error: string }
  >;
};

type V4_DataVizProps = {
  nlQuery: V4_NLQuery;
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

export type V4_AvaPageData = Simplify<
  PuckData<V4_PBlockPropsRegistry, V4_AvaPageRootProps>
>;
export type V4_AvaPageConfig = PuckConfig<V4_PBlockPropsRegistry>;
