import { ReactNode } from "react";
import type { DataVizProps } from "./DataViz";
import type { Config as PuckConfig, Data as PuckData } from "@puckeditor/core";

export type SlotRenderer = (options?: unknown) => ReactNode;

export type HeadingBlockProps = {
  align: "left" | "center" | "right";
  level: 1 | 2 | 3 | 4;
  text: string;
};

export type ParagraphBlockProps = {
  align: "left" | "center" | "right";
  text: string;
};

export type QuoteBlockProps = {
  cite: string;
  quote: string;
};

export type DividerBlockProps = Record<string, never>;

export type FigureBlockProps = {
  alt: string;
  caption: string;
  src: string;
};

export type CalloutBlockProps = {
  body: string;
  title: string;
  tone: "info" | "warning" | "neutral";
};

export type ListBlockProps = {
  items: ReadonlyArray<{ text: string }>;
  type: "ordered" | "unordered";
};

export type CodeBlockProps = {
  code: string;
  language: string;
};

export type EmbedBlockProps = {
  height: number;
  title: string;
  url: string;
};

export type TableBlockProps = {
  data: string;
  delimiter: "comma" | "tab" | "pipe";
  hasHeader: boolean;
};

export type SectionProps = {
  background: "none" | "subtle";
  content: unknown;
  maxWidth: "narrow" | "normal" | "wide" | "full";
  padding: "sm" | "md" | "lg";
};

export type ColumnsProps = {
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

export type SidebarLayoutProps = {
  collapseAt: "sm" | "md" | "lg";
  gap: "xs" | "sm" | "md" | "lg";
  main: unknown;
  sidebar: unknown;
  sidebarPosition: "left" | "right";
  sidebarSpan: number;
};

export type GridProps = {
  gap: "xs" | "sm" | "md" | "lg";
  numColumns: number;
  numRows: number;
} & Record<`r${number}c${number}`, unknown>;

export type CardProps = {
  content: unknown;
  title: string;
};

export type DashboardRootTextProps = {
  author: string;
  publishedAt: string;
  subtitle: string;
  title: string;
};

export type RootPadding = "none" | "xs" | "sm" | "md" | "lg" | "xl";

export type DashboardRootLayoutProps = {
  horizontalPadding: RootPadding;
  verticalPadding: RootPadding;
};

export type DashboardRootVisibilityProps = {
  isAuthorHidden: boolean;
  isPublishedAtHidden: boolean;
  isSubtitleHidden: boolean;
  isTitleHidden: boolean;
};

export type DashboardRootProps = DashboardRootTextProps &
  DashboardRootLayoutProps &
  DashboardRootVisibilityProps;

type DashboardPuckComponents = {
  Card: CardProps;
  CalloutBlock: CalloutBlockProps;
  Columns: ColumnsProps;
  CodeBlock: CodeBlockProps;
  DataViz: DataVizProps;
  DividerBlock: DividerBlockProps;
  EmbedBlock: EmbedBlockProps;
  FigureBlock: FigureBlockProps;
  Grid: GridProps;
  HeadingBlock: HeadingBlockProps;
  ListBlock: ListBlockProps;
  ParagraphBlock: ParagraphBlockProps;
  QuoteBlock: QuoteBlockProps;
  Section: SectionProps;
  SidebarLayout: SidebarLayoutProps;
  TableBlock: TableBlockProps;
};

export type DashboardPuckData = PuckData<DashboardPuckComponents>;
export type DashboardPuckConfig = PuckConfig<DashboardPuckComponents>;
