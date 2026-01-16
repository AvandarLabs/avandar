import {
  Blockquote,
  Box,
  Divider,
  Image,
  List,
  Table as MantineTable,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Puck } from "@puckeditor/core";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import { Paper } from "@/lib/ui/Paper";
import type { DashboardRead } from "@/models/Dashboard/Dashboard.types";
import type { Config, Data as PuckData } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notifySuccess } from "@/lib/ui/notifications/notify";
import { DataViz } from "./DataViz";
import { GenerateSQLButtonField } from "./GenerateSQLButtonField";
import { generateSQLFromPrompt } from "./generateSQLFromPrompt";
import type { DataVizProps } from "./DataViz";
import type { ReactNode } from "react";

type Props = {
  readonly dashboard: DashboardRead | undefined;
};

type SlotRenderer = (options?: unknown) => ReactNode;

type HeadingBlockProps = {
  align: "left" | "center" | "right";
  level: 1 | 2 | 3 | 4;
  text: string;
};

type ParagraphBlockProps = {
  align: "left" | "center" | "right";
  text: string;
};

type QuoteBlockProps = {
  cite: string;
  quote: string;
};

type DividerBlockProps = Record<string, never>;

type FigureBlockProps = {
  alt: string;
  caption: string;
  src: string;
};

type CalloutBlockProps = {
  body: string;
  title: string;
  tone: "info" | "warning" | "neutral";
};

type ListBlockProps = {
  items: ReadonlyArray<{ text: string }>;
  type: "ordered" | "unordered";
};

type CodeBlockProps = {
  code: string;
  language: string;
};

type EmbedBlockProps = {
  height: number;
  title: string;
  url: string;
};

type TableBlockProps = {
  data: string;
  delimiter: "comma" | "tab" | "pipe";
  hasHeader: boolean;
};

type SectionProps = {
  background: "none" | "subtle";
  content: unknown;
  maxWidth: "narrow" | "normal" | "wide" | "full";
  padding: "sm" | "md" | "lg";
};

type ColumnsProps = {
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

type SidebarLayoutProps = {
  collapseAt: "sm" | "md" | "lg";
  gap: "xs" | "sm" | "md" | "lg";
  main: unknown;
  sidebar: unknown;
  sidebarPosition: "left" | "right";
  sidebarSpan: number;
};

type GridProps = {
  gap: "xs" | "sm" | "md" | "lg";
  numColumns: number;
  numRows: number;
} & Record<`r${number}c${number}`, unknown>;

type CardProps = {
  content: unknown;
  title: string;
};

type DashboardRootTextProps = {
  author: string;
  publishedAt: string;
  subtitle: string;
  title: string;
};

type RootPadding = "none" | "xs" | "sm" | "md" | "lg" | "xl";

type DashboardRootLayoutProps = {
  horizontalPadding: RootPadding;
  verticalPadding: RootPadding;
};

type DashboardRootVisibilityProps = {
  isAuthorHidden: boolean;
  isPublishedAtHidden: boolean;
  isSubtitleHidden: boolean;
  isTitleHidden: boolean;
};

type DashboardRootProps = DashboardRootTextProps &
  DashboardRootLayoutProps &
  DashboardRootVisibilityProps;

type DashboardPuckData = PuckData<{
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
}>;

const EMPTY_DATA: DashboardPuckData = {
  root: { props: {} },
  content: [],
};

function _isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function _getSlotRenderer(value: unknown): SlotRenderer | undefined {
  return typeof value === "function" ? (value as SlotRenderer) : undefined;
}

function _renderSlot(
  value: unknown,
  options: Record<string, unknown> = {},
): ReactNode {
  const slot: SlotRenderer | undefined = _getSlotRenderer(value);

  return slot ? slot(options) : null;
}

function _getDashboardTitleFromPuckData(
  data: DashboardPuckData,
): string | undefined {
  if (!_isRecord(data.root.props)) {
    return undefined;
  }

  const title: unknown = (data.root.props as Partial<DashboardRootProps>).title;

  return typeof title === "string" && title.trim().length > 0 ?
      title
    : undefined;
}

function _withDashboardTitle(options: {
  data: DashboardPuckData;
  title: string;
}): DashboardPuckData {
  return {
    ...options.data,
    root: {
      ...options.data.root,
      props: {
        ...(options.data.root.props ?? {}),
        title: options.title,
      },
    },
  };
}

function _getStringProp(options: {
  props: unknown;
  key: keyof DashboardRootTextProps;
}): string | undefined {
  if (!_isRecord(options.props)) {
    return undefined;
  }

  const value: unknown = options.props[options.key];

  return typeof value === "string" && value.trim().length > 0 ?
      value
    : undefined;
}

function _getBooleanProp(options: {
  props: unknown;
  key: keyof DashboardRootVisibilityProps;
}): boolean | undefined {
  if (!_isRecord(options.props)) {
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

function _getRootPaddingProp(options: {
  props: unknown;
  key: keyof Pick<
    DashboardRootLayoutProps,
    "horizontalPadding" | "verticalPadding"
  >;
}): RootPadding | undefined {
  if (!_isRecord(options.props)) {
    return undefined;
  }

  const value: unknown = options.props[options.key];

  return ROOT_PADDING_OPTIONS.includes(value as RootPadding) ?
      (value as RootPadding)
    : undefined;
}

function _getRootPaddingValue(
  padding: RootPadding,
): 0 | Exclude<RootPadding, "none"> {
  return padding === "none" ? 0 : padding;
}

function _getEmbedURL(url: string): string | undefined {
  const trimmedURL: string = url.trim();

  return trimmedURL.length > 0 ? trimmedURL : undefined;
}

function _getIframeHeight(height: number): number {
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

function _getSpacingValue(spacing: string): string {
  return (
    spacing === "xs" ? "0.5rem"
    : spacing === "sm" ? "0.75rem"
    : spacing === "lg" ? "1.5rem"
    : "1rem"
  );
}

function _getMaxWidthValue(
  maxWidth: SectionProps["maxWidth"],
): number | string {
  return (
    maxWidth === "narrow" ? 640
    : maxWidth === "wide" ? 1200
    : maxWidth === "full" ? "100%"
    : 860
  );
}

function _clampSpan(span: number): number {
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

function _clampNumColumns(numColumns: number): number {
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

function _clampNumRows(numRows: number): number {
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

function _getGridCellKey(options: {
  colIdx: number;
  rowIdx: number;
}): `r${number}c${number}` {
  return `r${options.rowIdx + 1}c${options.colIdx + 1}`;
}

function _createGridCellSlotFields(): Record<
  `r${number}c${number}`,
  { label: string; type: "slot" }
> {
  return Object.fromEntries(
    Array.from({ length: 12 }).flatMap((unusedRow, rowIdx) => {
      return Array.from({ length: 12 }).map((unusedCol, colIdx) => {
        void unusedRow;
        void unusedCol;

        const key: `r${number}c${number}` = _getGridCellKey({ colIdx, rowIdx });

        return [
          key,
          { label: `Row ${rowIdx + 1} / Col ${colIdx + 1}`, type: "slot" },
        ] as const;
      });
    }),
  ) as Record<`r${number}c${number}`, { label: string; type: "slot" }>;
}

function _createGridDefaultProps(): Record<`r${number}c${number}`, unknown> {
  return Object.fromEntries(
    Array.from({ length: 12 }).flatMap((unusedRow, rowIdx) => {
      return Array.from({ length: 12 }).map((unusedCol, colIdx) => {
        void unusedRow;
        void unusedCol;

        const key: `r${number}c${number}` = _getGridCellKey({ colIdx, rowIdx });

        return [key, []] as const;
      });
    }),
  ) as Record<`r${number}c${number}`, unknown>;
}

function _clampSpanWithinColumns(options: {
  numColumns: number;
  span: number;
}): number {
  const numColumns: number = _clampNumColumns(options.numColumns);
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

function _getGridTemplateColumns(options: {
  leftSpan: number;
  rightSpan: number;
}): string {
  const leftSpan: number = _clampSpan(options.leftSpan);
  const rightSpan: number = _clampSpan(options.rightSpan);

  return `${leftSpan}fr ${rightSpan}fr`;
}

function _parseTableRows(options: {
  data: string;
  delimiter: TableBlockProps["delimiter"];
}): ReadonlyArray<readonly string[]> {
  const delimiterValue: string =
    options.delimiter === "tab" ? "\t"
    : options.delimiter === "pipe" ? "|"
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

function _getInitialPuckData(options: {
  dashboard: DashboardRead;
}): DashboardPuckData {
  const config: unknown = options.dashboard.config;
  const dashboardTitle: string = options.dashboard.name;

  if (
    _isRecord(config) &&
    _isRecord(config.root) &&
    _isRecord(config.root.props) &&
    Array.isArray(config.content)
  ) {
    const dataFromBackend: DashboardPuckData = config as DashboardPuckData;

    return _getDashboardTitleFromPuckData(dataFromBackend) ? dataFromBackend : (
        _withDashboardTitle({
          data: dataFromBackend,
          title: dashboardTitle,
        })
      );
  }

  return _withDashboardTitle({
    data: EMPTY_DATA,
    title: dashboardTitle,
  });
}

function _getPuckConfig(options: {
  dashboardTitle: string;
  workspaceId: DashboardRead["workspaceId"] | undefined;
}): Config<{
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
}> {
  return {
    root: {
      fields: {
        title: {
          label: "Page title",
          type: "text",
        },
        isTitleHidden: {
          label: "Hide title",
          type: "radio",
          options: [
            { label: "No", value: false },
            { label: "Yes", value: true },
          ],
        },
        subtitle: {
          label: "Subtitle",
          type: "text",
        },
        isSubtitleHidden: {
          label: "Hide subtitle",
          type: "radio",
          options: [
            { label: "No", value: false },
            { label: "Yes", value: true },
          ],
        },
        author: {
          label: "Author",
          type: "text",
        },
        isAuthorHidden: {
          label: "Hide author",
          type: "radio",
          options: [
            { label: "No", value: false },
            { label: "Yes", value: true },
          ],
        },
        publishedAt: {
          label: "Published Date",
          type: "text",
        },
        isPublishedAtHidden: {
          label: "Hide published date",
          type: "radio",
          options: [
            { label: "No", value: false },
            { label: "Yes", value: true },
          ],
        },
        verticalPadding: {
          label: "Vertical padding",
          type: "select",
          options: [
            { label: "None", value: "none" },
            { label: "XS", value: "xs" },
            { label: "SM", value: "sm" },
            { label: "MD", value: "md" },
            { label: "LG", value: "lg" },
            { label: "XL", value: "xl" },
          ],
        },
        horizontalPadding: {
          label: "Horizontal padding",
          type: "select",
          options: [
            { label: "None", value: "none" },
            { label: "XS", value: "xs" },
            { label: "SM", value: "sm" },
            { label: "MD", value: "md" },
            { label: "LG", value: "lg" },
            { label: "XL", value: "xl" },
          ],
        },
      },
      defaultProps: {
        author: "",
        horizontalPadding: "md",
        isAuthorHidden: false,
        isPublishedAtHidden: false,
        isSubtitleHidden: false,
        isTitleHidden: false,
        publishedAt: "",
        subtitle: "",
        title: options.dashboardTitle,
        verticalPadding: "lg",
      },
      render: (props) => {
        const isTitleHidden: boolean =
          _getBooleanProp({ props, key: "isTitleHidden" }) ?? false;
        const isSubtitleHidden: boolean =
          _getBooleanProp({ props, key: "isSubtitleHidden" }) ?? false;
        const isAuthorHidden: boolean =
          _getBooleanProp({ props, key: "isAuthorHidden" }) ?? false;
        const isPublishedAtHidden: boolean =
          _getBooleanProp({ props, key: "isPublishedAtHidden" }) ?? false;

        const verticalPadding: RootPadding =
          _getRootPaddingProp({ props, key: "verticalPadding" }) ?? "lg";
        const horizontalPadding: RootPadding =
          _getRootPaddingProp({ props, key: "horizontalPadding" }) ?? "md";

        const title: string =
          _getStringProp({ props, key: "title" }) ?? "Untitled";
        const subtitle: string | undefined = _getStringProp({
          props,
          key: "subtitle",
        });
        const author: string | undefined = _getStringProp({
          props,
          key: "author",
        });
        const publishedAt: string | undefined = _getStringProp({
          props,
          key: "publishedAt",
        });

        const visibleSubtitle: string | undefined =
          isSubtitleHidden ? undefined : subtitle;
        const visibleAuthor: string | undefined =
          isAuthorHidden ? undefined : author;
        const visiblePublishedAt: string | undefined =
          isPublishedAtHidden ? undefined : publishedAt;

        const children: ReactNode | undefined = (
          props as {
            children?: ReactNode;
          }
        ).children;

        const bylineParts: readonly string[] = [
          visibleAuthor,
          visiblePublishedAt,
        ].filter((value): value is string => {
          return value !== undefined;
        });

        const byline: string | undefined =
          bylineParts.length > 0 ? bylineParts.join(" • ") : undefined;

        return (
          <Stack
            maw={860}
            mx="auto"
            py={_getRootPaddingValue(verticalPadding)}
            px={_getRootPaddingValue(horizontalPadding)}
            gap="lg"
          >
            <Stack gap={6}>
              {isTitleHidden ? null : <Title order={1}>{title}</Title>}
              {visibleSubtitle ?
                <Text c="dimmed" fz="lg">
                  {visibleSubtitle}
                </Text>
              : null}
              {byline ?
                <Text c="dimmed" fz="sm">
                  {byline}
                </Text>
              : null}
            </Stack>
            {children}
          </Stack>
        );
      },
    },
    categories: {
      layout: {
        title: "Layout",
        defaultExpanded: true,
        components: ["Section", "Columns", "Grid", "SidebarLayout"],
      },
      content: {
        title: "Content",
        defaultExpanded: true,
        components: [
          "DataViz",
          "Card",
          "CalloutBlock",
          "CodeBlock",
          "HeadingBlock",
          "ParagraphBlock",
          "ListBlock",
          "QuoteBlock",
          "TableBlock",
          "DividerBlock",
        ],
      },
      media: {
        title: "Media",
        components: ["FigureBlock", "EmbedBlock"],
      },
    },
    components: {
      Section: {
        label: "Layout / Section",
        fields: {
          maxWidth: {
            label: "Max width",
            type: "select",
            options: [
              { label: "Narrow", value: "narrow" },
              { label: "Normal", value: "normal" },
              { label: "Wide", value: "wide" },
              { label: "Full", value: "full" },
            ],
          },
          padding: {
            label: "Padding",
            type: "select",
            options: [
              { label: "Small", value: "sm" },
              { label: "Medium", value: "md" },
              { label: "Large", value: "lg" },
            ],
          },
          background: {
            label: "Background",
            type: "select",
            options: [
              { label: "None", value: "none" },
              { label: "Subtle", value: "subtle" },
            ],
          },
          content: {
            label: "Content",
            type: "slot",
          },
        },
        defaultProps: {
          background: "none",
          content: [],
          maxWidth: "normal",
          padding: "md",
        },
        render: (props) => {
          const maxWidth: number | string = _getMaxWidthValue(props.maxWidth);

          return (
            <Box
              mx="auto"
              maw={maxWidth}
              py={props.padding}
              px="md"
              bg={props.background === "subtle" ? "gray.0" : undefined}
            >
              <Stack gap="md">{_renderSlot(props.content)}</Stack>
            </Box>
          );
        },
      },
      Columns: {
        label: "Layout / Columns",
        fields: {
          numColumns: {
            label: "Number of columns",
            type: "number",
            min: 1,
            max: 12,
            step: 1,
          },
          leftSpan: {
            label: "Left span",
            type: "number",
            min: 1,
            max: 12,
            step: 1,
          },
          rightSpan: {
            label: "Right span",
            type: "number",
            min: 1,
            max: 12,
            step: 1,
          },
          gap: {
            label: "Gap",
            type: "select",
            options: [
              { label: "XS", value: "xs" },
              { label: "SM", value: "sm" },
              { label: "MD", value: "md" },
              { label: "LG", value: "lg" },
            ],
          },
          collapseAt: {
            label: "Collapse at",
            type: "select",
            options: [
              { label: "SM", value: "sm" },
              { label: "MD", value: "md" },
              { label: "LG", value: "lg" },
            ],
          },
          col1: {
            label: "Column 1",
            type: "slot",
          },
          col2: {
            label: "Column 2",
            type: "slot",
          },
          col3: {
            label: "Column 3",
            type: "slot",
          },
          col4: {
            label: "Column 4",
            type: "slot",
          },
          col5: {
            label: "Column 5",
            type: "slot",
          },
          col6: {
            label: "Column 6",
            type: "slot",
          },
          col7: {
            label: "Column 7",
            type: "slot",
          },
          col8: {
            label: "Column 8",
            type: "slot",
          },
          col9: {
            label: "Column 9",
            type: "slot",
          },
          col10: {
            label: "Column 10",
            type: "slot",
          },
          col11: {
            label: "Column 11",
            type: "slot",
          },
          col12: {
            label: "Column 12",
            type: "slot",
          },
        },
        defaultProps: {
          collapseAt: "md",
          gap: "md",
          numColumns: 2,
          col1: [],
          col2: [],
          col3: [],
          col4: [],
          col5: [],
          col6: [],
          col7: [],
          col8: [],
          col9: [],
          col10: [],
          col11: [],
          col12: [],
        },
        render: (props) => {
          const gap: string = _getSpacingValue(props.gap);
          const numColumns: number = _clampNumColumns(props.numColumns);
          const leftSpan: number = _clampSpanWithinColumns({
            numColumns,
            span: props.leftSpan ?? 1,
          });
          const rightSpanUpperBound: number = Math.max(
            1,
            numColumns - (leftSpan - 1),
          );
          const rightSpan: number = Math.min(
            _clampSpanWithinColumns({
              numColumns,
              span: props.rightSpan ?? 1,
            }),
            rightSpanUpperBound,
          );
          const numVisibleColumns: number =
            numColumns - (leftSpan - 1) - (rightSpan - 1);
          const allColumns = [
            props.col1,
            props.col2,
            props.col3,
            props.col4,
            props.col5,
            props.col6,
            props.col7,
            props.col8,
            props.col9,
            props.col10,
            props.col11,
            props.col12,
          ] as const;
          const columnsToRender = allColumns.slice(0, numVisibleColumns);

          return (
            <Box
              display={{ base: "flex", [props.collapseAt]: "grid" }}
              style={{
                flexDirection: "column",
                gap,
                gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`,
              }}
            >
              {columnsToRender.map((col, idx) => {
                const span: number =
                  numVisibleColumns === 1 ? numColumns
                  : idx === 0 ? leftSpan
                  : idx === numVisibleColumns - 1 ? rightSpan
                  : 1;

                return (
                  <Stack
                    key={idx}
                    gap="md"
                    style={{ gridColumn: `span ${span}` }}
                  >
                    {_renderSlot(col, { minEmptyHeight: 160 })}
                  </Stack>
                );
              })}
            </Box>
          );
        },
      },
      SidebarLayout: {
        label: "Layout / Sidebar layout",
        fields: {
          sidebarPosition: {
            label: "Sidebar position",
            type: "radio",
            options: [
              { label: "Left", value: "left" },
              { label: "Right", value: "right" },
            ],
          },
          sidebarSpan: {
            label: "Sidebar span",
            type: "number",
            min: 2,
            max: 10,
            step: 1,
          },
          gap: {
            label: "Gap",
            type: "select",
            options: [
              { label: "XS", value: "xs" },
              { label: "SM", value: "sm" },
              { label: "MD", value: "md" },
              { label: "LG", value: "lg" },
            ],
          },
          collapseAt: {
            label: "Collapse at",
            type: "select",
            options: [
              { label: "SM", value: "sm" },
              { label: "MD", value: "md" },
              { label: "LG", value: "lg" },
            ],
          },
          sidebar: {
            label: "Sidebar",
            type: "slot",
          },
          main: {
            label: "Main",
            type: "slot",
          },
        },
        defaultProps: {
          collapseAt: "md",
          gap: "lg",
          main: [],
          sidebar: [],
          sidebarPosition: "right",
          sidebarSpan: 4,
        },
        render: (props) => {
          const sidebarSpan: number = _clampSpan(props.sidebarSpan);
          const mainSpan: number = 12 - sidebarSpan;
          const gap: string = _getSpacingValue(props.gap);

          const first:
            | { content: unknown; key: "sidebar" | "main" }
            | { content: unknown; key: "sidebar" | "main" } =
            props.sidebarPosition === "left" ?
              { key: "sidebar", content: props.sidebar }
            : { key: "main", content: props.main };

          const second:
            | { content: unknown; key: "sidebar" | "main" }
            | { content: unknown; key: "sidebar" | "main" } =
            props.sidebarPosition === "left" ?
              { key: "main", content: props.main }
            : { key: "sidebar", content: props.sidebar };

          return (
            <>
              <Box
                display="grid"
                style={{
                  gap,
                  gridTemplateColumns:
                    props.sidebarPosition === "left" ?
                      _getGridTemplateColumns({
                        leftSpan: sidebarSpan,
                        rightSpan: mainSpan,
                      })
                    : _getGridTemplateColumns({
                        leftSpan: mainSpan,
                        rightSpan: sidebarSpan,
                      }),
                }}
                visibleFrom={props.collapseAt}
              >
                <Stack gap="md">{_renderSlot(first.content)}</Stack>
                <Stack gap="md">{_renderSlot(second.content)}</Stack>
              </Box>

              <Stack gap="md" hiddenFrom={props.collapseAt}>
                {_renderSlot(props.main)}
                {_renderSlot(props.sidebar)}
              </Stack>
            </>
          );
        },
      },
      Grid: {
        label: "Layout / Grid",
        fields: {
          numColumns: {
            label: "Number of columns",
            type: "number",
            min: 1,
            max: 12,
            step: 1,
          },
          numRows: {
            label: "Number of rows",
            type: "number",
            min: 1,
            max: 12,
            step: 1,
          },
          gap: {
            label: "Gap",
            type: "select",
            options: [
              { label: "XS", value: "xs" },
              { label: "SM", value: "sm" },
              { label: "MD", value: "md" },
              { label: "LG", value: "lg" },
            ],
          },
          ..._createGridCellSlotFields(),
        },
        defaultProps: {
          gap: "md",
          numColumns: 3,
          numRows: 2,
          ..._createGridDefaultProps(),
        },
        render: (props) => {
          const gap: string = _getSpacingValue(props.gap);
          const numColumns: number = _clampNumColumns(props.numColumns);
          const numRows: number = _clampNumRows(props.numRows);

          return (
            <Stack gap={gap}>
              {Array.from({ length: numRows }).map((unusedRow, rowIdx) => {
                void unusedRow;

                return (
                  <Box
                    key={rowIdx}
                    display="grid"
                    style={{
                      gap,
                      gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.from({ length: numColumns }).map(
                      (unusedCol, colIdx) => {
                        void unusedCol;

                        const key: `r${number}c${number}` = _getGridCellKey({
                          colIdx,
                          rowIdx,
                        });
                        const cell: unknown = props[key];

                        return (
                          <Stack key={colIdx} gap="md">
                            {_renderSlot(cell, { minEmptyHeight: 160 })}
                          </Stack>
                        );
                      },
                    )}
                  </Box>
                );
              })}
            </Stack>
          );
        },
      },
      Card: {
        label: "Card",
        fields: {
          title: {
            label: "Title",
            type: "text",
          },
          content: {
            label: "Content",
            type: "slot",
            disallow: ["Card"],
          },
        },
        defaultProps: {
          content: [],
          title: "Card",
        },
        render: (props) => {
          return (
            <Paper p="md">
              <Stack gap="sm">
                {props.title.trim().length > 0 ?
                  <Text fw={600}>{props.title}</Text>
                : null}
                {_renderSlot(props.content)}
              </Stack>
            </Paper>
          );
        },
      },
      DataViz: {
        label: "DataViz",
        fields: {
          prompt: {
            label: "Prompt",
            type: "textarea",
          },
          generateSqlRequestId: {
            label: "Run Query",
            type: "custom",
            render: (props) => {
              return (
                <GenerateSQLButtonField
                  id={props.id}
                  readOnly={props.readOnly}
                  onChange={props.onChange}
                />
              );
            },
          },
          sqlError: {
            label: "SQL generation error",
            type: "custom",
            render: (props) => {
              return (
                  typeof props.value === "string" &&
                    props.value.trim().length > 0
                ) ?
                  <Text c="red" fz="sm">
                    {props.value}
                  </Text>
                : <></>;
            },
          },
          sqlGeneratedFromPrompt: {
            label: "SQL generated from prompt",
            type: "custom",
            render: () => {
              return <></>;
            },
          },
          sql: {
            label: "SQL",
            type: "textarea",
          },
        },
        defaultProps: {
          prompt: "",
          sql: "",
          sqlError: "",
          sqlGeneratedFromPrompt: "",
          generateSqlRequestId: "",
        },
        resolveData: async (data, params) => {
          const props: unknown = data.props;
          const prompt: string =
            typeof (props as Partial<DataVizProps>).prompt === "string" ?
              ((props as Partial<DataVizProps>).prompt ?? "").trim()
            : "";

          const shouldGenerate: boolean =
            params.trigger === "force" ||
            params.changed.generateSqlRequestId === true;

          if (!shouldGenerate) {
            return data;
          }

          if (!options.workspaceId) {
            return {
              ...data,
              props: {
                ...(data.props ?? {}),
                sqlError: "Cannot generate SQL without a workspace.",
                sqlGeneratedFromPrompt: "",
              },
            };
          }

          if (prompt.length === 0) {
            return {
              ...data,
              props: {
                ...(data.props ?? {}),
                sql: "",
                sqlError: "Cannot generate SQL without a prompt.",
                sqlGeneratedFromPrompt: "",
              },
            };
          }

          try {
            const sql: string = await generateSQLFromPrompt({
              prompt,
              workspaceId: options.workspaceId,
            });

            return {
              ...data,
              props: {
                ...(data.props ?? {}),
                sql,
                sqlError: "",
                sqlGeneratedFromPrompt: prompt,
              },
            };
          } catch (e) {
            const errorMessage: string =
              e instanceof Error ? e.message : String(e);

            return {
              ...data,
              props: {
                ...(data.props ?? {}),
                sqlError: errorMessage,
                sqlGeneratedFromPrompt: "",
              },
            };
          }
        },
        render: (props: DataVizProps) => {
          return <DataViz {...props} />;
        },
      },
      HeadingBlock: {
        fields: {
          text: {
            label: "Text",
            type: "text",
          },
          level: {
            label: "Level",
            type: "select",
            options: [
              { label: "H1", value: 1 },
              { label: "H2", value: 2 },
              { label: "H3", value: 3 },
              { label: "H4", value: 4 },
            ],
          },
          align: {
            label: "Align",
            type: "radio",
            options: [
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
            ],
          },
        },
        defaultProps: {
          align: "left",
          level: 2,
          text: "Heading",
        },
        render: (props: HeadingBlockProps) => {
          return (
            <Title order={props.level} ta={props.align}>
              {props.text}
            </Title>
          );
        },
      },
      ParagraphBlock: {
        fields: {
          text: {
            label: "Text",
            type: "textarea",
          },
          align: {
            label: "Align",
            type: "radio",
            options: [
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
            ],
          },
        },
        defaultProps: {
          align: "left",
          text: "Write your paragraph here...",
        },
        render: (props: ParagraphBlockProps) => {
          return (
            <Text component="p" ta={props.align}>
              {props.text}
            </Text>
          );
        },
      },
      QuoteBlock: {
        fields: {
          quote: {
            label: "Quote",
            type: "textarea",
          },
          cite: {
            label: "Attribution",
            type: "text",
          },
        },
        defaultProps: {
          cite: "",
          quote: "Add a pull quote...",
        },
        render: (props: QuoteBlockProps) => {
          return (
            <Blockquote cite={props.cite}>
              <Text component="p">{props.quote}</Text>
            </Blockquote>
          );
        },
      },
      DividerBlock: {
        fields: {},
        render: () => {
          return <Divider />;
        },
      },
      FigureBlock: {
        fields: {
          src: {
            label: "Image URL",
            type: "text",
          },
          alt: {
            label: "Alt text",
            type: "text",
          },
          caption: {
            label: "Caption",
            type: "textarea",
          },
        },
        defaultProps: {
          alt: "",
          caption: "",
          src: "",
        },
        render: (props: FigureBlockProps) => {
          return (
            <Stack gap={6}>
              {props.src.trim().length > 0 ?
                <Image src={props.src} alt={props.alt} radius="sm" />
              : <Text c="dimmed" fz="sm">
                  Add an image URL to render a figure.
                </Text>
              }
              {props.caption.trim().length > 0 ?
                <Text c="dimmed" fz="sm">
                  {props.caption}
                </Text>
              : null}
            </Stack>
          );
        },
      },
      CalloutBlock: {
        fields: {
          tone: {
            label: "Tone",
            type: "select",
            options: [
              { label: "Info", value: "info" },
              { label: "Warning", value: "warning" },
              { label: "Neutral", value: "neutral" },
            ],
          },
          title: {
            label: "Title",
            type: "text",
          },
          body: {
            label: "Body",
            type: "textarea",
          },
        },
        defaultProps: {
          body: "Add context, methodology, or a key takeaway.",
          title: "Callout",
          tone: "neutral",
        },
        render: (props: CalloutBlockProps) => {
          const borderColor: string =
            props.tone === "warning" ? "yellow"
            : props.tone === "info" ? "blue"
            : "gray";

          return (
            <Paper withBorder p="md" style={{ borderColor }}>
              <Stack gap={6}>
                {props.title.trim().length > 0 ?
                  <Text fw={600}>{props.title}</Text>
                : null}
                <Text component="p">{props.body}</Text>
              </Stack>
            </Paper>
          );
        },
      },
      ListBlock: {
        fields: {
          type: {
            label: "Type",
            type: "radio",
            options: [
              { label: "Unordered", value: "unordered" },
              { label: "Ordered", value: "ordered" },
            ],
          },
          items: {
            label: "Items",
            type: "array",
            arrayFields: {
              text: {
                label: "Text",
                type: "text",
              },
            },
            getItemSummary: (item) => {
              const text: unknown = (item as { text?: unknown }).text;

              return typeof text === "string" && text.trim().length > 0 ?
                  text
                : "List item";
            },
          },
        },
        defaultProps: {
          items: [{ text: "First point" }, { text: "Second point" }],
          type: "unordered",
        },
        render: (props: ListBlockProps) => {
          return (
            <List type={props.type === "ordered" ? "ordered" : "unordered"}>
              {props.items.map((item, idx) => {
                return <List.Item key={idx}>{item.text}</List.Item>;
              })}
            </List>
          );
        },
      },
      CodeBlock: {
        fields: {
          language: {
            label: "Language",
            type: "text",
          },
          code: {
            label: "Code",
            type: "textarea",
          },
        },
        defaultProps: {
          code: "",
          language: "",
        },
        render: (props: CodeBlockProps) => {
          const titleParts: readonly string[] = [
            props.language.trim().length > 0 ? props.language : undefined,
          ].filter((value): value is string => {
            return value !== undefined;
          });

          const title: string | undefined =
            titleParts.length > 0 ? titleParts.join("") : undefined;

          return (
            <Paper withBorder p="md">
              <Stack gap={6}>
                {title ?
                  <Text c="dimmed" fz="sm">
                    {title}
                  </Text>
                : null}
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  <code>{props.code}</code>
                </pre>
              </Stack>
            </Paper>
          );
        },
      },
      EmbedBlock: {
        fields: {
          title: {
            label: "Title",
            type: "text",
          },
          url: {
            label: "URL",
            type: "text",
          },
          height: {
            label: "Height",
            type: "number",
            min: 200,
            max: 1200,
            step: 10,
          },
        },
        defaultProps: {
          height: 480,
          title: "",
          url: "",
        },
        render: (props: EmbedBlockProps) => {
          const url: string | undefined = _getEmbedURL(props.url);

          if (!url) {
            return (
              <Text c="dimmed" fz="sm">
                Add a URL to embed a visualization or external content.
              </Text>
            );
          }

          return (
            <Paper withBorder p={0} radius="sm">
              <iframe
                src={url}
                title={props.title.trim().length > 0 ? props.title : "Embed"}
                loading="lazy"
                style={{
                  border: 0,
                  height: _getIframeHeight(props.height),
                  width: "100%",
                }}
                allow="fullscreen"
              />
            </Paper>
          );
        },
      },
      TableBlock: {
        fields: {
          delimiter: {
            label: "Delimiter",
            type: "select",
            options: [
              { label: "Comma (,)", value: "comma" },
              { label: "Tab", value: "tab" },
              { label: "Pipe (|)", value: "pipe" },
            ],
          },
          hasHeader: {
            label: "Header row",
            type: "radio",
            options: [
              { label: "Yes", value: true },
              { label: "No", value: false },
            ],
          },
          data: {
            label: "Data",
            type: "textarea",
          },
        },
        defaultProps: {
          data: "label,value\nA,10\nB,20\nC,30",
          delimiter: "comma",
          hasHeader: true,
        },
        render: (props: TableBlockProps) => {
          const rows: ReadonlyArray<readonly string[]> = _parseTableRows({
            data: props.data,
            delimiter: props.delimiter,
          });

          if (rows.length === 0) {
            return (
              <Text c="dimmed" fz="sm">
                Add tabular data to render a simple table.
              </Text>
            );
          }

          const headerRow: readonly string[] | undefined =
            props.hasHeader ? rows[0] : undefined;
          const bodyRows: ReadonlyArray<readonly string[]> =
            props.hasHeader ? rows.slice(1) : rows;

          return (
            <MantineTable withTableBorder withColumnBorders withRowBorders>
              {headerRow ?
                <MantineTable.Thead>
                  <MantineTable.Tr>
                    {headerRow.map((cell, idx) => {
                      return (
                        <MantineTable.Th key={idx}>{cell}</MantineTable.Th>
                      );
                    })}
                  </MantineTable.Tr>
                </MantineTable.Thead>
              : null}
              <MantineTable.Tbody>
                {bodyRows.map((row, rowIdx) => {
                  return (
                    <MantineTable.Tr key={rowIdx}>
                      {row.map((cell, cellIdx) => {
                        return (
                          <MantineTable.Td key={cellIdx}>
                            {cell}
                          </MantineTable.Td>
                        );
                      })}
                    </MantineTable.Tr>
                  );
                })}
              </MantineTable.Tbody>
            </MantineTable>
          );
        },
      },
    },
  };
}

export function DashboardEditorView({ dashboard }: Props): JSX.Element {
  const dashboardTitle: string = dashboard?.name ?? "Untitled dashboard";
  const [data, setData] = useState<DashboardPuckData>(() => {
    return _withDashboardTitle({
      data: EMPTY_DATA,
      title: dashboardTitle,
    });
  });

  const lastDashboardIdRef = useRef<DashboardRead["id"] | undefined>(undefined);

  useEffect(() => {
    if (!dashboard) {
      return;
    }

    if (lastDashboardIdRef.current === dashboard.id) {
      return;
    }

    lastDashboardIdRef.current = dashboard.id;
    setData(_getInitialPuckData({ dashboard }));
  }, [dashboard]);

  const puckConfig = useMemo(() => {
    return _getPuckConfig({
      dashboardTitle,
      workspaceId: dashboard?.workspaceId,
    });
  }, [dashboard?.workspaceId, dashboardTitle]);

  const [saveDashboard] = DashboardClient.useUpdate({
    onSuccess: () => {
      notifySuccess("Dashboard saved successfully!");
    },
  });

  const onPublish = useCallback(
    (publishedData: DashboardPuckData): void => {
      if (!dashboard) {
        notifyDevAlert("Dashboard is not loaded yet.");
        return;
      }

      const publishedTitle: string =
        _getDashboardTitleFromPuckData(publishedData) ?? dashboardTitle;

      const publishedConfig: DashboardRead["config"] =
        publishedData as unknown as DashboardRead["config"];

      saveDashboard({
        id: dashboard.id,
        data: {
          name: publishedTitle,
          config: publishedConfig,
        },
      });
    },
    [dashboard, dashboardTitle, saveDashboard],
  );

  return (
    <Puck
      config={puckConfig}
      data={data}
      onChange={setData}
      onPublish={onPublish}
    />
  );
}
