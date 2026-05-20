import { useLingui } from "@lingui/react/macro";
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
import { Paper } from "@ui";
import { DashboardId } from "$/models/Dashboard/Dashboard.types";
import { Workspace } from "$/models/Workspace/Workspace";
import { CURRENT_SCHEMA_VERSION } from "@/views/DashboardApp/AvaPage/migrations/config";
import { useDataVizPBlockConfig } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/buildDataVizPBlockConfig";
import { useFilterPBlockConfig } from "@/views/DashboardApp/AvaPage/pblocks/FilterPBlock/buildFilterPBlockConfig";
import { useContainerMaxWidthPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/ContainerMaxWidthPField/buildContainerMaxWidthPFieldConfig";
import {
  getDashboardDesignTokens,
  useDashboardThemeOptions,
  useDashboardTypographyOptions,
} from "@/views/DashboardApp/AvaPage/utils/dashboardDesignTokens";
import type {
  AvaPageConfig,
  AvaPageData,
  AvaPageRootProps,
  AvaPageThemeName,
  AvaPageTypographyName,
  CalloutBlockProps,
  CodeBlockProps,
  EmbedBlockProps,
  FigureBlockProps,
  HeadingBlockProps,
  ListBlockProps,
  ParagraphBlockProps,
  QuoteBlockProps,
  RootPadding,
  SectionProps,
  SlotRenderer,
  TableBlockProps,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ReactNode } from "react";

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

export function getDashboardTitleFromPuckData(
  data: AvaPageData,
): string | undefined {
  if (!_isRecord(data.root.props)) {
    return undefined;
  }

  const title: unknown = (data.root.props as Partial<AvaPageRootProps>).title;

  return typeof title === "string" && title.trim().length > 0 ?
      title
    : undefined;
}

function _getStringProp(options: {
  props: unknown;
  key: keyof AvaPageRootProps;
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
  key: keyof AvaPageRootProps;
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
  key: keyof Pick<AvaPageRootProps, "horizontalPadding" | "verticalPadding">;
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

const _THEME_VALUES = new Set<AvaPageThemeName>([
  "default",
  "ocean",
  "forest",
  "rose",
  "amber",
  "graphite",
]);

const _TYPOGRAPHY_VALUES = new Set<AvaPageTypographyName>([
  "system",
  "serif",
  "mono",
]);

function _getThemeProp(props: unknown): AvaPageThemeName {
  if (!_isRecord(props)) {
    return "default";
  }
  const value: unknown = props.theme;
  return _THEME_VALUES.has(value as AvaPageThemeName) ?
      (value as AvaPageThemeName)
    : "default";
}

function _getTypographyProp(props: unknown): AvaPageTypographyName {
  if (!_isRecord(props)) {
    return "system";
  }
  const value: unknown = props.typography;
  return _TYPOGRAPHY_VALUES.has(value as AvaPageTypographyName) ?
      (value as AvaPageTypographyName)
    : "system";
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

function _createGridCellSlotFields(t: TranslateFn): Record<
  `r${number}c${number}`,
  { label: string; type: "slot" }
> {
  return Object.fromEntries(
    Array.from({ length: 12 }).flatMap((unusedRow, rowIdx) => {
      return Array.from({ length: 12 }).map((unusedCol, colIdx) => {
        void unusedRow;
        void unusedCol;

        const key: `r${number}c${number}` = _getGridCellKey({ colIdx, rowIdx });
        const rowNum = rowIdx + 1;
        const colNum = colIdx + 1;

        return [
          key,
          { label: t`Row ${rowNum} / Col ${colNum}`, type: "slot" },
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

type TranslateFn = ReturnType<typeof useLingui>["t"];

export function getDashboardPuckConfig(options: {
  dashboardTitle: string;
  workspaceId: Workspace.Id | undefined;
  dashboardId: DashboardId;
  t: TranslateFn;
}): AvaPageConfig {
  const { t } = options;
  const themeOptions = useDashboardThemeOptions();
  const typographyOptions = useDashboardTypographyOptions();
  const dataVizFieldConfig = useDataVizPBlockConfig({
    dashboardTitle: options.dashboardTitle,
    workspaceId: options.workspaceId,
    dashboardId: options.dashboardId,
  });
  const filterFieldConfig = useFilterPBlockConfig();
  return {
    root: {
      fields: {
        schemaVersion: {
          // leave this as `false`. Set to `true` only for debugging
          visible: false,
          type: "custom",
          label: t`Schema version`,
          render: ({ value }) => {
            return <>Version: {value}</>;
          },
        },
        title: {
          label: t`Page title`,
          type: "text",
        },
        theme: {
          label: t`Theme`,
          type: "select",
          options: themeOptions.map((o) => {
            return { label: o.label, value: o.value };
          }),
        },
        typography: {
          label: t`Typography`,
          type: "select",
          options: typographyOptions.map((o) => {
            return { label: o.label, value: o.value };
          }),
        },
        containerMaxWidth: useContainerMaxWidthPFieldConfig(),
        isTitleHidden: {
          label: t`Hide title`,
          type: "radio",
          options: [
            { label: t`No`, value: false },
            { label: t`Yes`, value: true },
          ],
        },
        subtitle: {
          label: t`Subtitle`,
          type: "text",
        },
        isSubtitleHidden: {
          label: t`Hide subtitle`,
          type: "radio",
          options: [
            { label: t`No`, value: false },
            { label: t`Yes`, value: true },
          ],
        },
        author: {
          label: t`Author`,
          type: "text",
        },
        isAuthorHidden: {
          label: t`Hide author`,
          type: "radio",
          options: [
            { label: t`No`, value: false },
            { label: t`Yes`, value: true },
          ],
        },
        publishedAt: {
          label: t`Published Date`,
          type: "text",
        },
        isPublishedAtHidden: {
          label: t`Hide published date`,
          type: "radio",
          options: [
            { label: t`No`, value: false },
            { label: t`Yes`, value: true },
          ],
        },
        verticalPadding: {
          label: t`Vertical padding`,
          type: "select",
          options: [
            { label: t`None`, value: "none" },
            { label: "XS", value: "xs" },
            { label: "SM", value: "sm" },
            { label: "MD", value: "md" },
            { label: "LG", value: "lg" },
            { label: "XL", value: "xl" },
          ],
        },
        horizontalPadding: {
          label: t`Horizontal padding`,
          type: "select",
          options: [
            { label: t`None`, value: "none" },
            { label: "XS", value: "xs" },
            { label: "SM", value: "sm" },
            { label: "MD", value: "md" },
            { label: "LG", value: "lg" },
            { label: "XL", value: "xl" },
          ],
        },
      },
      defaultProps: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        author: "",
        containerMaxWidth: { unit: "%", value: 100 },
        horizontalPadding: "md",
        isAuthorHidden: false,
        isPublishedAtHidden: false,
        isSubtitleHidden: false,
        isTitleHidden: false,
        publishedAt: "",
        subtitle: "",
        theme: "default",
        typography: "system",
        title: options.dashboardTitle,
        verticalPadding: "lg",
      } satisfies AvaPageRootProps,

      // the render function for rendering the root dashboard page
      render: (props) => {
        const isTitleHidden: boolean =
          _getBooleanProp({ props, key: "isTitleHidden" }) ?? false;
        const isSubtitleHidden: boolean =
          _getBooleanProp({ props, key: "isSubtitleHidden" }) ?? false;
        const isAuthorHidden: boolean =
          _getBooleanProp({ props, key: "isAuthorHidden" }) ?? false;
        const isPublishedAtHidden: boolean =
          _getBooleanProp({ props, key: "isPublishedAtHidden" }) ?? false;

        const containerMaxWidthRaw: unknown = (
          props as Partial<AvaPageRootProps>
        ).containerMaxWidth;

        const containerMaxWidth:
          | { unit: "%" | "px"; value: number }
          | undefined =
          (
            _isRecord(containerMaxWidthRaw) &&
            (containerMaxWidthRaw.unit === "%" ||
              containerMaxWidthRaw.unit === "px") &&
            typeof containerMaxWidthRaw.value === "number" &&
            Number.isFinite(containerMaxWidthRaw.value)
          ) ?
            {
              unit: containerMaxWidthRaw.unit,
              value: Math.round(containerMaxWidthRaw.value),
            }
          : undefined;

        const effectiveContainerMaxWidth = containerMaxWidth ?? {
          unit: "%",
          value: 100,
        };

        const verticalPadding: RootPadding =
          _getRootPaddingProp({ props, key: "verticalPadding" }) ?? "lg";
        const horizontalPadding: RootPadding =
          _getRootPaddingProp({ props, key: "horizontalPadding" }) ?? "md";

        const title: string =
          _getStringProp({ props, key: "title" }) ?? t`Untitled`;
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

        const tokens = getDashboardDesignTokens({
          theme: _getThemeProp(props),
          typography: _getTypographyProp(props),
        });

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

        const hasHeader =
          !isTitleHidden ||
          visibleSubtitle !== undefined ||
          byline !== undefined;

        return (
          <Box
            style={{
              backgroundColor: tokens.pageBackground,
              fontFamily: tokens.bodyFontFamily,
              minHeight: "100%",
            }}
          >
            <Stack
              mx="auto"
              w={
                effectiveContainerMaxWidth.unit === "%" ?
                  `${effectiveContainerMaxWidth.value}%`
                : "100%"
              }
              maw={
                effectiveContainerMaxWidth.unit === "px" ?
                  effectiveContainerMaxWidth.value
                : undefined
              }
              py={_getRootPaddingValue(verticalPadding)}
              px={_getRootPaddingValue(horizontalPadding)}
              gap="xl"
            >
              {hasHeader ?
                <Box
                  style={{
                    borderLeft: `4px solid ${tokens.accentColor}`,
                    paddingLeft: "1rem",
                  }}
                >
                  <Stack gap={6}>
                    {isTitleHidden ? null : (
                      <Title
                        order={1}
                        style={{
                          color: tokens.titleColor,
                          fontFamily: tokens.headingFontFamily,
                          lineHeight: 1.15,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {title}
                      </Title>
                    )}
                    {visibleSubtitle ?
                      <Text
                        fz="lg"
                        style={{
                          color: tokens.subtitleColor,
                          fontFamily: tokens.bodyFontFamily,
                          lineHeight: 1.5,
                          maxWidth: "60ch",
                        }}
                      >
                        {visibleSubtitle}
                      </Text>
                    : null}
                    {byline ?
                      <Text
                        fz="sm"
                        style={{
                          color: tokens.bylineColor,
                          letterSpacing: "0.02em",
                          textTransform: "uppercase",
                          fontWeight: 500,
                        }}
                      >
                        {byline}
                      </Text>
                    : null}
                  </Stack>
                </Box>
              : null}
              {children}
            </Stack>
          </Box>
        );
      },
    },

    // dictionary of categories (the left sidebar in the editor) for organizing
    // the draggable pblocks (Puck calls them "components" but we'll use the
    // term "pblocks" to mean "Page Blocks")
    categories: {
      layout: {
        title: t`Layout`,
        defaultExpanded: true,
        components: ["Section", "Columns", "Grid", "SidebarLayout"],
      },
      content: {
        title: t`Content`,
        defaultExpanded: true,
        components: [
          "DataViz",
          "Filter",
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
        title: t`Media`,
        components: ["FigureBlock", "EmbedBlock"],
      },
    },

    components: {
      Section: {
        label: t`Section`,
        fields: {
          maxWidth: {
            label: t`Max width`,
            type: "select",
            options: [
              { label: t`Narrow`, value: "narrow" },
              { label: t`Normal`, value: "normal" },
              { label: t`Wide`, value: "wide" },
              { label: t`Full`, value: "full" },
            ],
          },
          padding: {
            label: t`Padding`,
            type: "select",
            options: [
              { label: t`Small`, value: "sm" },
              { label: t`Medium`, value: "md" },
              { label: t`Large`, value: "lg" },
            ],
          },
          background: {
            label: t`Background`,
            type: "select",
            options: [
              { label: t`None`, value: "none" },
              { label: t`Subtle`, value: "subtle" },
            ],
          },
          content: {
            label: t`Content`,
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
        label: t`Columns`,
        fields: {
          numColumns: {
            label: t`Number of columns`,
            type: "number",
            min: 1,
            max: 12,
            step: 1,
          },
          leftSpan: {
            label: t`Left span`,
            type: "number",
            min: 1,
            max: 12,
            step: 1,
          },
          rightSpan: {
            label: t`Right span`,
            type: "number",
            min: 1,
            max: 12,
            step: 1,
          },
          gap: {
            label: t`Gap`,
            type: "select",
            options: [
              { label: "XS", value: "xs" },
              { label: "SM", value: "sm" },
              { label: "MD", value: "md" },
              { label: "LG", value: "lg" },
            ],
          },
          collapseAt: {
            label: t`Collapse at`,
            type: "select",
            options: [
              { label: "SM", value: "sm" },
              { label: "MD", value: "md" },
              { label: "LG", value: "lg" },
            ],
          },
          col1: {
            label: t`Column 1`,
            type: "slot",
          },
          col2: {
            label: t`Column 2`,
            type: "slot",
          },
          col3: {
            label: t`Column 3`,
            type: "slot",
          },
          col4: {
            label: t`Column 4`,
            type: "slot",
          },
          col5: {
            label: t`Column 5`,
            type: "slot",
          },
          col6: {
            label: t`Column 6`,
            type: "slot",
          },
          col7: {
            label: t`Column 7`,
            type: "slot",
          },
          col8: {
            label: t`Column 8`,
            type: "slot",
          },
          col9: {
            label: t`Column 9`,
            type: "slot",
          },
          col10: {
            label: t`Column 10`,
            type: "slot",
          },
          col11: {
            label: t`Column 11`,
            type: "slot",
          },
          col12: {
            label: t`Column 12`,
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
        label: t`Sidebar layout`,
        fields: {
          sidebarPosition: {
            label: t`Sidebar position`,
            type: "radio",
            options: [
              { label: t`Left`, value: "left" },
              { label: t`Right`, value: "right" },
            ],
          },
          sidebarSpan: {
            label: t`Sidebar span`,
            type: "number",
            min: 2,
            max: 10,
            step: 1,
          },
          gap: {
            label: t`Gap`,
            type: "select",
            options: [
              { label: "XS", value: "xs" },
              { label: "SM", value: "sm" },
              { label: "MD", value: "md" },
              { label: "LG", value: "lg" },
            ],
          },
          collapseAt: {
            label: t`Collapse at`,
            type: "select",
            options: [
              { label: "SM", value: "sm" },
              { label: "MD", value: "md" },
              { label: "LG", value: "lg" },
            ],
          },
          sidebar: {
            label: t`Sidebar`,
            type: "slot",
          },
          main: {
            label: t`Main`,
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
        label: t`Grid`,
        fields: {
          numColumns: {
            label: t`Number of columns`,
            type: "number",
            min: 1,
            max: 12,
            step: 1,
          },
          numRows: {
            label: t`Number of rows`,
            type: "number",
            min: 1,
            max: 12,
            step: 1,
          },
          gap: {
            label: t`Gap`,
            type: "select",
            options: [
              { label: "XS", value: "xs" },
              { label: "SM", value: "sm" },
              { label: "MD", value: "md" },
              { label: "LG", value: "lg" },
            ],
          },
          ..._createGridCellSlotFields(t),
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
        label: t`Card`,
        fields: {
          title: {
            label: t`Title`,
            type: "text",
          },
          content: {
            label: t`Content`,
            type: "slot",
            disallow: ["Card"],
          },
        },
        defaultProps: {
          content: [],
          title: t`Card`,
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
      DataViz: dataVizFieldConfig,
      Filter: filterFieldConfig,
      HeadingBlock: {
        label: t`Heading`,
        fields: {
          text: {
            label: t`Text`,
            type: "text",
          },
          level: {
            label: t`Level`,
            type: "select",
            options: [
              { label: "H1", value: 1 },
              { label: "H2", value: 2 },
              { label: "H3", value: 3 },
              { label: "H4", value: 4 },
            ],
          },
          align: {
            label: t`Align`,
            type: "radio",
            options: [
              { label: t`Left`, value: "left" },
              { label: t`Center`, value: "center" },
              { label: t`Right`, value: "right" },
            ],
          },
        },
        defaultProps: {
          align: "left",
          level: 2,
          text: t`Heading`,
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
        label: t`Paragraph`,
        fields: {
          text: {
            label: t`Text`,
            type: "textarea",
          },
          align: {
            label: t`Align`,
            type: "radio",
            options: [
              { label: t`Left`, value: "left" },
              { label: t`Center`, value: "center" },
              { label: t`Right`, value: "right" },
            ],
          },
        },
        defaultProps: {
          align: "left",
          text: t`Write your paragraph here...`,
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
        label: t`Quote`,
        fields: {
          quote: {
            label: t`Quote`,
            type: "textarea",
          },
          cite: {
            label: t`Attribution`,
            type: "text",
          },
        },
        defaultProps: {
          cite: "",
          quote: t`Add a pull quote...`,
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
        label: t`Divider`,
        fields: {},
        render: () => {
          return <Divider />;
        },
      },
      FigureBlock: {
        label: t`Image`,
        fields: {
          src: {
            label: t`Image URL`,
            type: "text",
          },
          alt: {
            label: t`Alt text`,
            type: "text",
          },
          caption: {
            label: t`Caption`,
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
                  {t`Add an image URL to render a figure.`}
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
        label: t`Callout`,
        fields: {
          tone: {
            label: t`Tone`,
            type: "select",
            options: [
              { label: t`Info`, value: "info" },
              { label: t`Warning`, value: "warning" },
              { label: t`Neutral`, value: "neutral" },
            ],
          },
          title: {
            label: t`Title`,
            type: "text",
          },
          body: {
            label: t`Body`,
            type: "textarea",
          },
        },
        defaultProps: {
          body: t`Add context, methodology, or a key takeaway.`,
          title: t`Callout`,
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
        label: t`List`,
        fields: {
          type: {
            label: t`Type`,
            type: "radio",
            options: [
              { label: t`Unordered`, value: "unordered" },
              { label: t`Ordered`, value: "ordered" },
            ],
          },
          items: {
            label: t`Items`,
            type: "array",
            arrayFields: {
              text: {
                label: t`Text`,
                type: "text",
              },
            },
            getItemSummary: (item) => {
              const text: unknown = (item as { text?: unknown }).text;

              return typeof text === "string" && text.trim().length > 0 ?
                  text
                : t`List item`;
            },
          },
        },
        defaultProps: {
          items: [{ text: t`First point` }, { text: t`Second point` }],
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
        label: t`Code`,
        fields: {
          language: {
            label: t`Language`,
            type: "text",
          },
          code: {
            label: t`Code`,
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
        label: t`Embed`,
        fields: {
          title: {
            label: t`Title`,
            type: "text",
          },
          url: {
            label: t`URL`,
            type: "text",
          },
          height: {
            label: t`Height`,
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
                {t`Add a URL to embed a visualization or external content.`}
              </Text>
            );
          }

          return (
            <Paper withBorder p={0} radius="sm">
              <iframe
                src={url}
                title={props.title.trim().length > 0 ? props.title : t`Embed`}
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
        label: t`Table`,
        fields: {
          delimiter: {
            label: t`Delimiter`,
            type: "select",
            options: [
              { label: t`Comma (,)`, value: "comma" },
              { label: t`Tab`, value: "tab" },
              { label: t`Pipe (|)`, value: "pipe" },
            ],
          },
          hasHeader: {
            label: t`Header row`,
            type: "radio",
            options: [
              { label: t`Yes`, value: true },
              { label: t`No`, value: false },
            ],
          },
          data: {
            label: t`Data`,
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
                {t`Add tabular data to render a simple table.`}
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
