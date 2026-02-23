/**
 * This file contains the types for the previous dashboard config version
 * and the current version.
 *
 * Rules:
 * 1. Do NOT import any types from the rest of the codebase. Consider this file
 *    purely isolated to this module.
 * 2. ONLY import `DashboardPuckConfig` if this is migration module for the most
 *    recent version.
 * 3. When this migration module stops being the most recent version, remove the
 *    the import and manually write out the types.
 *
 * We reduce imports here to avoid long import chains of legacy code and so we
 * can keep a statically readable history of each version's types.
 */
import type {
  DashboardBlockProps,
  DashboardPuckData,
  DashboardRootProps,
} from "../../DashboardPuck.types";

export type V0_DashboardRootProps = {
  author: string;
  publishedAt: string;
  subtitle: string;
  title: string;
  horizontalPadding: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  verticalPadding: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  containerMaxWidth: {
    unit: "%" | "px";
    value: number;
  };
  isAuthorHidden: boolean;
  isPublishedAtHidden: boolean;
  isSubtitleHidden: boolean;
  isTitleHidden: boolean;
};

export type V0_DashboardBlocksProps = {
  Card: {
    content: unknown;
    title: string;
  };
  CalloutBlock: {
    body: string;
    title: string;
    tone: "info" | "warning" | "neutral";
  };
  Columns: {
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
  CodeBlock: {
    code: string;
    language: string;
  };
  DataViz: {
    sql: string;
    prompt: string;
    generateSqlRequestId: string;
    sqlError: string;
    sqlGeneratedFromPrompt: string;
  };
  DividerBlock: Record<string, never>;
  EmbedBlock: {
    height: number;
    title: string;
    url: string;
  };
  FigureBlock: {
    alt: string;
    caption: string;
    src: string;
  };
  Grid: {
    gap: "xs" | "sm" | "md" | "lg";
    numColumns: number;
    numRows: number;
  } & Record<`r${number}c${number}`, unknown>;
  HeadingBlock: {
    align: "left" | "center" | "right";
    level: 1 | 2 | 3 | 4;
    text: string;
  };
  ListBlock: {
    items: ReadonlyArray<{ text: string }>;
    type: "ordered" | "unordered";
  };
  ParagraphBlock: {
    align: "left" | "center" | "right";
    text: string;
  };
  QuoteBlock: {
    cite: string;
    quote: string;
  };
  Section: {
    background: "none" | "subtle";
    content: unknown;
    maxWidth: "narrow" | "normal" | "wide" | "full";
    padding: "sm" | "md" | "lg";
  };
  SidebarLayout: {
    collapseAt: "sm" | "md" | "lg";
    gap: "xs" | "sm" | "md" | "lg";
    main: unknown;
    sidebar: unknown;
    sidebarPosition: "left" | "right";
    sidebarSpan: number;
  };
  TableBlock: {
    data: string;
    delimiter: "comma" | "tab" | "pipe";
    hasHeader: boolean;
  };
};

export type V0_DashboardData = {
  root: {
    props?: V0_DashboardRootProps;
  };
  content: Array<
    {
      [K in keyof V0_DashboardBlocksProps]: {
        type: K;
        props: { id: string } & V0_DashboardBlocksProps[K];
      };
    }[keyof V0_DashboardBlocksProps]
  >;
};

export type V1_DashboardRootProps = DashboardRootProps;
export type V1_DashboardBlocksProps = DashboardBlockProps;
export type V1_DashboardData = DashboardPuckData;
