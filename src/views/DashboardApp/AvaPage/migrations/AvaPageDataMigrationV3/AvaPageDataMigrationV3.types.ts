/**
 * This file contains the types for the AvaPageData v2 and v3.
 *
 * Rules:
 * 1. Do NOT import any types from the rest of the codebase. Consider this file
 *    purely isolated to this module.
 * 2. ONLY import `AvaPageTypes` if this is the migration module for the most
 *    recent version.
 * 3. Once this module no longer represents the most recent version, remove
 *    the `AvaPageTypes` import and manually write out the types.
 */
import type {
  V2_AvaPageData,
  V2_AvaPageRootProps,
  V2_PBlockPropsRegistry,
  V2_VizConfig,
} from "@/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV2/AvaPageDataMigrationV2.types";
import type { Config as PuckConfig, Data as PuckData } from "@puckeditor/core";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";
import type { Simplify } from "type-fest";

export type {
  V2_AvaPageData,
  V2_AvaPageRootProps,
  V2_PBlockPropsRegistry,
  V2_VizConfig,
};

// --- Frozen V3 root props (snapshot at the time V3 was the current
// schema, before the per-viz filter fields were added in V4). ---

type V3_AvaPageRootWidthUnit = "%" | "px";

type V3_RootPadding = "none" | "xs" | "sm" | "md" | "lg" | "xl";

type V3_AvaPageThemeName =
  | "default"
  | "ocean"
  | "forest"
  | "rose"
  | "amber"
  | "graphite";

type V3_AvaPageTypographyName = "system" | "serif" | "mono";

export type V3_AvaPageRootProps = {
  author: string;
  publishedAt: string;
  subtitle: string;
  title: string;
  horizontalPadding: V3_RootPadding;
  verticalPadding: V3_RootPadding;
  containerMaxWidth: {
    unit: V3_AvaPageRootWidthUnit;
    value: number;
  };
  theme: V3_AvaPageThemeName;
  typography: V3_AvaPageTypographyName;
  isAuthorHidden: boolean;
  isPublishedAtHidden: boolean;
  isSubtitleHidden: boolean;
  isTitleHidden: boolean;
  schemaVersion: 3;
};

/**
 * V3 viz config shape. Structurally identical to the current `VizConfig`
 * shipped from `shared/models/vizs/VizConfig`. No v3-to-v4 changes
 * touched the viz config tree. If a future version reshapes vizs, snapshot
 * those types into this module the same way V2 snapshotted its own
 * `V2_VizConfig`.
 */
export type V3_VizConfig = VizConfig;

type V3_NLQuery = {
  prompt: string;
  rawSql: string;
  generations: ReadonlyArray<
    | { prompt: string; rawSql: string; error?: undefined }
    | { prompt: string; rawSql: undefined; error: string }
  >;
};

type V3_DataVizProps = {
  nlQuery: V3_NLQuery;
  vizType: V3_VizConfig["vizType"];
  vizConfig: V3_VizConfig;
};

type V3_FilterProps = {
  filterId: string;
  label: string;
  columnName: string;
  mode: "select_single" | "select_multi" | "contains";
  optionsRaw: string;
  defaultValue: string;
};

// --- Frozen V3 PBlockPropsRegistry. Mirrors V2_PBlockPropsRegistry plus
// the blocks that landed at the V2->V3 boundary or later within V3. ---

type V3_HeadingBlockProps = V2_PBlockPropsRegistry["HeadingBlock"];
type V3_ParagraphBlockProps = V2_PBlockPropsRegistry["ParagraphBlock"];
type V3_QuoteBlockProps = V2_PBlockPropsRegistry["QuoteBlock"];
type V3_DividerBlockProps = V2_PBlockPropsRegistry["DividerBlock"];
type V3_FigureBlockProps = V2_PBlockPropsRegistry["FigureBlock"];
type V3_CalloutBlockProps = V2_PBlockPropsRegistry["CalloutBlock"];
type V3_ListBlockProps = V2_PBlockPropsRegistry["ListBlock"];
type V3_CodeBlockProps = V2_PBlockPropsRegistry["CodeBlock"];
type V3_EmbedBlockProps = V2_PBlockPropsRegistry["EmbedBlock"];
type V3_TableBlockProps = V2_PBlockPropsRegistry["TableBlock"];
type V3_SectionProps = V2_PBlockPropsRegistry["Section"];
type V3_ColumnsProps = V2_PBlockPropsRegistry["Columns"];
type V3_SidebarLayoutProps = V2_PBlockPropsRegistry["SidebarLayout"];
type V3_GridProps = V2_PBlockPropsRegistry["Grid"];
type V3_CardProps = V2_PBlockPropsRegistry["Card"];

export type V3_PBlockPropsRegistry = {
  Card: V3_CardProps;
  CalloutBlock: V3_CalloutBlockProps;
  Columns: V3_ColumnsProps;
  CodeBlock: V3_CodeBlockProps;
  DataViz: V3_DataVizProps;
  DividerBlock: V3_DividerBlockProps;
  EmbedBlock: V3_EmbedBlockProps;
  FigureBlock: V3_FigureBlockProps;
  Filter: V3_FilterProps;
  Grid: V3_GridProps;
  HeadingBlock: V3_HeadingBlockProps;
  ListBlock: V3_ListBlockProps;
  ParagraphBlock: V3_ParagraphBlockProps;
  QuoteBlock: V3_QuoteBlockProps;
  Section: V3_SectionProps;
  SidebarLayout: V3_SidebarLayoutProps;
  TableBlock: V3_TableBlockProps;
};

export type V3_AvaPageData = Simplify<
  PuckData<V3_PBlockPropsRegistry, V3_AvaPageRootProps>
>;
export type V3_AvaPageConfig = PuckConfig<V3_PBlockPropsRegistry>;
