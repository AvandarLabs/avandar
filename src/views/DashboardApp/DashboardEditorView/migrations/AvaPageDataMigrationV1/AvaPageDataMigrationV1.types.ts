/**
 * This file contains the types for the AvaPageData v0 and v1.
 *
 * Rules:
 * 1. Do NOT import any types from the rest of the codebase. Consider this file
 *    purely isolated to this module.
 * 2. ONLY import `AvaPageTypes` if this is the migration module for the most
 *    recent version.
 * 3. Once this module no longer represents the most recent version, remove
 *    the `AvaPageTypes` import and manually write out the types.
 *
 * Reasoning:
 * - We want to keep a statically readable history of each version's types so
 *   different versions can be individually referenced and tested.
 * - Avoid long import chains of legacy code.
 * - We want to allow the most current AvaPage types to change freely without
 *   raising type errors in tests or migration code for older versions.
 */
import type { AvaPageTypes } from "../../AvaPage.types";

export type V0_AvaPageRootProps = {
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

export type V0_PBlockPropsRegistry = {
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

export type V0_AvaPageData = {
  root: {
    props?: V0_AvaPageRootProps;
  };
  content: Array<
    {
      [K in keyof V0_PBlockPropsRegistry]: {
        type: K;
        props: { id: string } & V0_PBlockPropsRegistry[K];
      };
    }[keyof V0_PBlockPropsRegistry]
  >;
};

export type V1_AvaPageRootProps = AvaPageTypes["RootProps"];
export type V1_PBlockPropsRegistry = AvaPageTypes["PBlockPropsRegistry"];
export type V1_AvaPageData = AvaPageTypes["Data"];
