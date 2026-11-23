import { makeArrayWithLength } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import type {
  AvaPageData,
  AvaPageRootProps,
  AvaPageThemeName,
  AvaPageTypographyName,
  RootPadding,
  SectionProps,
  SlotRenderer,
  TableBlockProps,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

/** Narrows untrusted dashboard configuration values to object records. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSlotRenderer(value: unknown): SlotRenderer | undefined {
  return typeof value === "function" ? (value as SlotRenderer) : undefined;
}

/** Renders a dashboard slot when its runtime renderer is available. */
export function renderSlot(
  value: unknown,
  options: Record<string, unknown> = {},
): ReactNode {
  const slot: SlotRenderer | undefined = getSlotRenderer(value);

  return slot ? slot(options) : null;
}

/** Reads the dashboard title stored in Puck root props. */
export function getDashboardTitleFromPuckData(
  data: AvaPageData,
): string | undefined {
  if (!isRecord(data.root.props)) {
    return undefined;
  }

  const title: unknown = (data.root.props as Partial<AvaPageRootProps>).title;

  return typeof title === "string" && title.trim().length > 0
    ? title
    : undefined;
}

/** Reads a string field from untrusted dashboard configuration. */
export function getStringPropFromValue(options: {
  props: unknown;
  key: keyof AvaPageRootProps;
}): string | undefined {
  if (!isRecord(options.props)) {
    return undefined;
  }

  const value: unknown = options.props[options.key];

  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

/** Reads a boolean field from untrusted dashboard configuration. */
export function getBooleanPropFromValue(options: {
  props: unknown;
  key: keyof AvaPageRootProps;
}): boolean | undefined {
  if (!isRecord(options.props)) {
    return undefined;
  }

  const value: unknown = options.props[options.key];

  return typeof value === "boolean" ? value : undefined;
}

const ROOT_PADDING_OPTIONS: readonly RootPadding[] = [
  "none",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
] as const;

/** Reads a supported root padding choice from configuration. */
export function getRootPaddingPropFromValue(options: {
  props: unknown;
  key: keyof Pick<AvaPageRootProps, "horizontalPadding" | "verticalPadding">;
}): RootPadding | undefined {
  if (!isRecord(options.props)) {
    return undefined;
  }

  const value: unknown = options.props[options.key];

  return ROOT_PADDING_OPTIONS.includes(value as RootPadding)
    ? (value as RootPadding)
    : undefined;
}

/** Resolves a root padding choice to its layout value. */
export function getRootPaddingValueFromProp(
  padding: RootPadding,
): 0 | Exclude<RootPadding, "none"> {
  return padding === "none" ? 0 : padding;
}

const THEME_VALUES = new Set<AvaPageThemeName>([
  "default",
  "ocean",
  "forest",
  "rose",
  "amber",
  "graphite",
]);

const TYPOGRAPHY_VALUES = new Set<AvaPageTypographyName>([
  "system",
  "serif",
  "mono",
]);

/** Reads a supported theme preset from dashboard configuration. */
export function getThemePropFromValue(props: unknown): AvaPageThemeName {
  if (!isRecord(props)) {
    return "default";
  }
  const value: unknown = props.theme;
  return THEME_VALUES.has(value as AvaPageThemeName)
    ? (value as AvaPageThemeName)
    : "default";
}

/** Reads a supported typography preset from configuration. */
export function getTypographyPropFromValue(
  props: unknown,
): AvaPageTypographyName {
  if (!isRecord(props)) {
    return "system";
  }
  const value: unknown = props.typography;
  return TYPOGRAPHY_VALUES.has(value as AvaPageTypographyName)
    ? (value as AvaPageTypographyName)
    : "system";
}

/** Resolves an embeddable URL from dashboard configuration. */
export function getEmbedUrlFromValue(url: string): string | undefined {
  const trimmedURL: string = url.trim();

  return trimmedURL.length > 0 ? trimmedURL : undefined;
}

/** Resolves an iframe height from dashboard configuration. */
export function getIframeHeightFromValue(height: number): number {
  if (!Number.isFinite(height)) {
    return 420;
  }

  if (height < 200) {
    return 200;
  }

  if (height > 1200) {
    return 1200;
  }

  return height;
}

/** Resolves a dashboard spacing value from configuration. */
export function getSpacingFromValue(spacing: string): string {
  return spacing === "xs"
    ? "0.5rem"
    : spacing === "sm"
      ? "0.75rem"
      : spacing === "lg"
        ? "1.5rem"
        : "1rem";
}

/** Resolves a dashboard width value from configuration. */
export function getMaxWidthFromValue(
  maxWidth: SectionProps["maxWidth"],
): number | string {
  return maxWidth === "narrow"
    ? 640
    : maxWidth === "wide"
      ? 1200
      : maxWidth === "full"
        ? "100%"
        : 860;
}

/** Constrains a dashboard grid span to its supported range. */
export function clampSpan(span: number): number {
  if (!Number.isFinite(span)) {
    return 6;
  }

  if (span < 1) {
    return 1;
  }

  if (span > 11) {
    return 11;
  }

  return Math.round(span);
}

/** Constrains a dashboard grid column count to its supported range. */
export function clampNumColumns(numColumns: number): number {
  if (!Number.isFinite(numColumns)) {
    return 2;
  }

  if (numColumns < 1) {
    return 1;
  }

  if (numColumns > 12) {
    return 12;
  }

  return Math.round(numColumns);
}

/** Constrains a dashboard grid row count to its supported range. */
export function clampNumRows(numRows: number): number {
  if (!Number.isFinite(numRows)) {
    return 1;
  }

  if (numRows < 1) {
    return 1;
  }

  if (numRows > 12) {
    return 12;
  }

  return Math.round(numRows);
}

/** Builds the slot key for one dashboard grid coordinate. */
export function buildGridCellKeyFromCoordinates(options: {
  colIdx: number;
  rowIdx: number;
}): `r${number}c${number}` {
  return `r${options.rowIdx + 1}c${options.colIdx + 1}`;
}

/** Creates the Puck slot fields for a dashboard grid. */
export function createGridCellSlotFields(
  i18n: I18n,
): Record<`r${number}c${number}`, { label: string; type: "slot" }> {
  return Object.fromEntries(
    makeArrayWithLength(12).flatMap((unusedRow, rowIdx) => {
      return makeArrayWithLength(12).map((unusedCol, colIdx) => {
        void unusedRow;
        void unusedCol;

        const key: `r${number}c${number}` = buildGridCellKeyFromCoordinates({
          colIdx,
          rowIdx,
        });
        const rowNum = rowIdx + 1;
        const colNum = colIdx + 1;

        return [
          key,
          { label: i18n._(msg`Row ${rowNum} / Col ${colNum}`), type: "slot" },
        ] as const;
      });
    }),
  ) as Record<`r${number}c${number}`, { label: string; type: "slot" }>;
}

/** Creates the initial dimensions and slots of a dashboard grid. */
export function createGridDefaultProps(): Record<
  `r${number}c${number}`,
  unknown
> {
  return Object.fromEntries(
    makeArrayWithLength(12).flatMap((unusedRow, rowIdx) => {
      return makeArrayWithLength(12).map((unusedCol, colIdx) => {
        void unusedRow;
        void unusedCol;

        const key: `r${number}c${number}` = buildGridCellKeyFromCoordinates({
          colIdx,
          rowIdx,
        });

        return [key, []] as const;
      });
    }),
  ) as Record<`r${number}c${number}`, unknown>;
}

/** Constrains a grid span to the available column count. */
export function clampSpanWithinColumns(options: {
  numColumns: number;
  span: number;
}): number {
  const numColumns: number = clampNumColumns(options.numColumns);
  const maxSpan: number = Math.max(1, numColumns);
  const span: number = Math.round(options.span);

  if (!Number.isFinite(span)) {
    return Math.min(6, maxSpan);
  }

  if (span < 1) {
    return 1;
  }

  if (span > maxSpan) {
    return maxSpan;
  }

  return span;
}

/** Builds CSS grid tracks for the configured dashboard columns. */
export function buildGridTemplateColumnsFromCount(options: {
  leftSpan: number;
  rightSpan: number;
}): string {
  const leftSpan: number = clampSpan(options.leftSpan);
  const rightSpan: number = clampSpan(options.rightSpan);

  return `${leftSpan}fr ${rightSpan}fr`;
}

/** Parses delimited dashboard table text into display rows. */
export function getTableRowsFromText(options: {
  data: string;
  delimiter: TableBlockProps["delimiter"];
}): ReadonlyArray<readonly string[]> {
  const delimiterValue: string =
    options.delimiter === "tab"
      ? "\t"
      : options.delimiter === "pipe"
        ? "|"
        : ",";

  return options.data
    .split("\n")
    .map((line) => {
      return line.trim();
    })
    .filter((line) => {
      return line.length > 0;
    })
    .map((line) => {
      return line
        .split(delimiterValue)
        .map((cell) => {
          return cell.trim();
        })
        .filter((cell) => {
          return cell.length > 0;
        });
    })
    .filter((row) => {
      return row.length > 0;
    });
}
